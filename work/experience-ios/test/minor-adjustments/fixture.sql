create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
create table public.au_account_roles(user_id uuid primary key,role text);
insert into public.au_account_roles values('00000000-0000-0000-0000-000000000001','creator');
create function public.au_is_creator() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.au_account_roles where user_id=auth.uid() and role='creator');$$;
