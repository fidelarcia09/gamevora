-- Copia de referencia del esquema aplicado en Supabase.
-- Migración canónica: supabase/migrations/20261115233616_create_gvr_payment_notification_events.sql
-- El índice adicional synced_by está en 20261115233700_index_gvr_payment_notification_synced_by.sql.

begin;

create table if not exists public.gvr_payment_notification_events (
    id uuid primary key default gen_random_uuid(),
    device_id uuid not null,
    local_event_key text not null,
    method text not null check (method in ('SALDO_MOVIL', 'CUP')),
    source_label text not null check (source_label in ('ETECSA', 'PAGOxMOVIL')),
    capture_package text not null check (capture_package = 'com.google.android.apps.messaging'),
    amount_minor_units bigint not null check (amount_minor_units > 0),
    currency text not null default 'CUP' check (currency = 'CUP'),
    sender_phone text not null,
    recipient_account text,
    transaction_reference text,
    raw_date text,
    received_at timestamptz not null,
    synced_by uuid not null references auth.users(id) on delete restrict,
    matched_request_id uuid references public.gvr_purchase_requests(id) on delete set null,
    match_status text not null default 'NO_MATCH'
        check (match_status in ('MATCHED', 'AMBIGUOUS', 'NO_MATCH', 'RECIPIENT_MISMATCH')),
    review_status text not null default 'PENDING_MANUAL_REVIEW'
        check (review_status = 'PENDING_MANUAL_REVIEW'),
    server_received_at timestamptz not null default now(),
    constraint gvr_payment_notification_method_label_check check (
        (method = 'SALDO_MOVIL' and source_label = 'ETECSA'
            and recipient_account is null and transaction_reference is null)
        or
        (method = 'CUP' and source_label = 'PAGOxMOVIL'
            and recipient_account is not null and transaction_reference is not null
            and raw_date is not null)
    )
);

create unique index if not exists gvr_payment_notification_device_local_key_uidx
    on public.gvr_payment_notification_events (device_id, local_event_key);

create unique index if not exists gvr_payment_notification_cup_reference_uidx
    on public.gvr_payment_notification_events (transaction_reference)
    where method = 'CUP' and transaction_reference is not null;

create index if not exists gvr_payment_notification_received_at_idx
    on public.gvr_payment_notification_events (received_at desc);

create index if not exists gvr_payment_notification_match_request_idx
    on public.gvr_payment_notification_events (matched_request_id)
    where matched_request_id is not null;

alter table public.gvr_payment_notification_events enable row level security;

revoke all on table public.gvr_payment_notification_events from anon, authenticated;
grant all on table public.gvr_payment_notification_events to service_role;

comment on table public.gvr_payment_notification_events is
    'Eventos detectados en notificaciones Android. capture_package identifica la app que publicó la notificación, no el remitente SMS ni la autenticidad del pago. Siempre requieren revisión manual; nunca acreditan GVR.';

commit;
