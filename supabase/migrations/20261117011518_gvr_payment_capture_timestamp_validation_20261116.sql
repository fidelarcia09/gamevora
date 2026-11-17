alter table public.gvr_payment_notification_events
  add column if not exists captured_at timestamptz,
  add column if not exists capture_delay_ms bigint,
  add column if not exists capture_quality text not null default 'LEGACY_UNVERIFIED';

alter table public.gvr_payment_notification_events
  drop constraint if exists gvr_payment_notification_events_capture_quality_check;
alter table public.gvr_payment_notification_events
  add constraint gvr_payment_notification_events_capture_quality_check
  check (capture_quality in ('TRUSTED', 'STALE_NOTIFICATION', 'LEGACY_UNVERIFIED'));

comment on column public.gvr_payment_notification_events.captured_at is
  'Hora del callback Android que capturó la notificación; no es la hora de sincronización.';
comment on column public.gvr_payment_notification_events.capture_delay_ms is
  'Diferencia en milisegundos entre captura Android y postTime de la notificación.';
comment on column public.gvr_payment_notification_events.capture_quality is
  'Solo TRUSTED puede participar en conciliación automática; registros anteriores quedan LEGACY_UNVERIFIED.';

CREATE OR REPLACE FUNCTION public.auto_approve_gvr_payment_event(p_event_id uuid, p_expected_receiver_account text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_event public.gvr_payment_notification_events%rowtype;
  v_request public.gvr_purchase_requests%rowtype;
  v_balance_before numeric;
  v_balance_after numeric;
  v_reference text;
begin
  if p_event_id is null then
    raise exception 'EVENT_ID_REQUIRED';
  end if;

  select *
    into v_event
  from public.gvr_payment_notification_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.review_status = 'AUTO_APPROVED' then
    return jsonb_build_object(
      'ok', true, 'credited', false, 'idempotent', true,
      'status', 'AUTO_APPROVED', 'request_id', v_event.matched_request_id
    );
  end if;

  if v_event.capture_quality is distinct from 'TRUSTED' then
    return jsonb_build_object(
      'ok', true, 'credited', false, 'status', 'CAPTURE_NOT_TRUSTED',
      'capture_quality', v_event.capture_quality
    );
  end if;

  if v_event.match_status <> 'MATCHED' or v_event.matched_request_id is null then
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'NOT_MATCHED');
  end if;

  select *
    into v_request
  from public.gvr_purchase_requests
  where id = v_event.matched_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'credited', false, 'status', 'REQUEST_NOT_FOUND');
  end if;

  if v_request.status <> 'pending' then
    if v_request.status = 'approved' and exists (
      select 1 from public.transactions
      where reference = 'gvr-purchase:' || v_request.id::text
    ) then
      update public.gvr_payment_notification_events
      set review_status = 'AUTO_APPROVED'
      where id = v_event.id;
      return jsonb_build_object(
        'ok', true, 'credited', false, 'idempotent', true,
        'status', 'AUTO_APPROVED', 'request_id', v_request.id
      );
    end if;
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'REQUEST_NOT_PENDING');
  end if;

  if v_request.proof_path is null or btrim(v_request.proof_path) = '' then
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'WAITING_FOR_SUBMISSION');
  end if;

  if v_request.expires_at is null
     or v_event.received_at < v_request.created_at
     or v_event.received_at > v_request.expires_at then
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'PAYMENT_OUTSIDE_REQUEST_WINDOW');
  end if;

  if v_event.capture_package <> 'com.google.android.apps.messaging'
     or v_event.currency <> 'CUP'
     or v_event.amount_minor_units <> round(v_request.payment_amount * 100)::bigint
     or regexp_replace(coalesce(v_request.payment_sender_phone, ''), '\D', '', 'g') <> v_event.sender_phone then
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'PAYMENT_DATA_MISMATCH');
  end if;

  if v_event.method = 'SALDO_MOVIL' then
    if v_request.payment_method <> 'SALDO_MOVIL'
       or v_request.payment_currency <> 'SALDO_MOVIL'
       or v_event.source_label <> 'ETECSA' then
      return jsonb_build_object('ok', true, 'credited', false, 'status', 'PAYMENT_METHOD_MISMATCH');
    end if;
  elsif v_event.method = 'CUP' then
    if v_request.payment_method <> 'CUP'
       or v_request.payment_currency <> 'CUP'
       or p_expected_receiver_account is null
       or p_expected_receiver_account !~ '^\d{10,24}$'
       or v_event.recipient_account is distinct from p_expected_receiver_account
       or upper(btrim(coalesce(v_event.transaction_reference, ''))) <>
          upper(btrim(coalesce(v_request.payment_txid, ''))) then
      return jsonb_build_object('ok', true, 'credited', false, 'status', 'CUP_DATA_MISMATCH');
    end if;
  else
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'UNSUPPORTED_METHOD');
  end if;

  v_reference := 'gvr-purchase:' || v_request.id::text;
  if exists (select 1 from public.transactions where reference = v_reference) then
    return jsonb_build_object('ok', false, 'credited', false, 'status', 'TRANSACTION_REFERENCE_ALREADY_EXISTS');
  end if;

  insert into public.wallets (user_id, balance, created_at)
  values (v_request.user_id, 0, now())
  on conflict (user_id) do nothing;

  select balance
    into v_balance_before
  from public.wallets
  where user_id = v_request.user_id
  for update;

  v_balance_after := v_balance_before + v_request.gvr_amount;

  update public.wallets
  set balance = v_balance_after
  where user_id = v_request.user_id;

  insert into public.transactions (
    user_id, order_id, type, amount, balance_before, balance_after, reference, created_at
  ) values (
    v_request.user_id, null, 'gvr_purchase', v_request.gvr_amount,
    v_balance_before, v_balance_after, v_reference, now()
  );

  update public.gvr_purchase_requests
  set status = 'approved',
      reviewed_by = v_event.synced_by,
      reviewed_at = now(),
      review_note = 'Aprobación automática por coincidencia de pago'
  where id = v_request.id;

  update public.gvr_payment_notification_events
  set review_status = 'AUTO_APPROVED'
  where id = v_event.id;

  return jsonb_build_object(
    'ok', true, 'credited', true, 'idempotent', false,
    'status', 'AUTO_APPROVED', 'request_id', v_request.id,
    'event_id', v_event.id, 'gvr_amount', v_request.gvr_amount,
    'balance_before', v_balance_before, 'balance_after', v_balance_after
  );
end;
$function$;