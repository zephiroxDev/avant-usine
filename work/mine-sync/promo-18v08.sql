create function public.au_promo_creator_18v08()
returns boolean language sql stable security definer set search_path=''
as $$select auth.uid() is not null and au_private.creator_user(auth.uid());$$;
revoke all on function public.au_promo_creator_18v08() from public,anon;
grant execute on function public.au_promo_creator_18v08() to authenticated;
create table public.au_promo_status (
 user_id uuid not null references auth.users(id) on delete cascade,
 image_id text not null check (image_id ~ '^[a-z0-9-]{1,80}$'),
 seen_at timestamptz,
 published boolean not null default false,
 primary key(user_id,image_id)
);
alter table public.au_promo_status enable row level security;
revoke all on public.au_promo_status from public,anon,authenticated;
grant select,insert,update on public.au_promo_status to authenticated;
create policy promo_select on public.au_promo_status for select to authenticated using(user_id=(select auth.uid()) and (select public.au_promo_creator_18v08()));
create policy promo_insert on public.au_promo_status for insert to authenticated with check(user_id=(select auth.uid()) and (select public.au_promo_creator_18v08()));
create policy promo_update on public.au_promo_status for update to authenticated using(user_id=(select auth.uid()) and (select public.au_promo_creator_18v08())) with check(user_id=(select auth.uid()) and (select public.au_promo_creator_18v08()));
create function public.au_promo_mark_18v08(p_image text,p_action text,p_published boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.au_promo_status;
begin
 if auth.uid() is null or not public.au_promo_creator_18v08() then raise exception 'Accès réservé au créateur.'; end if;
 if p_action is null or p_action not in ('seen','published') then raise exception 'Action invalide.'; end if;
 insert into public.au_promo_status(user_id,image_id,seen_at,published)
 values(auth.uid(),p_image,case when p_action='seen' then now() end,case when p_action='published' then p_published else false end)
 on conflict(user_id,image_id) do update set
 seen_at=case when p_action='seen' then coalesce(au_promo_status.seen_at,now()) else au_promo_status.seen_at end,
 published=case when p_action='published' then p_published else au_promo_status.published end returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.au_promo_mark_18v08(text,text,boolean) from public,anon;
grant execute on function public.au_promo_mark_18v08(text,text,boolean) to authenticated;
