begin;
create or replace function public.au_stats_record_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; item jsonb; k text; d jsonb; at_time timestamptz; eid uuid; accepted integer:=0; tracking timestamptz; seconds numeric;
begin
 u:=public.au_social_member();
 if p is null or jsonb_typeof(p)<>'array' or jsonb_array_length(p)>100 or octet_length(p::text)>100000 then raise exception 'Lot de statistiques invalide.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,1701));
 insert into public.au_stats_tracking_17v01(user_id) values(u) on conflict(user_id) do nothing;
 select started_at into tracking from public.au_stats_tracking_17v01 where user_id=u;
 if (select count(*) from public.au_stats_events_17v01 where user_id=u and received_at>now()-interval '1 minute')>300 then raise exception 'Trop de mesures. Réessayer ultérieurement.';end if;
 for item in select value from jsonb_array_elements(p) loop
  eid:=(item->>'id')::uuid;k:=item->>'kind';at_time:=(item->>'at')::timestamptz;
  if at_time is null or at_time>now()+interval '30 seconds' or at_time<greatest(tracking-interval '30 seconds',now()-interval '48 hours') then raise exception 'Date de mesure invalide.';end if;
  if exists(select 1 from public.au_stats_events_17v01 where user_id=u and event_id=eid) then continue;end if;
  if k not in ('listening','track_start','track_end','session','login','section','function','usage','blind_round','blind_game','sync_start','sync_finish','sync_abandon') or k is null then raise exception 'Type de mesure invalide.';end if;
  -- Retain only documented metadata. No messages, annotations or lyrics bodies.
  d:=coalesce(item->'details','{}'::jsonb);
  if jsonb_typeof(d)<>'object' then raise exception 'Mesure invalide.';end if;
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into d from jsonb_each(d)
   where key in ('trackKey','volume','duration','seconds','startPosition','endPosition','sessionId','playbackId','gameId','difficulty','correct','responseMs','round','rounds','score','section','function','platform','completed','playlistId');
  if k='usage' and (jsonb_typeof(d->'seconds') is distinct from 'number' or (d->>'seconds')::numeric<=0 or (d->>'seconds')::numeric>35) then raise exception 'Durée d’utilisation invalide.';end if;
  if k in ('listening','track_start','track_end','blind_round','sync_start','sync_finish','sync_abandon') and coalesce(d->>'trackKey','')!~'^[0-9]+:[0-9]+$' then raise exception 'Morceau de mesure invalide.';end if;
  if k='blind_round' and (jsonb_typeof(d->'correct') is distinct from 'boolean' or jsonb_typeof(d->'responseMs') is distinct from 'number' or (d->>'responseMs')::numeric<0 or (d->>'responseMs')::numeric='NaN'::numeric or coalesce(d->>'difficulty','') not in ('easy','medium','hard')) then raise exception 'Réponse de Blind Test invalide.';end if;
  if k='blind_game' and (jsonb_typeof(d->'score') is distinct from 'number' or jsonb_typeof(d->'rounds') is distinct from 'number' or (d->>'score')::numeric<0 or (d->>'score')::numeric>(d->>'rounds')::numeric or (d->>'rounds')::numeric<>trunc((d->>'rounds')::numeric)) then raise exception 'Bilan de Blind Test invalide.';end if;
  if k='listening' then
   seconds:=(d->>'seconds')::numeric;
   if seconds is null or seconds<=0 or seconds>35 or seconds='NaN'::numeric or not(d ?& array['trackKey','startPosition','endPosition']) or (d->>'startPosition')::numeric is null or (d->>'endPosition')::numeric is null or (d->>'startPosition')::numeric<0 or (d->>'startPosition')::numeric='NaN'::numeric or (d->>'endPosition')::numeric='NaN'::numeric or (d->>'endPosition')::numeric<=(d->>'startPosition')::numeric then raise exception 'Durée d’écoute invalide.';end if;
   -- Concurrent devices cannot claim the same listening interval twice.
   if exists(select 1 from public.au_stats_events_17v01 e where e.user_id=u and e.kind='listening' and e.happened_at>at_time-make_interval(secs=>seconds::double precision) and e.happened_at-make_interval(secs=>(e.details->>'seconds')::double precision)<at_time) then continue;end if;
  end if;
  insert into public.au_stats_events_17v01(user_id,event_id,kind,happened_at,details) values(u,eid,k,at_time,d);
  accepted:=accepted+1;
 end loop;
 return jsonb_build_object('accepted',accepted,'trackingSince',tracking);
end$$;
create or replace function public.au_summary_generate_17v01(p_owner uuid,p_kind text,p_start timestamptz,p_end timestamptz,p_reveal timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid;y integer:=extract(year from p_start at time zone 'Europe/Paris')::integer;facts jsonb;trophy jsonb;
begin
 if p_end>now() or p_reveal>now() then raise exception 'La période n’est pas terminée.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,1702));
 select id into sid from public.au_summaries_17v01 where owner_id=p_owner and kind=p_kind and period_start=p_start and period_end=p_end;
 if sid is not null then return sid;end if;
 facts:=public.au_stats_comparable_17v01(p_owner,p_start,p_end,p_kind)||jsonb_build_object('schemaVersion','17V01','kind',p_kind,'year',y);
 if p_kind='annual' then
  for trophy in select value from jsonb_array_elements(facts->'trophies') where value->>'earned'='true' loop
   insert into public.au_trophy_awards_17v01(owner_id,year,family,level,details,awarded_at) values(p_owner,y,trophy->>'family',(trophy->>'level')::integer,trophy,p_reveal) on conflict do nothing;
  end loop;
 end if;
 facts:=facts||jsonb_build_object('trophyCollection',coalesce((select jsonb_agg(details||jsonb_build_object('exhibited',exhibited,'awardedAt',awarded_at)) from public.au_trophy_awards_17v01 where owner_id=p_owner and awarded_at<=p_reveal),'[]'::jsonb));
 insert into public.au_summaries_17v01(owner_id,kind,summary_year,period_start,period_end,reveal_at,snapshot) values(p_owner,p_kind,y,p_start,p_end,p_reveal,facts) returning id into sid;
 insert into public.au_member_notifications(user_id,kind,body) values(p_owner,'summary','Un nouveau résumé personnel est disponible dans Statistiques et résumés.');
 return sid;
end$$;
notify pgrst,'reload schema';
commit;
