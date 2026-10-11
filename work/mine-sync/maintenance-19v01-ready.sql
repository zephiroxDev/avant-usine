create table if not exists au_private.maintenance_19 (
 feature text primary key check(length(feature) between 1 and 80),
 closed boolean not null default false,
 message text not null check(length(message)<=1000),
 updated_at timestamptz not null default now()
);
alter table au_private.maintenance_19 enable row level security;
revoke all on au_private.maintenance_19 from public,anon,authenticated;

create or replace function public.au_maintenance_19(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare k text:=p->>'key'; result jsonb;
begin
 if p_action='set' then
  if not public.au_is_creator() then raise exception 'Accès réservé au Créateur.';end if;
  if k not in ('all','accueil','collection','ecoute','playback','paroles','sync_studio','sync_files','projects','bibliotheque','favorites','playlists','queue','local','local_import','local_edit','local_export','local_lyrics','blindtest','decouvrir','rankings','communaute','profiles','profile_edit','messages','comments','annotations','repertoire','sharing','historique','statistiques','summaries','trophies','backup_export','backup_import','immersion','settings','telechargements','infos','patchnotes','support','accounts','moderation','ai_votes','lyrics_contributions','sleep','audio_controls') or k is null then raise exception 'Fonctionnalité inconnue.';end if;
  if jsonb_typeof(p->'closed') is distinct from 'boolean' or jsonb_typeof(p->'message') is distinct from 'string' or length(trim(p->>'message')) not between 1 and 1000 then raise exception 'Explique pourquoi cette fonctionnalité est fermée (1 à 1000 caractères).';end if;
  insert into au_private.maintenance_19(feature,closed,message) values(k,(p->>'closed')::boolean,trim(p->>'message'))
  on conflict(feature) do update set closed=excluded.closed,message=excluded.message,updated_at=now();
 elsif p_action<>'read' then raise exception 'Action inconnue.';
 end if;
 select coalesce(jsonb_object_agg(feature,jsonb_build_object('closed',closed,'message',message,'updatedAt',updated_at)),'{}') into result from au_private.maintenance_19;
 return jsonb_build_object('settings',result);
end $$;
revoke all on function public.au_maintenance_19(text,jsonb) from public;
grant execute on function public.au_maintenance_19(text,jsonb) to anon,authenticated;

create or replace function public.au_maintenance_check_19(feature text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare reason text;
begin
 if public.au_is_creator() then return true;end if;
 select m.message into reason from au_private.maintenance_19 m where m.closed and m.feature in ('all',$1,
 case $1 when 'local_import' then 'local' when 'local_edit' then 'local' when 'local_export' then 'local' when 'local_lyrics' then 'local' when 'favorites' then 'bibliotheque' when 'playlists' then 'bibliotheque' when 'queue' then 'bibliotheque' when 'rankings' then 'decouvrir' when 'profiles' then 'communaute' when 'profile_edit' then 'profiles' when 'messages' then 'communaute' when 'comments' then 'communaute' when 'annotations' then 'paroles' when 'lyrics_contributions' then 'paroles' when 'summaries' then 'statistiques' when 'trophies' then 'statistiques' when 'ai_votes' then 'communaute' when 'sleep' then 'settings' when 'audio_controls' then 'settings' end,
 case when $1='profile_edit' then 'communaute' end) order by (m.feature='all') desc,(m.feature=$1) desc limit 1;
 if found then raise exception '%',reason;end if;
 return true;
end $$;
revoke all on function public.au_maintenance_check_19(text) from public;
grant execute on function public.au_maintenance_check_19(text) to anon,authenticated;

insert into au_private.maintenance_19(feature,closed,message) values('sync_studio',true,'L’Atelier de synchronisation est temporairement fermé pour réparation.') on conflict(feature) do nothing;

-- RPC guards are added after inventory and exercised in rollback tests.

CREATE OR REPLACE FUNCTION public.au17_ai(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid;c public.au_ai_cases;r jsonb;t jsonb;volume_name text;begin
 perform public.au_maintenance_check_19('ai_votes');

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

 end if;raise exception 'Action inconnue.';end$function$;

CREATE OR REPLACE FUNCTION public.au17_correction(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid;v public.au_sync_published;s public.au_sync_submissions;r jsonb;data jsonb;l jsonb;starts jsonb;groups jsonb;curves jsonb;mode text;d numeric;ending numeric;i integer;g integer;prev_g integer:=-1;count_g integer:=0;at numeric;previous numeric:=-1;adjusted jsonb:='[]';new_id bigint;k text;begin
 perform public.au_maintenance_check_19('sync_studio');

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

 end if;raise exception 'Action inconnue.';end$function$;

CREATE OR REPLACE FUNCTION public.au_add_annotation(p_token text, p_song_key text, p_start_word integer, p_end_word integer, p_quote text, p_author_name text, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid; annotation uuid;

begin
 perform public.au_maintenance_check_19('annotations');

 v_id:=public.au_visitor(p_token);

 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));

 if (select count(*) from public.au_annotations where visitor_id=v_id and created_at>now()-interval '10 minutes')>=6 then

  raise exception 'Tu as publié plusieurs explications. Réessaie dans quelques minutes.';

 end if;

 insert into public.au_annotations(visitor_id,song_key,start_word,end_word,quote,author_name,body)

 values(v_id,p_song_key,p_start_word,p_end_word,btrim(p_quote),btrim(p_author_name),btrim(p_body)) returning id into annotation;

 return annotation;

end $function$;

CREATE OR REPLACE FUNCTION public.au_delete_annotation(p_token text, p_annotation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid;begin
 perform public.au_maintenance_check_19('annotations');

 if auth.uid() is not null then perform public.au_social_member();end if;

 select id into v_id from public.au_visitors where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');

 delete from public.au_annotations where id=p_annotation_id and visitor_id=v_id;return found;

end $function$;

CREATE OR REPLACE FUNCTION public.au_discovery_post_add(p_token text, p_kind text, p_track_key text, p_parent_id uuid, p_title text, p_body text, p_author_name text, p_source_url text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid; result uuid;

begin
 perform public.au_maintenance_check_19('decouvrir');

 if p_kind is null or p_kind not in ('story','wanted','contribution','report') then raise exception 'Type de publication invalide.'; end if;

 if p_parent_id is not null and (p_kind<>'contribution' or not exists(select 1 from public.au_discovery_posts where id=p_parent_id and kind='wanted')) then raise exception 'Cette recherche n’est plus disponible.'; end if;

 if char_length(btrim(coalesce(p_title,''))) not between 2 and 120 or char_length(btrim(coalesce(p_body,''))) not between 10 and 2000 or char_length(btrim(coalesce(p_author_name,''))) not between 2 and 24 then raise exception 'Vérifie le titre, le pseudo et le texte.'; end if;

 if p_source_url is null or char_length(p_source_url)>1500 or (p_source_url<>'' and p_source_url !~* '^https?://[^[:space:]]+$') then raise exception 'Ajoute un lien commençant par https:// ou laisse ce champ vide.'; end if;

 v_id:=public.au_visitor(p_token); perform public.au_discovery_rate(v_id,'post',10);

 insert into public.au_discovery_posts(visitor_id,kind,track_key,parent_id,title,body,author_name,source_url)

 values(v_id,p_kind,nullif(p_track_key,''),p_parent_id,btrim(p_title),btrim(p_body),btrim(p_author_name),p_source_url) returning id into result;

 return result;

end $function$;

CREATE OR REPLACE FUNCTION public.au_discovery_post_delete(p_token text, p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid;begin
 perform public.au_maintenance_check_19('decouvrir');

 if auth.uid() is not null then perform public.au_social_member();end if;

 select id into v_id from public.au_visitors where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex');

 delete from public.au_discovery_posts where id=p_post_id and visitor_id=v_id;return found;

end $function$;

CREATE OR REPLACE FUNCTION public.au_discovery_posts_list(p_kind text, p_token text DEFAULT ''::text, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('decouvrir');
 select q.value into result from (with viewer as (select id from public.au_visitors where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex')),

 entries as (select p.id,p.kind,p.track_key,p.parent_id,p.title,p.body,p.author_name,p.source_url,p.created_at,coalesce(p.visitor_id=(select id from viewer),false) as mine

 from public.au_discovery_posts p where p.hidden_at is null and (

 (p_kind='story' and p.kind='story') or (p_kind='archive' and p.kind in ('wanted','contribution')) or

 (p_kind='report' and p.kind='report' and p.visitor_id=(select id from viewer)))),

 page as (select * from entries order by created_at desc,id limit 25 offset greatest(0,least(coalesce(p_offset,0),100000)))

 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from entries))) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_discovery_rankings(p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('rankings');
 select q.value into result from (with viewer as (select id from public.au_visitors where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex')),

 entries as (select c.track_key,

 count(*) filter(where v.category='favorite')::integer as favorites,

 count(*) filter(where v.category='underrated')::integer as underrated,

 coalesce(bool_or(v.category='favorite' and v.visitor_id=(select id from viewer)),false) as my_favorite,

 coalesce(bool_or(v.category='underrated' and v.visitor_id=(select id from viewer)),false) as my_underrated

 from public.au_track_catalog c left join public.au_track_votes v using(track_key) group by c.track_key)

 select coalesce(jsonb_agg(to_jsonb(entries)),'[]'::jsonb) from entries) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_discovery_vote(p_token text, p_track_key text, p_category text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid; result jsonb;

begin
 perform public.au_maintenance_check_19('rankings');

 if p_category is null or p_category not in ('favorite','underrated') or p_active is null then raise exception 'Choix invalide.'; end if;

 if not exists(select 1 from public.au_track_catalog where track_key=p_track_key) then raise exception 'Ce morceau est introuvable.'; end if;

 v_id:=public.au_visitor(p_token);

 perform public.au_discovery_rate(v_id,'vote',120);

 if p_active then insert into public.au_track_votes(track_key,visitor_id,category) values(p_track_key,v_id,p_category) on conflict do nothing;

 else delete from public.au_track_votes where track_key=p_track_key and visitor_id=v_id and category=p_category; end if;

 select jsonb_build_object('track_key',p_track_key,'favorites',count(*) filter(where category='favorite'),'underrated',count(*) filter(where category='underrated'),

 'my_favorite',coalesce(bool_or(category='favorite' and visitor_id=v_id),false),'my_underrated',coalesce(bool_or(category='underrated' and visitor_id=v_id),false))

 into result from public.au_track_votes where track_key=p_track_key;

 return result;

end $function$;

CREATE OR REPLACE FUNCTION public.au_list_annotations(p_song_key text, p_token text DEFAULT ''::text, p_offset integer DEFAULT 0, p_sort text DEFAULT 'top'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('annotations');
 select q.value into result from (with viewer as (select id from public.au_visitors where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex')),

 entries as (

 select a.id,a.song_key,a.start_word,a.end_word,a.quote,a.author_name,a.body,a.created_at,

 coalesce(a.visitor_id=(select id from viewer),false) as mine,

 count(v.direction) filter(where v.direction=1)::integer as likes,

 count(v.direction) filter(where v.direction=-1)::integer as dislikes,

 coalesce(max(v.direction) filter(where v.visitor_id=(select id from viewer)),0) as my_vote

 from public.au_annotations a left join public.au_votes v on v.annotation_id=a.id

 where a.song_key=p_song_key and a.hidden_at is null group by a.id

 ), page as (

 select * from entries order by case when p_sort='top' then likes-dislikes else 0 end desc,created_at desc,id

 limit 50 offset greatest(0,least(coalesce(p_offset,0),100000))

 ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from entries))) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_lyrics_v12(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

#variable_conflict use_column

declare u uuid;result jsonb;s public.au_lyrics_contributions;c public.au_catalog;t jsonb;k text:=p->>'track';lyric_text text;v integer;idx integer;draft_idx integer;begin
 perform public.au_maintenance_check_19('lyrics_contributions');

 if p is null or octet_length(p::text)>200000 then raise exception 'Demande trop grande.';end if;

 u:=public.au_social_member();

 if p_action='submit' then

  if k is null or k!~'^[0-9]{1,3}:[0-9]{1,4}$' then raise exception 'Morceau invalide.';end if;

  select x into t from public.au_catalog c cross join lateral jsonb_array_elements(c.published->'tracks') x where c.number::text||':'||(x->>'number')=k;

  if t is null then raise exception 'Morceau introuvable.';end if;

  if btrim(coalesce(t->>'lyrics',''))<>'' or coalesce(t->'genius'->>'id','')<>'' then raise exception 'Ce morceau possède déjà des paroles.';end if;

  lyric_text:=btrim(p->>'body');if lyric_text is null or length(lyric_text) not between 1 and 40000 then raise exception 'Ajoute le texte complet, jusqu’à 40 000 caractères.';end if;

  perform public.au_social_rate(u,'lyrics-submit',10,86400);

  if exists(select 1 from public.au_lyrics_contributions where user_id=u and track_key=k and status='pending') then raise exception 'Ta contribution attend déjà une vérification.';end if;

  insert into public.au_lyrics_contributions(user_id,track_key,body) values(u,k,lyric_text) returning id into v;return to_jsonb(v);

 elsif p_action='mine' then

  select coalesce(jsonb_agg(to_jsonb(q) order by id desc),'[]') into result from (select id,track_key,status,note,created_at from public.au_lyrics_contributions where user_id=u order by id desc limit 100) q;return result;

 end if;

 if not public.au_can_review() then raise exception 'Accès réservé au créateur.';end if;

 if p_action='queue' then

  select coalesce(jsonb_agg(to_jsonb(q) order by id desc),'[]') into result from (select *,public.au_profile_public(user_id) author from public.au_lyrics_contributions order by id desc limit 100) q;return result;

 elsif p_action in ('approve','reject') then

  select * into s from public.au_lyrics_contributions where id=(p->>'id')::bigint for update;

  if s.id is null or s.status<>'pending' or s.revision is distinct from (p->>'revision')::integer then raise exception 'Cette contribution a déjà changé. Actualise la liste.';end if;

  if p_action='approve' then

   lyric_text:=btrim(p->>'body');if lyric_text is null or length(lyric_text) not between 1 and 40000 then raise exception 'Texte vide ou trop long.';end if;

   v:=split_part(s.track_key,':',1)::integer;perform pg_advisory_xact_lock(712830,v);

   select * into c from public.au_catalog where number=v for update;

   select x,(ord-1)::integer into t,idx from jsonb_array_elements(c.published->'tracks') with ordinality as q(x,ord) where x->>'number'=split_part(s.track_key,':',2);

   if t is null or btrim(coalesce(t->>'lyrics',''))<>'' or coalesce(t->'genius'->>'id','')<>'' then raise exception 'Les paroles du morceau ont changé. Vérifie sa fiche.';end if;

   select (ord-1)::integer into draft_idx from jsonb_array_elements(c.draft->'tracks') with ordinality as q(x,ord) where x->>'number'=split_part(s.track_key,':',2);

   if draft_idx is not null and (btrim(coalesce(c.draft->'tracks'->draft_idx->>'lyrics',''))<>'' or coalesce(c.draft->'tracks'->draft_idx->'genius'->>'id','')<>'') then raise exception 'Un brouillon contient déjà des paroles : termine d’abord cette modification.';end if;

   insert into public.au_catalog_history(number,document,actor) values(v,c.published,u);

   update public.au_catalog set published=jsonb_set(c.published,array['tracks',idx::text,'lyrics'],to_jsonb(lyric_text)),draft=case when draft_idx is null then c.draft else jsonb_set(c.draft,array['tracks',draft_idx::text,'lyrics'],to_jsonb(lyric_text)) end,revision=revision+1,updated_at=now() where number=v;

  end if;

  update public.au_lyrics_contributions set status=case when p_action='approve' then 'approved' else 'rejected' end,body=case when p_action='approve' then lyric_text else s.body end,note=left(coalesce(p->>'note',''),1000),revision=revision+1,reviewed_at=now() where id=s.id;

  return jsonb_build_object('ok',true,'track',s.track_key,'body',case when p_action='approve' then lyric_text else null end);

 end if;raise exception 'Action inconnue.';

end $function$;

CREATE OR REPLACE FUNCTION public.au_moderation_v12(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

#variable_conflict use_column

declare u uuid; target_user uuid; r jsonb; app public.au_applications; status_value text; reason_value text; minutes_value integer; end_time timestamptz; report_row public.au_social_reports; before_id bigint:=9223372036854775807; changed integer;

begin
 perform public.au_maintenance_check_19('moderation');

 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>12000 then raise exception 'Données invalides.';end if;

 u:=public.au_v12_confirmed();

 if p ? 'before' then before_id:=(p->>'before')::bigint;end if;

 if p_action='status' then

  select to_jsonb(x) into r from(select id,body,status,created_at,updated_at,admin_note from public.au_applications where user_id=u order by id desc limit 1) x;

  return jsonb_build_object('application',r,'notifications',(select coalesce(jsonb_agg(to_jsonb(n) order by n.id desc),'[]') from(select id,kind,body,created_at,read_at from public.au_member_notifications where user_id=u order by id desc limit 25)n),

   'creator',coalesce(public.au_is_creator(),false),'moderator',public.au_v12_moderator(u),

   'sanction',coalesce(public.au_v12_sanction(u),(select jsonb_build_object('kind','temporary','reason','Ce compte a été suspendu par l’administration.','until',banned_until) from auth.users where id=u and banned_until>now())));

 elsif p_action='notices_read' then

  if jsonb_typeof(p->'ids') is distinct from 'array' or jsonb_array_length(p->'ids')>50 then raise exception 'Notifications invalides.';end if;

  update public.au_member_notifications set read_at=coalesce(read_at,now()) where user_id=u and id in(select value::bigint from jsonb_array_elements_text(p->'ids'));return 'true';

 elsif p_action='delete_self' then

  if p->>'confirm' is distinct from 'SUPPRIMER' then raise exception 'Confirme la suppression définitive.';end if;

  reason_value:=coalesce(p->>'reason','');

  if reason_value not in ('technical','unused','privacy','community','other') or char_length(coalesce(p->>'details',''))>2000 then raise exception 'Complète le questionnaire de départ.';end if;

  perform public.au_v12_delete(u,u,'self',reason_value,btrim(coalesce(p->>'details','')));return 'true';

 end if;

 u:=public.au_social_member();
 if not public.au_has_permission(case when p_action in ('applications','application_status','application_delete') then 'applications' when p_action in ('reports','report_resolve') then 'reports' else 'members' end) then raise exception 'Accès exclusif au créateur ou autorisation requise.';end if;

 if p_action='applications' then

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]') into r from (select id,user_id,body,status,created_at,updated_at,admin_note,public.au_profile_public(user_id) profile from public.au_applications where id<before_id order by id desc limit 25)x;return r;

 elsif p_action in ('application_status','application_delete') then

  select * into app from public.au_applications where id=(p->>'id')::bigint for update;if not found then raise exception 'Candidature introuvable.';end if;

  if p_action='application_delete' then

   delete from public.au_applications where id=app.id;

   insert into public.au_moderation_audit(actor,target,action) values(u,app.user_id,'application:delete');return 'true';

  end if;

  status_value:=p->>'status';if status_value is null or status_value not in ('pending','accepted','rejected','deferred') or char_length(coalesce(p->>'note',''))>1000 then raise exception 'Statut ou note invalide.';end if;

  update public.au_applications set status=status_value,admin_note=btrim(coalesce(p->>'note','')) where id=app.id;

  insert into public.au_moderation_audit(actor,target,action) values(u,app.user_id,'application:'||status_value);return 'true';

 elsif p_action='members' then

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]') into r from(

   select a.id,coalesce(pr.nickname,a.raw_user_meta_data->>'nickname','Membre') nickname,coalesce(pr.avatar,'') avatar,a.email,a.created_at,

    au_private.creator_user(a.id) creator,exists(select 1 from public.au_moderators where user_id=a.id and active) moderator,

    public.au_v12_sanction(a.id) sanction

   from auth.users a left join public.au_profiles pr on pr.user_id=a.id

   where coalesce(pr.nickname,a.raw_user_meta_data->>'nickname','Membre') ilike '%'||left(coalesce(p->>'query',''),80)||'%' or a.email ilike '%'||left(coalesce(p->>'query',''),80)||'%'

   order by a.created_at desc,a.id limit 25 offset greatest(0,least(coalesce((p->>'offset')::integer,0),100000)))x;return r;

 elsif p_action in ('reports','report_resolve') then

  if p_action='report_resolve' then update public.au_social_reports set resolved=true where id=(p->>'id')::bigint;if not found then raise exception 'Signalement introuvable.';end if;return 'true';end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]') into r from (

   select r.id,r.kind,r.reference,r.snapshot,r.reason,r.created_at,r.subject,r.subject target_id,public.au_profile_public(r.reporter) profile,

    coalesce(public.au_profile_public(r.subject),(select jsonb_build_object('id',a.id,'nickname',coalesce(pr.nickname,a.raw_user_meta_data->>'nickname','Membre'),'avatar',coalesce(pr.avatar,'')) from auth.users a left join public.au_profiles pr on pr.user_id=a.id where a.id=r.subject)) target_profile,

    public.au_v12_sanction(r.subject) target_sanction

   from public.au_social_reports r where not resolved and id<before_id order by id desc limit 25)x;return r;

 elsif p_action='exit_feedback' then

  select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]') into r from(select id,source,reason,details,created_at from public.au_exit_feedback where id<before_id order by id desc limit 25)x;return r;

 elsif p_action in ('sanction','restore','delete_account','moderator_set') then

  target_user:=(p->>'id')::uuid;

  if target_user is null or target_user='e554cec4-e276-4b9e-bc46-6a569af4af3b'::uuid or exists(select 1 from public.au_account_roles where user_id=target_user and role='creator') then raise exception 'Le compte créateur est protégé.';end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user::text,12102));

  perform 1 from auth.users where id=target_user for update;if not found then raise exception 'Compte introuvable.';end if;

  if p_action='delete_account' then

   reason_value:=btrim(coalesce(p->>'reason',''));

   if p->>'confirm' is distinct from 'SUPPRIMER' or char_length(reason_value) not between 5 and 1000 then raise exception 'Confirme la suppression et indique son motif.';end if;

   perform public.au_v12_delete(target_user,u,'creator',reason_value,'');return 'true';

  elsif p_action='moderator_set' then

   if jsonb_typeof(p->'enabled') is distinct from 'boolean' then raise exception 'Choix invalide.';end if;

   if (p->>'enabled')::boolean then insert into public.au_moderators(user_id,granted_by) values(target_user,u) on conflict(user_id) do update set active=true;

   else update public.au_moderators set active=false where user_id=target_user;end if;

   insert into public.au_moderation_audit(actor,target,action) values(u,target_user,'moderator:'||(p->>'enabled'));return 'true';

  elsif p_action='restore' then

   delete from public.au_account_sanctions where user_id=target_user;

   update auth.users set banned_until=null where id=target_user;

   insert into public.au_member_notifications(user_id,kind,body) values(target_user,'sanction','Ton compte a été réactivé par le créateur.');

   insert into public.au_moderation_audit(actor,target,action) values(u,target_user,'sanction:restore');return 'true';

  end if;

  reason_value:=btrim(coalesce(p->>'reason',''));status_value:=p->>'kind';

  if char_length(reason_value) not between 5 and 1000 or status_value is null or status_value not in ('temporary','permanent') then raise exception 'Indique le type et le motif de la sanction.';end if;

  if p ? 'report_id' then

   select * into report_row from public.au_social_reports where id=(p->>'report_id')::bigint for update;

   if not found or report_row.subject is distinct from target_user then raise exception 'Le signalement ne concerne pas ce compte.';end if;

  end if;

  if status_value='temporary' then

   minutes_value:=(p->>'minutes')::integer;if minutes_value is null or minutes_value not between 1 and 5256000 then raise exception 'Choisis une durée entre 1 minute et 10 ans.';end if;

   end_time:=now()+make_interval(mins=>minutes_value);

  else end_time:=null;end if;

  insert into public.au_account_sanctions(user_id,kind,reason,ends_at,actor) values(target_user,status_value,reason_value,end_time,u)

   on conflict(user_id) do update set kind=excluded.kind,reason=excluded.reason,ends_at=excluded.ends_at,actor=excluded.actor,created_at=now();

  update auth.users set banned_until=coalesce(end_time,'9999-12-31 23:59:59+00'::timestamptz) where id=target_user;

  -- Revoke refresh sessions. Existing JWTs are rejected by all account write gates.

  delete from auth.sessions where user_id=target_user;

  insert into public.au_member_notifications(user_id,kind,body) values(target_user,'sanction',case when status_value='permanent' then 'Ton compte est banni. Motif : ' else 'Ton compte est suspendu temporairement. Motif : ' end||reason_value);

  insert into public.au_moderation_audit(actor,target,action,reason,ends_at) values(u,target_user,'sanction:'||status_value,reason_value,end_time);

  if p ? 'report_id' then update public.au_social_reports set resolved=true where id=report_row.id;end if;

  return 'true';

 end if;

 raise exception 'Action inconnue.';

end $function$;

CREATE OR REPLACE FUNCTION public.au_projects_19(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); item public.au_projects_19; identifier text:=p->>'id'; expected bigint:=(p->>'revision')::bigint;
begin
 perform public.au_maintenance_check_19('projects');
 if u is null then raise exception 'Connecte-toi pour synchroniser les projets.'; end if;
 if identifier is null or length(identifier) not between 1 and 100 then raise exception 'Projet invalide.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':'||identifier,1900));
 select * into item from public.au_projects_19 where user_id=u and id=identifier for update;
 if found and (expected is null or expected<>item.revision) then raise exception 'Le projet a changé sur un autre appareil. Choisis la version à conserver.';end if;
 if not found and expected is not null then raise exception 'Ce projet a été supprimé sur un autre appareil.';end if;
 if p_action='delete' then delete from public.au_projects_19 where user_id=u and id=identifier;return jsonb_build_object('deleted',true);end if;
 if p_action<>'save' then raise exception 'Action inconnue.';end if;
 insert into public.au_projects_19(user_id,id,project) values(u,identifier,p->'project')
 on conflict(user_id,id) do update set project=excluded.project,revision=au_projects_19.revision+1,updated_at=now() returning * into item;
 return jsonb_build_object('revision',item.revision,'updatedAt',item.updated_at);
end $function$;

CREATE OR REPLACE FUNCTION public.au_repertoire(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid;k text:=p->>'track';d text;old_value text;nick text;r jsonb;before_id bigint:=9223372036854775807;test_date date;begin
 perform public.au_maintenance_check_19('repertoire');

 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>5000 then raise exception 'Demande invalide.';end if;

 if p ? 'before' then before_id:=(p->>'before')::bigint;end if;

 if p_action='list' then

  select coalesce(jsonb_agg(jsonb_build_object('track',track_key,'date',date_text,'nickname',nickname,'updated_at',updated_at)),'[]') into r from public.au_song_dates;return r;

 elsif p_action in ('history','journal') then

  if p_action='journal' then perform public.au_v12_owner();end if;

  select coalesce(jsonb_agg(to_jsonb(q) order by id desc),'[]') into r from(select id,track_key,old_date,new_date,nickname,created_at,case when p_action='journal' then user_id else null end user_id from public.au_song_date_history where id<before_id and (p_action='journal' or track_key=k) order by id desc limit 50)q;return r;

 elsif p_action='set' then

  u:=public.au_social_member();

  if k is null or not exists(select 1 from public.au_catalog c cross join lateral jsonb_array_elements(c.published->'tracks')t where c.number::text||':'||(t->>'number')=k) then raise exception 'Morceau introuvable.';end if;

  d:=btrim(coalesce(p->>'date',''));

  if d<>'' then

   if d!~'^(19[0-9]{2}|20[0-9]{2})(-(0[1-9]|1[0-2]))?(-(0[1-9]|[12][0-9]|3[01]))?$' or length(d) not in (4,7,10) then raise exception 'Utilise une année, AAAA-MM ou AAAA-MM-JJ.';end if;

   begin test_date:=(d||case length(d) when 4 then '-01-01' when 7 then '-01' else '' end)::date;exception when others then raise exception 'Cette date n’existe pas.';end;

  end if;

  perform public.au_social_rate(u,'repertoire-edit',120,3600);

  perform pg_advisory_xact_lock(hashtextextended(k,1313));

  select date_text into old_value from public.au_song_dates where track_key=k for update;old_value:=coalesce(old_value,'');

  if old_value=d then return jsonb_build_object('unchanged',true);end if;

  nick:=coalesce(public.au_profile_public(u)->>'nickname','Membre');

  insert into public.au_song_dates(track_key,date_text,user_id,nickname) values(k,d,u,nick) on conflict(track_key) do update set date_text=excluded.date_text,user_id=excluded.user_id,nickname=excluded.nickname,updated_at=now();

  insert into public.au_song_date_history(track_key,old_date,new_date,user_id,nickname) values(k,old_value,d,u,nick);

  return jsonb_build_object('ok',true);

 end if;raise exception 'Action inconnue.';

end $function$;

CREATE OR REPLACE FUNCTION public.au_social(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare r jsonb;begin
 perform public.au_maintenance_check_19(case when p_action in ('send','thread','read','inbox','block','blocked') then 'messages' when p_action in ('comments','comment_add','comment_hide') then 'comments' when p_action in ('profile_save','theme') then 'profile_edit' when p_action in ('profile','members') then 'profiles' else 'communaute' end);

 if p_action='send' and exists(select 1 from public.au_presence where user_id in(auth.uid(),(p->>'peer')::uuid) and state='dnd') then raise exception 'Les messages privés sont bloqués en mode Ne pas déranger.';end if;

 r:=public.au_social_before_17(p_action,p);

 if p_action='thread' and exists(select 1 from public.au_presence where user_id in(auth.uid(),(p->>'peer')::uuid) and state='dnd') then r:=r||jsonb_build_object('can_send',false);end if;

 return r;end$function$;

CREATE OR REPLACE FUNCTION public.au_stats_view_17v01(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid; a timestamptz:=(p->>'start')::timestamptz; b timestamptz:=(p->>'end')::timestamptz;

begin
 perform public.au_maintenance_check_19('statistiques');

 u:=public.au_social_member();

 if a is null or b is null or a>=b or b>((a at time zone 'Europe/Paris')+interval '1 year') at time zone 'Europe/Paris' or a<'2025-12-31T23:00:00Z' then raise exception 'Période invalide.';end if;

 return public.au_stats_comparable_17v01(u,a,b,coalesce(p->>'kind','programmed'));

end$function$;

CREATE OR REPLACE FUNCTION public.au_summary_access_17v01(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid; s public.au_summaries_17v01; a text:=p->>'action'; target uuid; decision text; changed_count integer;

begin
 perform public.au_maintenance_check_19('summaries');

 u:=public.au_social_member();

 if a='mine' then

  perform public.au_summary_ensure_17v01(u);

  return jsonb_build_object('summaries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'year',summary_year,'start',period_start,'end',period_end,'revealAt',reveal_at,'publicListing',public_listing) order by period_end desc) from public.au_summaries_17v01 where owner_id=u and reveal_at<=now()),'[]'::jsonb));

 end if;

 select * into s from public.au_summaries_17v01 where id=(p->>'summaryId')::uuid and reveal_at<=now();

 if not found then raise exception 'Résumé indisponible.';end if;

 if a='read' then

  if s.owner_id<>u and not exists(select 1 from public.au_summary_grants_17v01 where summary_id=s.id and viewer_id=u and state='accepted') then raise exception 'Autorisation individuelle requise.';end if;

  return jsonb_build_object('id',s.id,'year',s.summary_year,'kind',s.kind,'snapshot',s.snapshot);

 elsif a='request' then

  if not s.public_listing or s.owner_id=u then raise exception 'Demande indisponible.';end if;

  insert into public.au_summary_grants_17v01(summary_id,viewer_id) values(s.id,u)

   on conflict(summary_id,viewer_id) do update set state='pending',requested_at=now(),decided_at=null

   where au_summary_grants_17v01.state in ('refused','revoked') and au_summary_grants_17v01.requested_at<now()-interval '1 day';

  get diagnostics changed_count=row_count;

  if changed_count>0 then insert into public.au_member_notifications(user_id,kind,body) values(s.owner_id,'summary_access','Une demande d’accès individuel à votre résumé '+s.summary_year+' est disponible dans Statistiques et résumés.');end if;

  return jsonb_build_object('ok',true);

 elsif a in ('decide','requests','visibility') then

  if s.owner_id<>u then raise exception 'Décision réservée au propriétaire du résumé.';end if;

  if a='requests' then

   return jsonb_build_object('requests',coalesce((select jsonb_agg(jsonb_build_object('viewerId',g.viewer_id,'viewerName',coalesce((select nickname from public.au_profiles where user_id=g.viewer_id),'Membre'),'state',g.state,'requestedAt',g.requested_at,'decidedAt',g.decided_at)) from public.au_summary_grants_17v01 g where g.summary_id=s.id),'[]'::jsonb));

  elsif a='visibility' then

   if s.kind<>'annual' then raise exception 'Classement réservé aux résumés annuels.';end if;

   if s.summary_year=2026 and coalesce((p->>'public')::boolean,false) then raise exception '2026 : édition privée de test.';end if;

   update public.au_summaries_17v01 set public_listing=coalesce((p->>'public')::boolean,false) where id=s.id;

  else

   target:=(p->>'viewerId')::uuid;decision:=p->>'decision';

   if decision not in ('accepted','refused','revoked') or decision is null then raise exception 'Décision invalide.';end if;

   update public.au_summary_grants_17v01 set state=decision,decided_at=now() where summary_id=s.id and viewer_id=target;

   if not found then raise exception 'Demande inexistante.';end if;

  end if;

  return jsonb_build_object('ok',true);

 end if;

 raise exception 'Action inconnue.';

end$function$;

CREATE OR REPLACE FUNCTION public.au_summary_plan_17v01(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid:=public.au_social_member();a timestamptz;b timestamptz;g timestamptz;sid uuid;

begin
 perform public.au_maintenance_check_19('summaries');

 if p->>'action'='list' then return jsonb_build_object('plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'start',period_start,'end',period_end,'generateAt',generate_at,'summaryId',summary_id) order by generate_at) from public.au_summary_schedules_17v01 where owner_id=u),'[]'::jsonb));end if;

 a:=(p->>'start')::timestamptz;b:=(p->>'end')::timestamptz;g:=(p->>'generateAt')::timestamptz;

 if a is null or b is null or g is null or a>=b or g<b or g<now() or a<'2025-12-31T23:00:00Z' or b>((a at time zone 'Europe/Paris')+interval '6 months') at time zone 'Europe/Paris' then raise exception 'Période ou date de génération invalide : six mois calendaires maximum.';end if;

 if (select count(*) from public.au_summary_schedules_17v01 where owner_id=u and summary_id is null)>=24 then raise exception '24 résumés sont déjà en attente.';end if;

 insert into public.au_summary_schedules_17v01(owner_id,period_start,period_end,generate_at) values(u,a,b,g) returning id into sid;

 return jsonb_build_object('id',sid);

end$function$;

CREATE OR REPLACE FUNCTION public.au_summary_profile_17v01(p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('summaries');
 select q.value into result from (select jsonb_build_object('summaries',coalesce(jsonb_agg(jsonb_build_object('id',id,'year',summary_year,'kind',kind,'start',period_start,'end',period_end) order by summary_year desc),'[]'::jsonb))

 from public.au_summaries_17v01 where owner_id=p_owner and public_listing and summary_year>=2027 and reveal_at<=now()) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_sync(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; s public.au_sync_submissions; v public.au_sync_published; src jsonb; data jsonb; result jsonb; new_id bigint; k text;
begin
 perform public.au_maintenance_check_19(case when p_action in ('source','submit') then 'sync_studio' when p_action in ('published','list') then 'paroles' when p_action in ('review','approve','reject') then 'moderation' else 'sync_studio' end);
 if p is null or octet_length(p::text)>1500000 then raise exception 'Contribution trop volumineuse.';end if;
 if p_action='submit' and p ? 'studio_data' then
  u:=public.au_social_member();k:=p->>'track';
  src:=public.au_sync_source(k);
  if src->>'hash' is distinct from p->>'hash' then raise exception 'Les paroles source ont changé. Recharge le morceau.';end if;
  data:=au_private.studio_validate_19(p->'studio_data');
  if p ? 'correction_of' and p->>'correction_of' is not null then
   perform pg_advisory_xact_lock(hashtextextended(k,2061));select * into v from public.au_sync_published where track_key=k for update;
   if not found or v.submission_id is distinct from (p->>'correction_of')::bigint then raise exception 'La synchronisation publique a changé.';end if;
  end if;
  perform public.au_social_rate(u,'sync-studio-19',30,86400);
  insert into public.au_sync_submissions(user_id,track_key,source_hash,lines,times,duration,status,curves,sync_mode,end_time,correction_of,studio_data)
  values(u,k,p->>'hash',data->'lines',data->'times',(data->>'duration')::numeric,'pending',case when data->>'sync_mode'='highlight' then data->'curves' end,data->>'sync_mode',(data->>'end_time')::numeric,(p->>'correction_of')::bigint,data) returning id into new_id;
  return jsonb_build_object('id',new_id,'status','pending');
 end if;
 if p_action in ('approve','review') then
  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint;
  if s.studio_data is not null then
   u:=public.au_social_member();if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
   if p_action='review' then return to_jsonb(s)||s.studio_data||jsonb_build_object('source',jsonb_build_object('lines',s.lines,'hash',s.source_hash));end if;
   select * into s from public.au_sync_submissions where id=s.id for update;
   if s.status<>'pending' or s.revision is distinct from (p->>'revision')::integer then raise exception 'La proposition a changé.';end if;
   perform pg_advisory_xact_lock(hashtextextended(s.track_key,2061));
   if s.correction_of is not null then select * into v from public.au_sync_published where track_key=s.track_key for update;if not found or v.submission_id is distinct from s.correction_of then raise exception 'La synchronisation publique a changé.';end if;
   else src:=public.au_sync_source(s.track_key);if src->>'hash' is distinct from s.source_hash then raise exception 'Les paroles source ont changé.';end if;end if;
   data:=au_private.studio_validate_19(coalesce(p->'studio_data',s.studio_data));
   update public.au_sync_submissions set status='approved',lines=data->'lines',times=data->'times',curves=case when data->>'sync_mode'='highlight' then data->'curves' end,sync_mode=data->>'sync_mode',duration=(data->>'duration')::numeric,end_time=(data->>'end_time')::numeric,studio_data=data,reviewed_at=now(),note=left(coalesce(p->>'note',''),1000) where id=s.id;
   insert into public.au_sync_published(track_key,source_hash,lines,times,duration,submission_id,curves,sync_mode,end_time,studio_data)
   values(s.track_key,s.source_hash,data->'lines',data->'times',(data->>'duration')::numeric,s.id,case when data->>'sync_mode'='highlight' then data->'curves' end,data->>'sync_mode',(data->>'end_time')::numeric,data)
   on conflict(track_key) do update set source_hash=excluded.source_hash,lines=excluded.lines,times=excluded.times,duration=excluded.duration,submission_id=excluded.submission_id,curves=excluded.curves,sync_mode=excluded.sync_mode,end_time=excluded.end_time,studio_data=excluded.studio_data,line_groups=null,block_times=null,revision=au_sync_published.revision+1,updated_at=now();
   return jsonb_build_object('published',true,'submission_id',s.id);
  end if;
 end if;
 if p_action='published' then
  select * into v from public.au_sync_published where track_key=p->>'track';
  if v.studio_data is not null then return v.studio_data||jsonb_build_object('track',v.track_key,'submission_id',v.submission_id);end if;
 end if;
 result:=public.au_sync_before_19(p_action,p);
 -- A legacy correction must not leave obsolete multipiste metadata on its published row.
 if p_action='approve' then update public.au_sync_published set studio_data=null where submission_id=(p->>'id')::bigint;end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.au_sync_files_api(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('sync_files');
 select q.value into result from (select au_private.sync_files_17v06(p_action,p)) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_sync_genius(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid;t jsonb;k text:=p->>'track';txt text:=btrim(p->>'text');begin
 perform public.au_maintenance_check_19('sync_studio');

 u:=public.au_social_member();

 if p_action<>'prepare' or p is null or octet_length(p::text)>200000 then raise exception 'Demande invalide.';end if;

 select x into t from public.au_catalog c cross join lateral jsonb_array_elements(c.published->'tracks')x where c.number::text||':'||(x->>'number')=k;

 if t is null or coalesce(t->'genius'->>'id','')='' then raise exception 'Aucun widget Genius relié.';end if;

 if txt is null or length(txt) not between 1 and 40000 or jsonb_array_length(public.au_lyric_lines(txt)) not between 1 and 600 then raise exception 'Le widget ne contient pas de texte exploitable.';end if;

 perform public.au_social_rate(u,'genius-sync-prepare',30,3600);

 -- Imported widget text is untrusted contribution input, never automatic publication.

 insert into public.au_genius_sync_text(track_key,genius_id,body,contributor) values(k,t->'genius'->>'id',txt,u) on conflict(track_key) do update set genius_id=excluded.genius_id,body=excluded.body,contributor=excluded.contributor,created_at=now() where au_genius_sync_text.genius_id<>excluded.genius_id;

 return public.au_sync_source(k);

end $function$;

CREATE OR REPLACE FUNCTION public.au_sync_lines_v11(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

#variable_conflict use_column

declare u uuid;src jsonb;r jsonb;s public.au_sync_submissions;k text:=p->>'track';n bigint;begin
 perform public.au_maintenance_check_19(case when p_action='published' then 'paroles' when p_action in ('source','submit','mine') then 'sync_studio' else 'moderation' end);

 if octet_length(p::text)>100000 then raise exception 'Demande trop grande.';end if;

 if p_action='published' then

  src:=public.au_sync_source(k);

  select jsonb_build_object('lines',v.lines,'times',v.times,'duration',v.duration,'hash',v.source_hash,'revision',v.revision) into r from public.au_sync_published v where v.track_key=k and v.source_hash=src->>'hash';return coalesce(r,'null');

 end if;

 u:=public.au_social_member();

 if p_action in ('source','submit') then

  if not public.au_feature_allowed('sync_studio') then raise exception 'Cet atelier est actuellement en avant-première.';end if;

  src:=public.au_sync_source(k);

  if jsonb_array_length(src->'lines')=0 then raise exception 'Le créateur doit d’abord enregistrer les paroles dans la fiche du morceau.';end if;

  if p_action='source' then return src;end if;

  if p->>'hash' is distinct from src->>'hash' then raise exception 'Les paroles ont changé. Recharge l’atelier.';end if;

  perform public.au_sync_validate(src->'lines',p->'times',(p->>'duration')::numeric);

  perform public.au_social_rate(u,'sync-submit',10,86400);

  if exists(select 1 from public.au_sync_submissions where user_id=u and track_key=k and status='pending') then raise exception 'Tu as déjà une proposition en attente pour ce morceau.';end if;

  insert into public.au_sync_submissions(user_id,track_key,source_hash,lines,times,duration) values(u,k,src->>'hash',src->'lines',p->'times',(p->>'duration')::numeric) returning id into n;return to_jsonb(n);

 elsif p_action='mine' then

  select coalesce(jsonb_agg(to_jsonb(q) order by q.id desc),'[]') into r from (select id,track_key,status,note,created_at,reviewed_at from public.au_sync_submissions where user_id=u order by id desc limit 100) q;return r;

 end if;

 if not public.au_can_review() then raise exception 'Accès réservé au créateur.';end if;

 if p_action='queue' then

  select coalesce(jsonb_agg(to_jsonb(q) order by q.id desc),'[]') into r from (select id,track_key,status,revision,created_at,public.au_profile_public(user_id) author from public.au_sync_submissions order by id desc limit 100) q;return r;

 elsif p_action='review' then

  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint;if s.id is null then raise exception 'Proposition introuvable.';end if;

  src:=public.au_sync_source(s.track_key);return to_jsonb(s)||jsonb_build_object('source',src,'author',public.au_profile_public(s.user_id));

 elsif p_action in ('approve','reject') then

  select * into s from public.au_sync_submissions where id=(p->>'id')::bigint for update;

  if s.id is null or s.status<>'pending' or s.revision is distinct from (p->>'revision')::integer then raise exception 'Cette proposition a changé ou a déjà été traitée. Actualise la liste.';end if;

  if p_action='approve' then

   perform pg_advisory_xact_lock(hashtextextended(s.track_key,2061));src:=public.au_sync_source(s.track_key);

   if s.source_hash<>src->>'hash' then raise exception 'Les paroles ont changé. Demande une nouvelle contribution.';end if;

   perform public.au_sync_validate(src->'lines',p->'times',s.duration);

   insert into public.au_sync_published(track_key,source_hash,lines,times,duration,submission_id) values(s.track_key,s.source_hash,s.lines,p->'times',s.duration,s.id) on conflict(track_key) do update set source_hash=excluded.source_hash,lines=excluded.lines,times=excluded.times,duration=excluded.duration,submission_id=excluded.submission_id,revision=au_sync_published.revision+1,updated_at=now();

  end if;

  update public.au_sync_submissions set status=case when p_action='approve' then 'approved' else 'rejected' end,times=case when p_action='approve' then p->'times' else times end,note=left(coalesce(p->>'note',''),1000),revision=revision+1,reviewed_at=now() where id=s.id;

  return 'true';

 elsif p_action='unpublish' then

  delete from public.au_sync_published where track_key=k;return 'true';

 end if;raise exception 'Action inconnue.';end $function$;

CREATE OR REPLACE FUNCTION public.au_sync_moderation(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; f public.au_sync_files; data jsonb; src jsonb; k text; identifier bigint; result jsonb;
begin
 perform public.au_maintenance_check_19('moderation');
 if p_action='publish_file' and p->'data' ? 'line_ends' then
  u:=public.au_social_member();if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
  if p is null or octet_length(p::text)>1500000 or p->>'kind'<>'file' or (p->>'review_complete')::boolean is distinct from true then raise exception 'Termine la prévisualisation avant d’approuver.';end if;
  select * into f from public.au_sync_files where id=(p->>'id')::bigint for update;
  if not found or f.status='uploading' or f.revision is distinct from (p->>'revision')::integer then raise exception 'Le fichier a changé. Actualise la vérification.';end if;
  k:=p->>'track';src:=public.au_sync_source(k);data:=au_private.studio_validate_19(p->'data');
  perform pg_advisory_xact_lock(hashtextextended(k,2061));
  insert into public.au_sync_submissions(user_id,track_key,source_hash,lines,times,duration,status,note,reviewed_at,curves,sync_mode,end_time,studio_data,source_file_id)
  values(f.user_id,k,src->>'hash',data->'lines',data->'times',(data->>'duration')::numeric,'approved',left(coalesce(p->>'note',''),1000),now(),case when data->>'sync_mode'='highlight' then data->'curves' end,data->>'sync_mode',(data->>'end_time')::numeric,data,f.id) returning id into identifier;
  insert into public.au_sync_published(track_key,source_hash,lines,times,duration,submission_id,curves,sync_mode,end_time,studio_data)
  values(k,src->>'hash',data->'lines',data->'times',(data->>'duration')::numeric,identifier,case when data->>'sync_mode'='highlight' then data->'curves' end,data->>'sync_mode',(data->>'end_time')::numeric,data)
  on conflict(track_key) do update set source_hash=excluded.source_hash,lines=excluded.lines,times=excluded.times,duration=excluded.duration,submission_id=excluded.submission_id,curves=excluded.curves,sync_mode=excluded.sync_mode,end_time=excluded.end_time,studio_data=excluded.studio_data,line_groups=null,block_times=null,revision=au_sync_published.revision+1,updated_at=now();
  update public.au_sync_files set status='accepted',track_key=k,published_submission_id=identifier,note=left(coalesce(p->>'note',''),1000),reviewer=u,reviewed_at=now(),revision=revision+1 where id=f.id;
  return jsonb_build_object('published',true,'submission_id',identifier,'track',k);
 end if;
 result:=public.au_sync_moderation_before_19(p_action,p);
 if p_action='publish_file' then update public.au_sync_published set studio_data=null where submission_id=(result->>'submission_id')::bigint;end if;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.au_track_share_17v06(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('sharing');
 select q.value into result from (select au_private.track_share_17v06(p_action,p)) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_trophy_collection_17v01(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare u uuid:=public.au_social_member();chosen jsonb:=coalesce(p->'selected','[]'::jsonb);wanted integer;found_count integer;

begin
 perform public.au_maintenance_check_19('trophies');

 if p->>'action'='exhibit' then

  if jsonb_typeof(chosen)<>'array' or octet_length(chosen::text)>100000 then raise exception 'Sélection invalide.';end if;

  select count(distinct value) into wanted from jsonb_array_elements_text(chosen);

  select count(*) into found_count from public.au_trophy_awards_17v01 where owner_id=u and year>=2027 and awarded_at<=now() and chosen ? (details->>'id');

  if found_count<>wanted then raise exception 'Seuls les trophées obtenus de 2027 et des années suivantes sont exposables.';end if;

  update public.au_trophy_awards_17v01 set exhibited=chosen ? (details->>'id') where owner_id=u and year>=2027 and awarded_at<=now();

 end if;

 return jsonb_build_object('trophies',coalesce((select jsonb_agg(details||jsonb_build_object('exhibited',exhibited,'awardedAt',awarded_at) order by year desc,family,level) from public.au_trophy_awards_17v01 where owner_id=u and awarded_at<=now()),'[]'::jsonb));

end$function$;

CREATE OR REPLACE FUNCTION public.au_trophy_profile_17v01(p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; begin
 perform public.au_maintenance_check_19('trophies');
 select q.value into result from (select jsonb_build_object('trophies',coalesce(jsonb_agg(jsonb_build_object('id',details->>'id','name',details->>'name','year',year,'rarity',details->>'rarity','threshold',details->'threshold','unit',details->>'unit','awardedAt',awarded_at) order by year desc,level desc),'[]'::jsonb)) from public.au_trophy_awards_17v01 where owner_id=p_owner and year>=2027 and exhibited and awarded_at<=now()) q(value);
 return result;
 end $function$;

CREATE OR REPLACE FUNCTION public.au_vote_annotation(p_token text, p_annotation_id uuid, p_direction integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$

declare v_id uuid; result jsonb;

begin
 perform public.au_maintenance_check_19('annotations');

 if p_direction not in (-1,0,1) or p_direction is null then raise exception 'Vote invalide.'; end if;

 v_id:=public.au_visitor(p_token);

 perform id from public.au_annotations where id=p_annotation_id for update;

 if not found then raise exception 'Cette explication a été supprimée.'; end if;

 if p_direction=0 then delete from public.au_votes where annotation_id=p_annotation_id and visitor_id=v_id;

 else insert into public.au_votes(annotation_id,visitor_id,direction) values(p_annotation_id,v_id,p_direction)

 on conflict(annotation_id,visitor_id) do update set direction=excluded.direction; end if;

 select jsonb_build_object('likes',count(*) filter(where direction=1),'dislikes',count(*) filter(where direction=-1),'my_vote',p_direction)

 into result from public.au_votes where annotation_id=p_annotation_id;

 return result;

end $function$;

create policy projects_19_maintenance on public.au_projects_19 as restrictive for all to authenticated
using (public.au_maintenance_check_19('projects')) with check (public.au_maintenance_check_19('projects') and public.au_maintenance_check_19('sync_studio'));
