begin;

create or replace function public.admin_list_gvr_purchase_requests_v2()
returns table(
  id uuid,
  user_id uuid,
  user_email text,
  username text,
  gvr_amount integer,
  payment_method text,
  payment_amount numeric,
  payment_currency text,
  proof_path text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  payment_sender_phone text,
  payment_txid text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.is_support_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    r.id,
    r.user_id,
    u.email::text,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'username', ''),
      nullif(u.raw_user_meta_data ->> 'user_name', ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      ''
    )::text,
    r.gvr_amount,
    r.payment_method,
    r.payment_amount,
    r.payment_currency,
    r.proof_path,
    r.status,
    r.created_at,
    r.reviewed_at,
    r.review_note,
    r.payment_sender_phone,
    r.payment_txid,
    r.expires_at
  from public.gvr_purchase_requests r
  join auth.users u on u.id = r.user_id
  order by
    case when r.status = 'pending' then 0 else 1 end,
    r.created_at desc;
end;
$function$;

revoke all on function public.admin_list_gvr_purchase_requests_v2() from public, anon;
grant execute on function public.admin_list_gvr_purchase_requests_v2() to authenticated;

commit;
