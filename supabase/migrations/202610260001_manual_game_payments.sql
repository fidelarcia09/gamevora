-- Manual game payment requests; deployed separately from the live payment UI.
create table if not exists public.manual_game_payments (
 id uuid primary key default gen_random_uuid(),
 game_order_id uuid not null unique references public.game_orders(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 payment_method text not null check (payment_method in ('USDT','SALDO_MOVIL','CUP')),
 payment_amount numeric(14,2) not null check (payment_amount > 0),
 payment_currency text not null check (payment_currency in ('USDT','SALDO_MOVIL','CUP')),
 proof_path text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_note text,
 created_at timestamptz not null default now()
);
alter table public.manual_game_payments enable row level security;
grant select on public.manual_game_payments to authenticated;
drop policy if exists "manual_game_payments_owner_or_admin_select" on public.manual_game_payments;
create policy "manual_game_payments_owner_or_admin_select" on public.manual_game_payments for select to authenticated using (user_id = (select auth.uid()) or public.is_support_admin());
drop policy if exists "manual_game_payments_owner_pending_update" on public.manual_game_payments;
create policy "manual_game_payments_owner_pending_update" on public.manual_game_payments for update to authenticated using (user_id = (select auth.uid()) and status = 'pending') with check (user_id = (select auth.uid()) and status = 'pending');
revoke insert, delete, update on public.manual_game_payments from anon, authenticated;
grant update (proof_path) on public.manual_game_payments to authenticated;
drop function if exists public.create_manual_game_order(uuid,text,text);
drop function if exists public.create_manual_game_order(uuid,text,text,text);
create function public.create_manual_game_order(p_product_id uuid,p_player_id text,p_payment_method text,p_zone_id text default null)
returns uuid language plpgsql security definer set search_path='' as $body$
declare v_user uuid:=auth.uid(); v_product public.game_products%rowtype; v_order uuid; v_method text:=upper(trim(coalesce(p_payment_method,''))); v_amount numeric(14,2); v_currency text; v_discount numeric:=0; v_completed bigint:=0; v_rank text; v_profile_created timestamptz;
begin
 if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
 if v_method not in ('USDT','SALDO_MOVIL','CUP') then raise exception 'Método inválido.'; end if;
 if v_method='CUP' then raise exception 'El pago en CUP todavía no está disponible.'; end if;
 if p_player_id is null or length(trim(p_player_id))<1 or length(trim(p_player_id))>100 then raise exception 'ID de jugador inválido.'; end if;
 select * into v_product from public.game_products where id=p_product_id and active=true and provider='nextlevel' and provider_product_id is not null for share;
 if not found or v_product.price_gvr<=0 then raise exception 'Producto no disponible.'; end if;
 select rank_override,created_at into v_rank,v_profile_created from public.reseller_profiles where user_id=v_user and active=true and role='Revendedor';
 if found then
  select count(*) into v_completed from public.game_orders where user_id=v_user and status='completed' and created_at>=v_profile_created;
  v_discount:=case trim(coalesce(v_rank,'')) when 'Bronce' then 1 when 'Plata' then 2 when 'Oro' then 3 when 'Diamante' then 4 when 'Leyenda' then 5 else case when v_completed>=300 then 5 when v_completed>=150 then 4 when v_completed>=75 then 3 when v_completed>=25 then 2 else 1 end end;
 end if;
 if v_method='USDT' then v_amount:=round(round(v_product.price_gvr*(100-v_discount)/100,4),2); v_currency:='USDT'; else v_amount:=round(round(v_product.price_gvr*(100-v_discount)/100,4)*250,0); v_currency:='SALDO_MOVIL'; end if;
 if v_product.game in ('Genshin Impact','mobile-legends') and nullif(trim(coalesce(p_zone_id,'')),'') is null then raise exception 'Debes indicar el servidor o Zone ID.'; end if;
 insert into public.game_orders(user_id,product_id,price_gvr,status,player_id,zone_id) values(v_user,v_product.id,round(v_product.price_gvr*(100-v_discount)/100,4),'pending',trim(p_player_id),nullif(trim(coalesce(p_zone_id,'')),'')) returning id into v_order;
 insert into public.manual_game_payments(game_order_id,user_id,payment_method,payment_amount,payment_currency) values(v_order,v_user,v_method,v_amount,v_currency);
 return v_order;
end; $body$;
revoke all on function public.create_manual_game_order(uuid,text,text,text) from public,anon;
grant execute on function public.create_manual_game_order(uuid,text,text,text) to authenticated;
create or replace function public.attach_manual_game_payment_proof(p_order_id uuid,p_proof_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
 if p_proof_path is null or length(p_proof_path)>500 or p_proof_path not like v_user::text||'/'||p_order_id::text||'/%' then raise exception 'Ruta de comprobante inválida.'; end if;
 update public.manual_game_payments set proof_path=p_proof_path where game_order_id=p_order_id and user_id=v_user and status='pending';
 if not found then raise exception 'Pago pendiente no encontrado.'; end if;
 return true;
end; $$;
revoke all on function public.attach_manual_game_payment_proof(uuid,text) from public,anon;
grant execute on function public.attach_manual_game_payment_proof(uuid,text) to authenticated;
create or replace function public.admin_review_manual_game_payment(p_order_id uuid,p_decision text,p_review_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_decision text:=lower(trim(coalesce(p_decision,'')));
begin
 if v_user is null or not public.is_support_admin() then raise exception 'No autorizado.'; end if;
 if v_decision not in ('approved','rejected') then raise exception 'Decisión inválida.'; end if;
 update public.manual_game_payments set status=v_decision,reviewed_by=v_user,reviewed_at=now(),review_note=left(nullif(trim(coalesce(p_review_note,'')),''),1000) where game_order_id=p_order_id and status='pending' and proof_path is not null;
 if not found then raise exception 'Pago inexistente, ya revisado o sin comprobante.'; end if;
 if v_decision='rejected' then update public.game_orders set status='failed' where id=p_order_id and provider_order_id is null and provider_submitted_at is null; end if;
 return true;
end; $$;
revoke all on function public.admin_review_manual_game_payment(uuid,text,text) from public,anon;
grant execute on function public.admin_review_manual_game_payment(uuid,text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('manual-game-proofs','manual-game-proofs',false,6291456,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do update set public=false,file_size_limit=6291456,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
drop policy if exists "manual_game_proofs_owner_upload" on storage.objects;
create policy "manual_game_proofs_owner_upload" on storage.objects for insert to authenticated with check(bucket_id='manual-game-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.manual_game_payments p where p.user_id=(select auth.uid()) and p.game_order_id::text=(storage.foldername(name))[2] and p.status='pending'));
drop policy if exists "manual_game_proofs_owner_read_admin_read" on storage.objects;
create policy "manual_game_proofs_owner_read_admin_read" on storage.objects for select to authenticated using(bucket_id='manual-game-proofs' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_support_admin()));
