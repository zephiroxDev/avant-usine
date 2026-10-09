-- Optional backup capability. Raw proof exists only in the encrypted export.
create schema if not exists au_private;
revoke all on schema au_private from public,anon,authenticated;
create table if not exists au_private.backup_role_proofs(
 digest text primary key,
 source_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('creator','moderator')),
 created_at timestamptz not null default now(),
 redeemed_by uuid references auth.users(id) on delete set null,
 redeemed_at timestamptz
);
alter table au_private.backup_role_proofs enable row level security;
revoke all on au_private.backup_role_proofs from public,anon,authenticated;

create or replace function au_private.creator_user(u uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.au_account_roles r join auth.users a on a.id=r.user_id where r.user_id=u and r.role='creator' and a.email_confirmed_at is not null and (a.banned_until is null or a.banned_until<now()));$$;
revoke all on function au_private.creator_user(uuid) from public,anon,authenticated;
create or replace function public.au_is_creator()
returns boolean language sql stable security definer set search_path=''
as $$select au_private.creator_user(auth.uid());$$;
create or replace function public.au_sync_owner()
returns boolean language sql stable security definer set search_path=''
as $$select public.au_is_creator();$$;

create or replace function public.au_backup_role_18v06(p_action text,p_token text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare u uuid:=auth.uid(); value text; selected_role text; proof au_private.backup_role_proofs;
begin
 if u is null or not exists(select 1 from auth.users a where a.id=u and a.email_confirmed_at is not null and (a.banned_until is null or a.banned_until<now())) then raise exception 'Connectez-vous avec un compte confirmé et actif.';end if;
 if p_action='issue' then
  selected_role:=case when public.au_is_creator() then 'creator' when public.au_v12_moderator(u) then 'moderator' else null end;
  if selected_role is null then raise exception 'Votre compte ne possède aucun rôle à transférer.';end if;
  perform public.au_social_rate(u,'backup-role-export',20,86400);
  value:=encode(extensions.gen_random_bytes(32),'hex');
  insert into au_private.backup_role_proofs(digest,source_id,role) values(encode(extensions.digest(value,'sha256'),'hex'),u,selected_role);
  return jsonb_build_object('role',selected_role,'token',value);
 elsif p_action in ('check','redeem') then
  if p_token is null or p_token!~'^[a-f0-9]{64}$' then raise exception 'Preuve de rôle invalide.';end if;
  perform public.au_social_rate(u,'backup-role-verify',60,3600);
  select * into proof from au_private.backup_role_proofs where digest=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or not exists(select 1 from auth.users a where a.id=proof.source_id and a.email_confirmed_at is not null and (a.banned_until is null or a.banned_until<now())) then raise exception 'Preuve de rôle invalide ou source indisponible.';end if;
  if proof.redeemed_by is not null and proof.redeemed_by<>u then raise exception 'Cette preuve a déjà été utilisée pour un autre compte.';end if;
  if (proof.role='creator' and not au_private.creator_user(proof.source_id)) or (proof.role='moderator' and not public.au_v12_moderator(proof.source_id)) then raise exception 'Le rôle de la source a été retiré.';end if;
  if p_action='redeem' then
   if proof.role='creator' then
    insert into public.au_account_roles(user_id,role) values(u,'creator') on conflict(user_id) do update set role='creator',updated_at=now();
   else
    insert into public.au_moderators(user_id,granted_by,active) values(u,proof.source_id,true) on conflict(user_id) do update set active=true,granted_by=excluded.granted_by;
   end if;
   if proof.redeemed_at is null then insert into public.au_moderation_audit(actor,target,action) values(proof.source_id,u,'backup:role:'||proof.role);end if;
   update au_private.backup_role_proofs set redeemed_by=u,redeemed_at=coalesce(redeemed_at,now()) where digest=proof.digest;
  end if;
  return jsonb_build_object('role',proof.role,'valid',true);
 end if;
 raise exception 'Action inconnue.';
end;$$;
revoke all on function public.au_backup_role_18v06(text,text) from public,anon;
grant execute on function public.au_backup_role_18v06(text,text) to authenticated;

-- Update old root-only display and action guards, retaining creator deletion protections.
do $$declare definition text;begin
 select pg_get_functiondef('public.au_social_pre_v12(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'u<>owner_id or not public.au_is_creator()','not public.au_is_creator()');execute definition;
 select pg_get_functiondef('public.au_moderation_v12(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'a.id=''e554cec4-e276-4b9e-bc46-6a569af4af3b''::uuid creator','au_private.creator_user(a.id) creator');execute definition;
 select pg_get_functiondef('public.au_profile_public_before_17(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'a.id=''e554cec4-e276-4b9e-bc46-6a569af4af3b''::uuid and exists(select 1 from public.au_account_roles where user_id=a.id and role=''creator'')','au_private.creator_user(a.id)');execute definition;
end;$$;
