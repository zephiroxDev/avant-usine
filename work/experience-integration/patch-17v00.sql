begin;
create table if not exists public.au_permission_requests(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 feature text not null,status text not null default 'pending' check(status in('pending','accepted','rejected')),
 created_at timestamptz not null default now(),decided_at timestamptz,decided_by uuid references auth.users(id));
create unique index if not exists au_permission_pending on public.au_permission_requests(user_id,feature) where status='pending';
create table if not exists public.au_permission_grants(user_id uuid not null references auth.users(id) on delete cascade,feature text not null,granted_at timestamptz not null default now(),primary key(user_id,feature));
create table if not exists public.au_activity_17(id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,action text not null,content text,details jsonb not null default '{}',created_at timestamptz not null default now());
create table if not exists public.au_presence(user_id uuid primary key references auth.users(id) on delete cascade,state text not null default 'online' check(state in('online','dnd','offline')),seen_at timestamptz not null default now(),badge_animation text not null default 'pulse' check(badge_animation in('none','pulse','scan','orbit')));
create table if not exists public.au_ai_cases(id bigint generated always as identity primary key,track_key text not null unique,reporter uuid references auth.users(id) on delete set null,title text not null,volume text not null,source text not null,snapshot jsonb not null,status text not null default 'queued' check(status in('queued','active','removed','retained')),created_at timestamptz not null default now(),starts_at timestamptz,ends_at timestamptz,closed_at timestamptz,yes_votes integer, no_votes integer);
create unique index if not exists au_ai_one_active on public.au_ai_cases(status) where status='active';
create table if not exists public.au_ai_votes(case_id bigint references public.au_ai_cases(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,answer boolean not null,created_at timestamptz not null default now(),primary key(case_id,user_id));
alter table public.au_sync_submissions add column if not exists correction_of bigint;
do $$declare t text;begin foreach t in array array['au_permission_requests','au_permission_grants','au_activity_17','au_presence','au_ai_cases','au_ai_votes'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;end$$;
create or replace function public.au_has_permission(feature text) returns boolean language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then return false;end if;
 perform public.au_social_member();
 return coalesce(public.au_is_creator(),false) or (public.au_v12_moderator(auth.uid()) and exists(select 1 from public.au_permission_grants g where g.user_id=auth.uid() and g.feature=au_has_permission.feature));end$$;
create or replace function public.au17_presence(u uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('presence',case when public.au_v12_sanction(u) is not null or exists(select 1 from auth.users where id=u and banned_until>now()) then 'sanctioned' when p.state='dnd' then 'dnd' when p.state='online' and p.seen_at>now()-interval '90 seconds' then 'online' else 'offline' end,'badge_animation',coalesce(p.badge_animation,'pulse')) from (select 1) seed left join public.au_presence p on p.user_id=u$$;
-- Presence extends existing identity; a sanctioned profile remains identifiable as sanctioned.
do $$begin if to_regprocedure('public.au_profile_public_before_17(uuid)') is null then alter function public.au_profile_public(uuid) rename to au_profile_public_before_17;end if;end$$;
create or replace function public.au_profile_public(u uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(public.au_profile_public_before_17(u),(select jsonb_build_object('id',a.id,'nickname',coalesce(p.nickname,'Membre'),'avatar',coalesce(p.avatar,''),'bio','','creator',false,'moderator',false) from auth.users a left join public.au_profiles p on p.user_id=a.id where a.id=u and a.email_confirmed_at is not null))||public.au17_presence(u)$$;
create or replace function public.au17_access(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;r jsonb;req public.au_permission_requests;f text;begin
 u:=public.au_social_member();if octet_length(p::text)>10000 then raise exception 'Demande trop volumineuse.';end if;
 if p_action='status' then insert into public.au_presence(user_id) values(u) on conflict do nothing;return jsonb_build_object('grants',(select coalesce(jsonb_agg(feature),'[]') from public.au_permission_grants where user_id=u),'presence',public.au17_presence(u));end if;
 if p_action='presence' then
  if p->>'state' not in('online','dnd','offline') or p->>'state' is null then raise exception 'Statut invalide.';end if;
  if p ? 'badge_animation' and (p->>'badge_animation' is null or p->>'badge_animation' not in('none','pulse','scan','orbit')) then raise exception 'Animation invalide.';end if;
  insert into public.au_presence(user_id,state,badge_animation) values(u,p->>'state',coalesce(p->>'badge_animation','pulse')) on conflict(user_id) do update set state=excluded.state,seen_at=now(),badge_animation=case when p ? 'badge_animation' then excluded.badge_animation else au_presence.badge_animation end;
  return public.au17_presence(u);
 elsif p_action='heartbeat' then insert into public.au_presence(user_id) values(u) on conflict(user_id) do update set seen_at=now();return public.au17_presence(u);
 elsif p_action='request' then
  if not public.au_v12_moderator(u) or public.au_is_creator() then raise exception 'Demande réservée aux modérateurs.';end if;
  f:=p->>'feature';if f is null or f not in('administration','catalog','applications','reports','members','activation','repertoire','audio_audit') then raise exception 'Fonctionnalité inconnue.';end if;
  perform public.au_social_rate(u,'permission-request',20,86400);
  insert into public.au_permission_requests(user_id,feature) values(u,f) on conflict(user_id,feature) where status='pending' do nothing;
  if found then insert into public.au_member_notifications(user_id,kind,body) values('e554cec4-e276-4b9e-bc46-6a569af4af3b','permission','Nouvelle demande d’accès : '||coalesce(public.au_profile_public(u)->>'nickname','Modérateur')||' · '||f||'. Consulte Demandes d’accès créateur.');end if;
  return jsonb_build_object('sent',true);
 end if;
 perform public.au_v12_owner();
 if p_action='requests' then select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') into r from(select a.*,public.au_profile_public(a.user_id) profile from public.au_permission_requests a order by a.id desc limit 200)q;return r;
 elsif p_action='decide' then
  if p->>'status' is null or p->>'status' not in('accepted','rejected') then raise exception 'Décision invalide.';end if;
  select * into req from public.au_permission_requests where id=(p->>'id')::bigint for update;if not found or req.status<>'pending' then raise exception 'Demande déjà traitée.';end if;
  if not public.au_v12_moderator(req.user_id) then raise exception 'Ce compte n’est plus modérateur.';end if;
  update public.au_permission_requests set status=p->>'status',decided_at=now(),decided_by=u where id=req.id;
  if p->>'status'='accepted' then insert into public.au_permission_grants(user_id,feature) values(req.user_id,req.feature) on conflict do nothing;end if;
  insert into public.au_member_notifications(user_id,kind,body) values(req.user_id,'permission','Demande '||req.feature||' : '||case when p->>'status'='accepted' then 'acceptée' else 'refusée' end);
  insert into public.au_activity_17(actor,action,content,details) values(u,'permission:'||(p->>'status'),req.feature,jsonb_build_object('user_id',req.user_id));return 'true';
 elsif p_action='activity' then select coalesce(jsonb_agg(to_jsonb(q) order by q.id desc),'[]') into r from(select a.*,public.au_profile_public(a.actor) profile from public.au_activity_17 a where a.id<coalesce((p->>'before')::bigint,9223372036854775807) order by id desc limit 100)q;return r;
 end if;raise exception 'Action inconnue.';end$$;
-- No global creator impersonation. Every existing RPC receives its own explicit grant gate.
do $$declare fn record;def text;feature text;begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('au_catalog_admin','au_catalog_save','au_catalog_genius','au_admin_list','au_admin_moderate','au_admin_supporter','au_activation','au_audio_audit','au_repertoire') loop
  feature:=case when fn.proname like 'au_catalog_%' then 'catalog' when fn.proname='au_activation' then 'activation' when fn.proname='au_audio_audit' then 'audio_audit' when fn.proname='au_repertoire' then 'repertoire' else 'administration' end;
  def:=pg_get_functiondef(fn.oid);def:=replace(def,'not public.au_is_creator()',format('not public.au_has_permission(%L)',feature));def:=replace(def,'not public.au_sync_owner()',format('not public.au_has_permission(%L)',feature));execute def;
 end loop;
end$$;
-- V12 administrative gates are scoped by action, never by the enclosing screen.
do $$declare def text;begin def:=pg_get_functiondef('public.au_moderation_v12(text,jsonb)'::regprocedure);
 def:=replace(def,'u:=public.au_v12_owner();',E'u:=public.au_social_member();\n if not public.au_has_permission(case when p_action in (''applications'',''application_status'',''application_delete'') then ''applications'' when p_action in (''reports'',''report_resolve'') then ''reports'' else ''members'' end) then raise exception ''Accès exclusif au créateur ou autorisation requise.'';end if;');execute def;end$$;
-- Structural headers are anchored to the whole line. Ordinary sung phrases remain intact.
create or replace function public.au_lyric_heading(s text) returns boolean language sql immutable set search_path='' as $$
 select regexp_replace(btrim(coalesce(s,'')),'^[\[(]|[\])]$','','g') ~* '^(intro|outro|couplet|refrain|pont|bridge|verse|chorus|hook|break|solo|interlude|instrumental(e)?|pr[ée][ -]?refrain|post[ -]?refrain|pre[ -]?chorus|post[ -]?chorus)([[:space:]]+([0-9]+|[IVX]+))?([[:space:]]*[x×][[:space:]]*[0-9]+)?[[:space:]]*(:[[:space:]]*[^\r\n]*)?$'
 or btrim(coalesce(s,'')) ~* '^[\[(]?feat\.?[[:space:]]+[^\r\n]+[\])]?:?$'$$;
-- Private messages are rejected at the actual write boundary for either DND participant.
do $$begin if to_regprocedure('public.au_social_before_17(text,jsonb)') is null then alter function public.au_social(text,jsonb) rename to au_social_before_17;end if;end$$;
create or replace function public.au_social(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare r jsonb;begin
 if p_action='send' and exists(select 1 from public.au_presence where user_id in(auth.uid(),(p->>'peer')::uuid) and state='dnd') then raise exception 'Les messages privés sont bloqués en mode Ne pas déranger.';end if;
 r:=public.au_social_before_17(p_action,p);
 if p_action='thread' and exists(select 1 from public.au_presence where user_id in(auth.uid(),(p->>'peer')::uuid) and state='dnd') then r:=r||jsonb_build_object('can_send',false);end if;
 return r;end$$;
-- Retired track identifiers are never reused; source URLs belong to identities, not display positions.
create or replace function public.au17_ai_tick() returns void language plpgsql security definer set search_path='' as $$
declare c public.au_ai_cases;y integer;n integer;v integer;doc jsonb;next_start timestamptz;begin
 perform pg_advisory_xact_lock(170017);
 loop
  select * into c from public.au_ai_cases where status='active' for update;
  if not found then
   select * into c from public.au_ai_cases where status='queued' order by id limit 1 for update;if not found then return;end if;
   update public.au_ai_cases set status='active',starts_at=coalesce(next_start,now()),ends_at=coalesce(next_start,now())+interval '7 days' where id=c.id returning * into c;
  end if;
  if c.ends_at>now() then return;end if;
  select count(*) filter(where answer),count(*) filter(where not answer) into y,n from public.au_ai_votes where case_id=c.id;
  if y>n then
   v:=split_part(c.track_key,':',1)::integer;perform pg_advisory_xact_lock(712830,v);
   select published into doc from public.au_catalog where number=v for update;
   doc:=jsonb_set(doc,'{tracks}',coalesce((select jsonb_agg(t||jsonb_build_object('position',pos) order by pos) from(select t,row_number() over(order by ord) pos from jsonb_array_elements(doc->'tracks')with ordinality q(t,ord) where v::text||':'||(t->>'number')<>c.track_key)s),'[]'));
   update public.au_catalog set published=doc,draft=jsonb_set(draft,'{tracks}',coalesce((select jsonb_agg(t||jsonb_build_object('position',pos) order by pos) from(select t,row_number() over(order by ord) pos from jsonb_array_elements(draft->'tracks')with ordinality q(t,ord) where v::text||':'||(t->>'number')<>c.track_key)s),'[]')),revision=revision+1,updated_at=now() where number=v;
  end if;
  update public.au_ai_cases set status=case when y>n then 'removed' else 'retained' end,yes_votes=y,no_votes=n,closed_at=c.ends_at where id=c.id;
  next_start:=c.ends_at;
 end loop;
end$$;
create or replace function public.au17_ai(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;c public.au_ai_cases;r jsonb;t jsonb;volume_name text;begin
 if p is null or octet_length(p::text)>10000 then raise exception 'Demande invalide.';end if;
 perform public.au17_ai_tick();
 if p_action='public' then
  select to_jsonb(a)-'reporter'-'snapshot'||jsonb_build_object('my_vote',(select answer from public.au_ai_votes where case_id=a.id and user_id=auth.uid())) into r from public.au_ai_cases a where status='active';
  return jsonb_build_object('active',r,'queued',(select count(*) from public.au_ai_cases where status='queued'),'removed',(select coalesce(jsonb_agg(track_key),'[]') from public.au_ai_cases where status='removed'));
 end if;
 u:=public.au_social_member();
 if p_action='report' then
  if (p->>'confirmed')::boolean is distinct from true then raise exception 'Confirme explicitement le signalement.';end if;
  perform public.au_social_rate(u,'ai-report',5,86400);
  select x,cat.published->>'title' into t,volume_name from public.au_catalog cat cross join lateral jsonb_array_elements(cat.published->'tracks') x where cat.number::text||':'||(x->>'number')=p->>'track';if t is null then raise exception 'Morceau introuvable.';end if;
  insert into public.au_ai_cases(track_key,reporter,title,volume,source,snapshot) values(p->>'track',u,t->>'title',volume_name,t->>'src',t) on conflict(track_key) do nothing;
  perform public.au17_ai_tick();return jsonb_build_object('reported',true);
 elsif p_action='vote' then
  perform pg_advisory_xact_lock(170017);
  select * into c from public.au_ai_cases where id=(p->>'id')::bigint for update;
  if not found or c.status<>'active' or c.ends_at<=now() then raise exception 'Ce vote est terminé.';end if;
  if jsonb_typeof(p->'answer') is distinct from 'boolean' then raise exception 'Choisis Oui ou Non.';end if;
  insert into public.au_ai_votes(case_id,user_id,answer) values(c.id,u,(p->>'answer')::boolean) on conflict(case_id,user_id) do update set answer=excluded.answer;return 'true';
 elsif p_action='history' then
  perform public.au_v12_owner();select coalesce(jsonb_agg(to_jsonb(q) order by id desc),'[]') into r from(select a.*,public.au_profile_public(a.reporter) reporter_profile,(select count(*) from public.au_ai_votes where case_id=a.id and answer) current_yes,(select count(*) from public.au_ai_votes where case_id=a.id and not answer) current_no from public.au_ai_cases a where id<coalesce((p->>'before')::bigint,9223372036854775807) order by id desc limit 100)q;return r;
 end if;raise exception 'Action inconnue.';end$$;
do $$begin if to_regprocedure('public.au_catalog_read_before_17()') is null then alter function public.au_catalog_read() rename to au_catalog_read_before_17;end if;end$$;
create or replace function public.au_catalog_read() returns jsonb language plpgsql security definer set search_path='' as $$begin perform public.au17_ai_tick();return public.au_catalog_read_before_17();end$$;
-- A future catalogue publication cannot accidentally restore a community-retired identity.
do $$declare def text;begin def:=pg_get_functiondef('public.au_catalog_save(integer,jsonb,integer,boolean)'::regprocedure);def:=replace(def,'for t in select value from jsonb_array_elements(p_document->''tracks'') loop',E'for t in select value from jsonb_array_elements(p_document->''tracks'') loop\n if exists(select 1 from public.au_ai_cases where status=''removed'' and track_key=p_number::text||'':''||(t->>''number'')) then raise exception ''Ce morceau a été retiré après un vote communautaire IA.'';end if;');execute def;end$$;
-- Automatic expiry continues without any browser or application running.
create extension if not exists pg_cron;
select cron.schedule('avant-usine-ai-17','* * * * *','select public.au17_ai_tick()');
revoke all on function public.au_profile_public_before_17(uuid),public.au_social_before_17(text,jsonb),public.au_catalog_read_before_17(),public.au17_ai_tick(),public.au17_presence(uuid) from public,anon,authenticated;
revoke all on function public.au17_access(text,jsonb),public.au17_ai(text,jsonb),public.au_has_permission(text) from public,anon,authenticated;
grant execute on function public.au17_access(text,jsonb),public.au_has_permission(text) to authenticated;
grant execute on function public.au17_ai(text,jsonb) to anon,authenticated;
-- Inserted in patch-17v00.sql before transaction commit.
create or replace function public.au17_correction(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;v public.au_sync_published;s public.au_sync_submissions;r jsonb;data jsonb;l jsonb;starts jsonb;groups jsonb;curves jsonb;mode text;d numeric;ending numeric;i integer;g integer;prev_g integer:=-1;count_g integer:=0;at numeric;previous numeric:=-1;adjusted jsonb:='[]';new_id bigint;k text;begin
 u:=public.au_social_member();if p is null or octet_length(p::text)>1500000 then raise exception 'Contribution trop volumineuse.';end if;
 if p_action='source' then
  select * into v from public.au_sync_published where track_key=p->>'track';if not found then raise exception 'Aucune synchronisation publique pour ce morceau.';end if;
  return to_jsonb(v)||jsonb_build_object('hash',md5(v.lines::text),'track',v.track_key,'correction_of',v.submission_id);
 elsif p_action='submit' then
  if (p->>'publish')::boolean is true and not public.au_can_review() then raise exception 'Publication directe réservée à la modération.';end if;
  k:=p->>'track';perform pg_advisory_xact_lock(hashtextextended(k,2061));
  select * into v from public.au_sync_published where track_key=k for update;
  if not found or v.submission_id is distinct from (p->>'correction_of')::bigint then raise exception 'La version publique a changé. Recharge la synchronisation.';end if;
  data:=p->'data';l:=data->'lines';d:=(data->>'duration')::numeric;mode:=data->>'sync_mode';
  if jsonb_typeof(l) is distinct from 'array' or jsonb_array_length(l) not between 1 and 600 or d is null or d<=0 or d>21600 then raise exception 'Paroles ou durée invalides.';end if;
  for i in 0..jsonb_array_length(l)-1 loop if jsonb_typeof(l->i) is distinct from 'string' or length(trim(l->>i))=0 or length(l->>i)>2000 then raise exception 'Paroles invalides.';end if;end loop;
  if mode='highlight' then curves:=data->'curves';starts:=public.au_karaoke_validate(l,curves,d);adjusted:=starts;
  elsif mode='blocks' then
   starts:=data->'times';groups:=data->'line_groups';
   if jsonb_typeof(starts) is distinct from 'array' or jsonb_typeof(groups) is distinct from 'array' or jsonb_array_length(starts)<>jsonb_array_length(l) or jsonb_array_length(groups)<>jsonb_array_length(l) then raise exception 'Blocs incomplets.';end if;
   for i in 0..jsonb_array_length(l)-1 loop
    if jsonb_typeof(starts->i) is distinct from 'number' or jsonb_typeof(groups->i) is distinct from 'number' or (groups->>i)::numeric<>trunc((groups->>i)::numeric) then raise exception 'Blocs invalides.';end if;
    g:=(groups->>i)::integer;at:=(starts->>i)::numeric;
    if g=prev_g then count_g:=count_g+1;if at is distinct from (starts->>(i-1))::numeric then raise exception 'Début du bloc incohérent.';end if;else count_g:=1;if g<>prev_g+1 then raise exception 'Ordre des blocs invalide.';end if;end if;
    if count_g>3 or at<0 or at+(count_g-1)*.000001>=d or at+(count_g-1)*.000001<=previous then raise exception 'Timing invalide.';end if;
    previous:=at+(count_g-1)*.000001;adjusted:=adjusted||jsonb_build_array(previous);prev_g:=g;
   end loop;
  else raise exception 'Mode inconnu.';end if;
  ending:=(data->>'end_time')::numeric;
  if ending is not null and (jsonb_typeof(data->'end_time') is distinct from 'number' or ending<=(starts->>-1)::numeric or ending>d) then raise exception 'Fin réelle invalide.';end if;
  if mode='blocks' and ending is null then raise exception 'Indique la fin réelle des paroles.';end if;
  perform public.au_social_rate(u,'sync-correction',30,86400);
  insert into public.au_sync_submissions(user_id,track_key,source_hash,lines,times,duration,status,curves,sync_mode,line_groups,block_times,end_time,correction_of)
  values(u,k,md5(l::text),l,adjusted,d,'pending',curves,mode,groups,case when mode='blocks' then starts end,ending,v.submission_id) returning id into new_id;
  if (p->>'publish')::boolean is true then
   if not public.au_can_review() then raise exception 'Publication directe réservée à la modération.';end if;
   return public.au17_correction('approve',jsonb_build_object('id',new_id,'revision',1));
  end if;
  return jsonb_build_object('id',new_id,'status','pending');
 elsif p_action='approve' then
  if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint for update;
  if not found or s.correction_of is null or s.status<>'pending' or s.revision is distinct from (p->>'revision')::integer then raise exception 'La proposition a changé.';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.track_key,2061));
  select * into v from public.au_sync_published where track_key=s.track_key for update;
  if not found or v.submission_id is distinct from s.correction_of then raise exception 'La version publique a changé. Recommence la correction.';end if;
  -- The edited proposal must go through the same validation as a new correction.
  if p ? 'data' then
   update public.au_sync_submissions set status='rejected',note='Remplacée par sa correction vérifiée',reviewed_at=now() where id=s.id;
   r:=public.au17_correction('submit',jsonb_build_object('track',s.track_key,'correction_of',s.correction_of,'data',p->'data'));
   select * into s from public.au_sync_submissions where id=(r->>'id')::bigint;
   update public.au_sync_submissions set status='rejected',note='Remplacée par sa correction vérifiée',reviewed_at=now() where id=(p->>'id')::bigint;
  end if;
  update public.au_sync_submissions set status='approved',reviewed_at=now(),note=left(coalesce(p->>'note',''),1000) where id=s.id;
  update public.au_sync_published set source_hash=s.source_hash,lines=s.lines,times=s.times,duration=s.duration,submission_id=s.id,curves=s.curves,sync_mode=s.sync_mode,line_groups=s.line_groups,block_times=s.block_times,end_time=s.end_time where track_key=s.track_key;
  return jsonb_build_object('published',true,'submission_id',s.id);
 end if;raise exception 'Action inconnue.';end$$;
-- Existing preview and moderation flows keep their integrity checks for ordinary proposals.
do $$begin if to_regprocedure('public.au_sync_before_17(text,jsonb)') is null then alter function public.au_sync(text,jsonb) rename to au_sync_before_17;end if;end$$;
create or replace function public.au_sync(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare s public.au_sync_submissions;r jsonb;data jsonb;begin
 if p_action='approve' then
  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint;
  if s.correction_of is not null then
   data:=jsonb_build_object('lines',s.lines,'duration',s.duration,'sync_mode',coalesce(p->>'sync_mode',s.sync_mode),'times',coalesce(p->'block_times',s.block_times,s.times),'curves',coalesce(p->'curves',s.curves),'line_groups',coalesce(p->'line_groups',s.line_groups),'end_time',coalesce(p->'end_time',to_jsonb(s.end_time)));
   return public.au17_correction('approve',p||jsonb_build_object('data',data));
  end if;
 end if;
 if p_action='review' then
  perform public.au_social_member();if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint;
  if s.correction_of is not null then return to_jsonb(s)||jsonb_build_object('source',jsonb_build_object('lines',s.lines,'hash',s.source_hash));end if;
 end if;
 return public.au_sync_before_17(p_action,p);end$$;
create or replace function public.au17_audit_trigger() returns trigger language plpgsql security definer set search_path='' as $$declare item jsonb;begin
 if auth.uid() is not null and public.au_v12_moderator(auth.uid()) and not public.au_is_creator() then
  item:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.au_activity_17(actor,action,content,details) values(auth.uid(),tg_table_name||':'||lower(tg_op),coalesce(item->>'track_key',item->>'number',item->>'id'),jsonb_build_object('id',item->'id','status',item->'status','revision',item->'revision'));
 end if;return coalesce(new,old);end$$;
do $$declare t text;begin foreach t in array array['au_sync_submissions','au_sync_published','au_sync_files','au_catalog','au_comments','au_annotations','au_discovery_posts','au_applications','au_account_sanctions','au_moderators','au_activation_codes','au_features'] loop
 execute format('drop trigger if exists au17_audit on public.%I',t);execute format('create trigger au17_audit after insert or update or delete on public.%I for each row execute function public.au17_audit_trigger()',t);end loop;end$$;
revoke all on function public.au17_correction(text,jsonb),public.au_sync_before_17(text,jsonb),public.au17_audit_trigger() from public,anon,authenticated;
do $$begin if to_regprocedure('public.au_sync_moderation_before_17(text,jsonb)') is null then alter function public.au_sync_moderation(text,jsonb) rename to au_sync_moderation_before_17;end if;end$$;
create or replace function public.au_sync_moderation(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$declare r jsonb;begin
 r:=public.au_sync_moderation_before_17(p_action,p);
 if p_action='queue' then r:=jsonb_set(r,'{sync}',coalesce((select jsonb_agg(item||jsonb_build_object('correction_of',(select correction_of from public.au_sync_submissions where id=(item->>'id')::bigint))) from jsonb_array_elements(r->'sync')item),'[]'));end if;
 return r;end$$;
revoke all on function public.au_sync_moderation_before_17(text,jsonb),public.au_sync_moderation(text,jsonb) from public,anon,authenticated;
grant execute on function public.au_sync_moderation(text,jsonb) to authenticated;
grant execute on function public.au17_correction(text,jsonb) to authenticated;
revoke all on function public.au_sync(text,jsonb),public.au_social(text,jsonb),public.au_profile_public(uuid),public.au_catalog_read() from public;
grant execute on function public.au_sync(text,jsonb),public.au_social(text,jsonb),public.au_profile_public(uuid),public.au_catalog_read() to anon,authenticated;

notify pgrst,'reload schema';
commit;


