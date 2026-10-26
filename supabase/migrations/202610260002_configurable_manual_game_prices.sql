-- Configurable per-product prices for manual payment methods.
-- No tariff rows are inserted until Gamevora supplies final prices.
create table if not exists public.manual_game_product_prices (
  product_id uuid not null references public.game_products(id) on delete cascade,
  payment_method text not null check (payment_method in ('USDT','SALDO_MOVIL')),
  base_amount numeric(14,2) not null check (base_amount > 0),
  payment_currency text not null check (
    (payment_method = 'USDT' and payment_currency = 'USDT') or
    (payment_method = 'SALDO_MOVIL' and payment_currency = 'SALDO_MOVIL')
  ),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (product_id, payment_method)
);

alter table public.manual_game_product_prices enable row level security;
grant select on public.manual_game_product_prices to anon, authenticated;
drop policy if exists "manual_game_product_prices_public_active_select" on public.manual_game_product_prices;
create policy "manual_game_product_prices_public_active_select"
  on public.manual_game_product_prices for select to anon, authenticated
  using (active = true);

create or replace function public.create_manual_game_order(
  p_product_id uuid,
  p_player_id text,
  p_payment_method text,
  p_zone_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $body$
declare
  v_user uuid := auth.uid();
  v_product public.game_products%rowtype;
  v_price public.manual_game_product_prices%rowtype;
  v_order uuid;
  v_method text := upper(trim(coalesce(p_payment_method,'')));
  v_amount numeric(14,2);
  v_discount numeric := 0;
  v_completed bigint := 0;
  v_rank text;
  v_profile_created timestamptz;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if v_method not in ('USDT','SALDO_MOVIL','CUP') then raise exception 'Método inválido.'; end if;
  if v_method = 'CUP' then raise exception 'El pago en CUP todavía no está disponible.'; end if;
  if p_player_id is null or length(trim(p_player_id)) < 1 or length(trim(p_player_id)) > 100 then
    raise exception 'ID de jugador inválido.';
  end if;

  select * into v_product
  from public.game_products
  where id = p_product_id and active = true
    and provider = 'nextlevel' and provider_product_id is not null
  for share;

  if not found or v_product.price_gvr <= 0 then raise exception 'Producto no disponible.'; end if;

  select rank_override, created_at into v_rank, v_profile_created
  from public.reseller_profiles
  where user_id = v_user and active = true and role = 'Revendedor';

  if found then
    select count(*) into v_completed
    from public.game_orders
    where user_id = v_user and status = 'completed' and created_at >= v_profile_created;

    v_discount := case trim(coalesce(v_rank,''))
      when 'Bronce' then 1 when 'Plata' then 2 when 'Oro' then 3
      when 'Diamante' then 4 when 'Leyenda' then 5
      else case when v_completed >= 300 then 5 when v_completed >= 150 then 4
        when v_completed >= 75 then 3 when v_completed >= 25 then 2 else 1 end
    end;
  end if;

  select * into v_price
  from public.manual_game_product_prices
  where product_id = p_product_id and payment_method = v_method and active = true;

  if not found then
    raise exception 'El precio de este paquete para el método seleccionado todavía no está configurado. Elige GVR o inténtalo más adelante.';
  end if;

  v_amount := round(v_price.base_amount * (100 - v_discount) / 100, 2);

  if v_product.game in ('Genshin Impact','mobile-legends')
     and nullif(trim(coalesce(p_zone_id,'')), '') is null then
    raise exception 'Debes indicar el servidor o Zone ID.';
  end if;

  insert into public.game_orders(user_id, product_id, price_gvr, status, player_id, zone_id)
  values (
    v_user, v_product.id,
    round(v_product.price_gvr * (100 - v_discount) / 100, 4),
    'pending', trim(p_player_id), nullif(trim(coalesce(p_zone_id,'')), '')
  )
  returning id into v_order;

  insert into public.manual_game_payments(
    game_order_id, user_id, payment_method, payment_amount, payment_currency
  )
  values (v_order, v_user, v_method, v_amount, v_price.payment_currency);

  return v_order;
end;
$body$;

revoke all on function public.create_manual_game_order(uuid,text,text,text) from public, anon;
grant execute on function public.create_manual_game_order(uuid,text,text,text) to authenticated;
