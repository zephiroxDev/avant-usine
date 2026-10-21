create or replace function public.au_paused_client_20(headers jsonb) returns boolean language sql immutable security invoker set search_path='' as $$
select case
 when lower(coalesce(headers->>'origin','')) in ('https://zephiroxdev.github.io','capacitor://localhost') then false
 when lower(coalesce(headers->>'origin','')) in ('avantusine://local','https://localhost','http://localhost') then true
 when lower(coalesce(headers->>'user-agent','')) like '%electron/%' then true
 when lower(coalesce(headers->>'user-agent','')) like 'avantusineps4-native/%' then true
 else false end;
$$;
revoke all on function public.au_paused_client_20(jsonb) from public;
grant execute on function public.au_paused_client_20(jsonb) to anon,authenticated,service_role;
create or replace function public.au_platform_pause_20() returns void language plpgsql security invoker set search_path='' as $$
begin
 if public.au_paused_client_20(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb)
 and coalesce(current_setting('request.path',true),'') !~ '(^|/)rpc/au_maintenance_19$'
 then raise sqlstate 'PT503' using message='Application temporairement en pause. Les sites et l’application iPhone et iPad restent disponibles.';
 end if;
end $$;
revoke all on function public.au_platform_pause_20() from public;
grant execute on function public.au_platform_pause_20() to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.au_maintenance_19(p_action text, p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if public.au_paused_client_20(coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb) then
 result := result || jsonb_build_object('all',jsonb_build_object('closed',true,'message','Les applications Windows, Android et PS4 sont temporairement en pause. Utilise le site ou l’application iPhone et iPad.'));
 end if;
 return jsonb_build_object('settings',result);
end $function$

;
do $$ begin
 if not public.au_paused_client_20('{"origin":"avantusine://local"}') then raise exception 'Windows guard failed';end if;
 if not public.au_paused_client_20('{"origin":"https://localhost"}') then raise exception 'Android guard failed';end if;
 if not public.au_paused_client_20('{"user-agent":"AvantUsinePS4-native/1.0"}') then raise exception 'PS4 guard failed';end if;
 if public.au_paused_client_20('{"origin":"capacitor://localhost"}') then raise exception 'iOS blocked';end if;
 if public.au_paused_client_20('{"origin":"https://zephiroxdev.github.io","user-agent":"Mozilla Android"}') then raise exception 'Website blocked';end if;
 if public.au_paused_client_20('{}') then raise exception 'Backend blocked';end if;
end $$;
alter role authenticator set pgrst.db_pre_request='public.au_platform_pause_20';
notify pgrst,'reload config';
notify pgrst,'reload schema';

