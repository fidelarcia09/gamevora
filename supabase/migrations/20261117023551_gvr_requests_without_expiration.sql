-- GVR purchase requests no longer expire automatically.
CREATE OR REPLACE FUNCTION public.set_gvr_request_expiration()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
    if new.payment_method in ('SALDO_MOVIL', 'USDT', 'CUP') then
        new.expires_at := null;
    else
        raise exception 'Unsupported payment method';
    end if;
    return new;
end;
$function$
;

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

  -- Sin vencimiento: solo se rechaza una notificación anterior a la creación.
  if v_event.received_at < v_request.created_at then
    return jsonb_build_object('ok', true, 'credited', false, 'status', 'PAYMENT_BEFORE_REQUEST');
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
$function$

