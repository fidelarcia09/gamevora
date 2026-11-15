-- Registro de los resultados de la verificación USDT en modo sombra.
-- Solo service_role puede insertar; los agentes de soporte activos pueden leer.
create table if not exists public.gvr_usdt_verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.gvr_purchase_requests(id) on delete cascade,
  user_id uuid not null,
  txid text,
  verified boolean not null,
  code text not null,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists gvr_usdt_verifications_request_idx
  on public.gvr_usdt_verifications (request_id, checked_at desc);

alter table public.gvr_usdt_verifications enable row level security;

revoke all on table public.gvr_usdt_verifications from anon, authenticated, service_role;
grant select on table public.gvr_usdt_verifications to authenticated;
grant insert on table public.gvr_usdt_verifications to service_role;

drop policy if exists "Support admins can read GVR USDT verifications"
  on public.gvr_usdt_verifications;
create policy "Support admins can read GVR USDT verifications"
  on public.gvr_usdt_verifications
  for select
  to authenticated
  using ((select public.is_support_admin()));

comment on table public.gvr_usdt_verifications is
  'Auditoría de solo lectura de verificaciones USDT; no concede ni modifica saldo GVR.';

-- Deshacer únicamente esta tabla:
-- drop table if exists public.gvr_usdt_verifications;
