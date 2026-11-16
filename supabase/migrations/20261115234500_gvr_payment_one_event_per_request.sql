-- A single payment notification can be associated with at most one GVR request.
-- Ambiguous or competing notifications remain unlinked for manual review.
create unique index if not exists gvr_payment_notification_one_event_per_request_uidx
  on public.gvr_payment_notification_events (matched_request_id)
  where matched_request_id is not null;

comment on index public.gvr_payment_notification_one_event_per_request_uidx is
  'Prevents one GVR purchase request from being matched to multiple payment notification events.';

-- Narrow indexes for the fields used by the pending-order matcher.
create index if not exists gvr_purchase_requests_saldo_match_idx
  on public.gvr_purchase_requests
    (payment_amount, payment_sender_phone, created_at, expires_at)
  where status = 'pending'
    and payment_method = 'SALDO_MOVIL'
    and payment_currency = 'SALDO_MOVIL'
    and payment_sender_phone is not null;

create index if not exists gvr_purchase_requests_cup_match_idx
  on public.gvr_purchase_requests
    (payment_amount, payment_sender_phone, payment_txid, created_at, expires_at)
  where status = 'pending'
    and payment_method = 'CUP'
    and payment_currency = 'CUP'
    and payment_sender_phone is not null
    and payment_txid is not null;

create index if not exists gvr_payment_notification_saldo_match_idx
  on public.gvr_payment_notification_events
    (amount_minor_units, sender_phone, received_at)
  where method = 'SALDO_MOVIL'
    and matched_request_id is null;

create index if not exists gvr_payment_notification_cup_match_idx
  on public.gvr_payment_notification_events
    (amount_minor_units, sender_phone, transaction_reference, recipient_account, received_at)
  where method = 'CUP'
    and matched_request_id is null;
