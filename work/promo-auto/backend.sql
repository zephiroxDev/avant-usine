create extension if not exists pg_net with schema extensions;

create table au_private.promo_automation (
  id boolean primary key default true check (id),
  state jsonb not null default '{"config":{"enabled":false,"channelId":"6ad0edf5778b240e2f19fa52","handle":"avant.l.usine","excludedPatches":[]},"items":{}}',
  lease uuid,
  lease_until timestamptz,
  last_run timestamptz,
  last_error text not null default '',
  error_notified text not null default ''
);
alter table au_private.promo_automation enable row level security;
revoke all on au_private.promo_automation from public, anon, authenticated;
insert into au_private.promo_automation(id) values(true);

create function au_private.promo_worker(p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  row_state au_private.promo_automation;
  token uuid;
  result jsonb;
  record jsonb;
  failure text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Service access required' using errcode='42501';
  end if;
  if p_action='credentials' then
    select jsonb_build_object(
      'bufferKey',(select decrypted_secret from vault.decrypted_secrets where name='au_promo_buffer_key'),
      'cronToken',(select decrypted_secret from vault.decrypted_secrets where name='au_promo_cron_token')) into result;
    if result->>'bufferKey' is null or result->>'cronToken' is null then raise exception 'Credentials unavailable'; end if;
    return result;
  end if;
  select * into row_state from au_private.promo_automation where id for update;
  if p_action='acquire' then
    if row_state.lease_until > now() then return null; end if;
    token:=extensions.gen_random_uuid();
    update au_private.promo_automation set lease=token,lease_until=now()+interval '3 minutes' where id;
    return jsonb_build_object('lease',token,'state',row_state.state);
  end if;
  if row_state.lease is null or row_state.lease::text is distinct from p_payload->>'lease'
     or row_state.lease_until <= now() then raise exception 'Invalid worker lease'; end if;
  if p_action='save' then
    if jsonb_typeof(p_payload->'state'->'items') is distinct from 'object'
       or p_payload->'state'->'config' is distinct from row_state.state->'config' then
      raise exception 'Invalid state';
    end if;
    update au_private.promo_automation set state=p_payload->'state' where id;
    for record in select value from jsonb_each(p_payload->'state'->'items') loop
      if record->>'published'='true' and record->>'status'='sent' and record->>'publishedAt' is not null then
        insert into public.au_promo_status(user_id,image_id,published)
          select user_id,record->>'imageId',true from public.au_account_roles
          where role='creator' and au_private.creator_user(user_id)
        on conflict(user_id,image_id) do update set published=true;
      end if;
    end loop;
    return jsonb_build_object('saved',true);
  elsif p_action='release' then
    failure:=left(coalesce(p_payload->>'error',''),900);
    if failure<>'' and failure<>row_state.error_notified then
      insert into public.au_member_notifications(user_id,kind,body)
        select user_id,'promo_automation','La publication automatique d’une vidéo de patch n’a pas pu être confirmée. Ouvre Buffer pour vérifier l’envoi. La vidéo ne sera pas renvoyée en double automatiquement.'
        from public.au_account_roles where role='creator' and au_private.creator_user(user_id);
    end if;
    update au_private.promo_automation set lease=null,lease_until=null,last_run=now(),last_error=failure,
      error_notified=failure where id;
    return jsonb_build_object('released',true);
  end if;
  raise exception 'Unknown worker action';
end $$;
revoke all on function au_private.promo_worker(text,jsonb) from public,anon,authenticated;
grant execute on function au_private.promo_worker(text,jsonb) to service_role;
grant usage on schema au_private to service_role;

create function public.au_promo_worker(p_action text,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
  select au_private.promo_worker(p_action,p_payload);
$$;
revoke all on function public.au_promo_worker(text,jsonb) from public,anon,authenticated;
grant execute on function public.au_promo_worker(text,jsonb) to service_role;
