create schema if not exists au_private;
revoke all on schema au_private from public;
grant usage on schema au_private to anon, authenticated;
create table au_private.track_shares_17v06 (
 id uuid primary key default gen_random_uuid(),
 track_key text not null references public.au_track_catalog(track_key),
 owner_id uuid references auth.users(id) on delete set null,
 has_account boolean not null,
 guest_key uuid unique,
 created_at timestamptz not null default clock_timestamp(),
 check ((has_account and guest_key is null) or (not has_account and owner_id is null and guest_key is not null))
);
alter table au_private.track_shares_17v06 enable row level security;
revoke all on au_private.track_shares_17v06 from public,anon,authenticated;
create unique index track_shares_17v06_owner_track on au_private.track_shares_17v06(owner_id,track_key) where owner_id is not null;
create index track_shares_17v06_created on au_private.track_shares_17v06(created_at);
create index track_shares_17v06_track on au_private.track_shares_17v06(track_key);
create function au_private.track_share_17v06(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s au_private.track_shares_17v06;g uuid;profile jsonb;begin
 if p_action='create' then
  if u is not null then u:=public.au_social_member();end if;
  if not exists(select 1 from public.au_track_catalog where track_key=p->>'track') then raise exception 'Morceau introuvable.';end if;
  if u is not null then
   perform pg_advisory_xact_lock(hashtextextended('au-share:'||u::text||':'||(p->>'track'),0));
   select * into s from au_private.track_shares_17v06 where owner_id=u and track_key=p->>'track';
   if not found then
    perform public.au_social_rate(u,'track-share-create',60,3600);
    insert into au_private.track_shares_17v06(track_key,owner_id,has_account) values(p->>'track',u,true) returning * into s;
   end if;
  else
   begin g:=(p->>'guest_key')::uuid;exception when others then raise exception 'Identifiant de partage anonyme invalide.';end;
   if g is null then raise exception 'Identifiant de partage anonyme manquant.';end if;
   perform pg_advisory_xact_lock(hashtextextended('au-share-guest:'||g::text,0));
   select * into s from au_private.track_shares_17v06 where guest_key=g;
   if found then
    if s.track_key is distinct from p->>'track' then raise exception 'Ce lien concerne un autre morceau.';end if;
   else
    perform pg_advisory_xact_lock(hashtextextended('au-share-guest-rate',0));
    if (select count(*) from au_private.track_shares_17v06 where not has_account and created_at>clock_timestamp()-interval '1 minute')>=200 then raise exception 'Trop de nouveaux partages. Réessaie dans une minute.';end if;
    insert into au_private.track_shares_17v06(track_key,has_account,guest_key) values(p->>'track',false,g) returning * into s;
   end if;
  end if;
 elsif p_action='resolve' then
  begin g:=(p->>'id')::uuid;exception when others then raise exception 'Lien de partage invalide.';end;
  select * into s from au_private.track_shares_17v06 where id=g;
  if not found then raise exception 'Lien de partage introuvable.';end if;
 else raise exception 'Action de partage inconnue.';end if;
 if s.owner_id is not null then profile:=public.au_profile_public(s.owner_id);end if;
 return jsonb_build_object('id',s.id,'track_key',s.track_key,'has_account',s.has_account,'created_at',s.created_at,'author',case when profile->>'id' is not null then jsonb_build_object('id',profile->>'id','nickname',profile->>'nickname') else null end);
end $$;
revoke all on function au_private.track_share_17v06(text,jsonb) from public;
grant execute on function au_private.track_share_17v06(text,jsonb) to anon,authenticated;
create function public.au_track_share_17v06(p_action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select au_private.track_share_17v06(p_action,p)$$;
revoke all on function public.au_track_share_17v06(text,jsonb) from public;
grant execute on function public.au_track_share_17v06(text,jsonb) to anon,authenticated;

alter table public.au_sync_files add column requested_mode text check(requested_mode in ('highlight','blocks'));

CREATE OR REPLACE FUNCTION public.au_sync_files_api_before_17v06(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid;f public.au_sync_files;result jsonb;cnt integer;bytes bigint;begin
 u:=public.au_social_member();
 if p_action='start' then
  perform public.au_social_rate(u,'sync-file-start',10,86400);
  if coalesce(length(p->>'file_name'),0) not between 1 and 255 or coalesce(length(p->>'track'),0) not between 1 and 100 then raise exception 'Nom de fichier ou morceau manquant.';end if;
  -- Only transport metadata is checked; never lyric contents or track matching.
  insert into public.au_sync_files(user_id,track_key,file_name,byte_size,chunk_count)
  values(u,p->>'track',p->>'file_name',(p->>'byte_size')::bigint,(p->>'chunk_count')::integer) returning * into f;
  return jsonb_build_object('id',f.id);
 end if;
 if p_action in('queue','mine') then
  if p_action='queue' and not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]') into result from
   (select * from public.au_sync_files where status<>'uploading' and (p_action='queue' or user_id=u) order by created_at desc limit 100) s;return result;
 end if;
 select * into f from public.au_sync_files where id=(p->>'id')::bigint for update;
 if not found then raise exception 'Dépôt introuvable.';end if;
 if p_action in('chunk','finish') then
  if f.user_id<>u or f.status<>'uploading' then raise exception 'Ce dépôt ne peut plus être modifié.';end if;
  if p_action='chunk' then
   if (p->>'part')::integer<0 or (p->>'part')::integer>=f.chunk_count or coalesce(octet_length(p->>'payload'),0)>262144 or jsonb_typeof(p->'payload') is distinct from 'string' then raise exception 'Fragment de transfert invalide.';end if;
   perform decode(p->>'payload','base64');
   insert into public.au_sync_file_chunks(file_id,part,payload) values(f.id,(p->>'part')::integer,p->>'payload') on conflict(file_id,part) do update set payload=excluded.payload;
   return jsonb_build_object('saved',true);
  end if;
  select count(*),coalesce(sum(octet_length(decode(payload,'base64'))),0) into cnt,bytes from public.au_sync_file_chunks where file_id=f.id;
  if cnt<>f.chunk_count or bytes<>f.byte_size then raise exception 'Transfert incomplet. Réessaie le dépôt.';end if;
  update public.au_sync_files set status='pending',analysis=coalesce(p->'analysis','{}') where id=f.id;
  return jsonb_build_object('id',f.id,'status','pending');
 end if;
 if p_action='download' then
  if f.user_id<>u and not public.au_can_review() then raise exception 'Accès refusé.';end if;
  select coalesce(jsonb_agg(payload order by part),'[]') into result from public.au_sync_file_chunks where file_id=f.id;
  return to_jsonb(f)||jsonb_build_object('chunks',result);
 end if;
 if p_action='decide' then
  if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
  if f.status='uploading' or f.revision is distinct from (p->>'revision')::integer then raise exception 'Le dépôt a changé. Actualise la liste.';end if;
  if p->>'status' not in('accepted','rejected') or coalesce(length(p->>'note'),0)>1000 then raise exception 'Décision invalide.';end if;
  update public.au_sync_files set status=p->>'status',note=coalesce(p->>'note',''),reviewer=u,reviewed_at=now(),revision=revision+1 where id=f.id;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Action inconnue.';
end $function$
;
revoke all on function public.au_sync_files_api_before_17v06(text,jsonb) from public,anon,authenticated;

create function au_private.sync_files_17v06(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;f public.au_sync_files;result jsonb;mode text;raw text;doc jsonb;detailed boolean:=false;
begin
 u:=public.au_social_member();
 if p_action='start' then
  mode:=p->>'requested_mode';
  if mode is not null and mode not in('highlight','blocks') then raise exception 'Type de synchronisation invalide.';end if;
  if mode='highlight' and lower(p->>'file_name') not like '%.json' then raise exception 'Highlight Progression demande un JSON détaillé ; le LRC est réservé à la synchronisation simple.';end if;
  result:=public.au_sync_files_api_before_17v06(p_action,p);
  update public.au_sync_files set requested_mode=mode where id=(result->>'id')::bigint and user_id=u;
  return result;
 end if;
 if p_action='finish' then
  select * into f from public.au_sync_files where id=(p->>'id')::bigint for update;
  if not found or f.user_id<>u or f.status<>'uploading' then raise exception 'Ce dépôt ne peut plus être modifié.';end if;
  if f.requested_mode='highlight' then
   select convert_from(decode(string_agg(encode(decode(payload,'base64'),'hex'),'' order by part),'hex'),'UTF8') into raw from public.au_sync_file_chunks where file_id=f.id;
   begin doc:=raw::jsonb;exception when others then raise exception 'Le JSON Highlight est illisible ou incomplet.';end;
   if jsonb_typeof(doc) is distinct from 'object' or doc->>'sync_mode'='blocks' or jsonb_typeof(doc->'syncedLyrics')='string' then raise exception 'Ce fichier contient une synchronisation simple.';end if;
   if jsonb_typeof(doc->'curves')='array' then
    select exists(select 1 from jsonb_array_elements(doc->'curves') c where case when jsonb_typeof(c)='array' then jsonb_array_length(c)>2 else false end) into detailed;
   end if;
   if not detailed and jsonb_typeof(doc->'lines')='array' then
    select exists(select 1 from jsonb_array_elements(doc->'lines') l where case when jsonb_typeof(l->'words')='array' then jsonb_array_length(l->'words')>1 else false end) into detailed;
   end if;
   if not detailed then raise exception 'Highlight Progression demande des repères à l’intérieur des phrases.';end if;
  end if;
  p:=p||jsonb_build_object('analysis',coalesce(p->'analysis','{}'::jsonb)||jsonb_build_object('requested_mode',f.requested_mode));
 end if;
 return public.au_sync_files_api_before_17v06(p_action,p);
end $$;
revoke all on function au_private.sync_files_17v06(text,jsonb) from public,anon;
grant execute on function au_private.sync_files_17v06(text,jsonb) to authenticated;
create or replace function public.au_sync_files_api(p_action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select au_private.sync_files_17v06(p_action,p)$$;
revoke all on function public.au_sync_files_api(text,jsonb) from public,anon;
grant execute on function public.au_sync_files_api(text,jsonb) to authenticated;
