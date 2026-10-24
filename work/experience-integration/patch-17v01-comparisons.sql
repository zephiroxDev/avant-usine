begin;
create or replace function public.au_stats_source_17v01(p_owner uuid,p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; listening jsonb; events jsonb; messages jsonb; contributions jsonb; libraries jsonb; library jsonb; tracked timestamptz; first_tracks jsonb; first_conversations jsonb; minutes jsonb; community_activity jsonb;
begin
 select started_at into tracked from public.au_stats_tracking_17v01 where user_id=p_owner;
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into listening from (
  select to_char(happened_at at time zone 'Europe/Paris','YYYY-MM-DD') as "day",
   extract(hour from happened_at at time zone 'Europe/Paris')::integer as "hour",
   details->>'trackKey' track_key,details->>'volume' volume,details->>'sessionId' session_id,details->>'platform' platform,details->>'playbackId' playback_id,
   sum((details->>'seconds')::numeric) seconds,max((details->>'duration')::numeric) duration,
   min(happened_at) first_at,max(happened_at) last_at,
   range_agg(numrange((details->>'startPosition')::numeric,(details->>'endPosition')::numeric,'[)'))::text coverage
  from public.au_stats_events_17v01 where user_id=p_owner and kind='listening' and happened_at>=p_start and happened_at<p_end and received_at<=least(p_end,now())
  group by 1,2,3,4,5,6,7
 ) g;
 select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'at',happened_at,'details',details) order by happened_at,id),'[]'::jsonb) into events from public.au_stats_events_17v01 where user_id=p_owner and kind<>'listening' and happened_at>=p_start and happened_at<p_end and received_at<=least(p_end,now());
 -- Message bodies are intentionally never selected.
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into messages from (
  select to_char(created_at at time zone 'Europe/Paris','YYYY-MM-DD') as "day",
   case when sender=p_owner then recipient else sender end peer,
   count(*) filter(where sender=p_owner) sent,count(*) filter(where recipient=p_owner) received,
   min(created_at) first_at from public.au_messages where (sender=p_owner or recipient=p_owner) and created_at>=p_start and created_at<p_end group by 1,2
 ) g;
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into contributions from (
  select 'sync'::text kind,track_key,status,created_at,correction_of is not null correction,sync_mode mode,
   jsonb_array_length(coalesce(lines,'[]'::jsonb)) blocks from public.au_sync_submissions where user_id=p_owner and created_at>=p_start and created_at<p_end
  union all select 'lyrics',track_key,status,created_at,false,null,0 from public.au_lyrics_contributions where user_id=p_owner and created_at>=p_start and created_at<p_end
  union all select 'comment',track_key,case when hidden then 'hidden' else 'published' end,created_at,false,null,0 from public.au_comments where user_id=p_owner and created_at>=p_start and created_at<p_end
 ) g;
 select coalesce(jsonb_agg(jsonb_build_object('at',created_at,'changes',changes) order by created_at,id),'[]'::jsonb) into libraries from public.au_playlist_versions_17v01 where user_id=p_owner and created_at>=p_start and created_at<p_end;
 select playlists into library from public.au_playlist_versions_17v01 where user_id=p_owner and created_at<p_end order by created_at desc,id desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into first_tracks from (select details->>'trackKey' track_key,min(happened_at) first_at from public.au_stats_events_17v01 where user_id=p_owner and kind='track_start' and happened_at<p_end group by 1) g;
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into first_conversations from (select case when sender=p_owner then recipient else sender end peer,min(created_at) first_at from public.au_messages where (sender=p_owner or recipient=p_owner) and created_at<p_end group by 1) g;
 select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) into minutes from (select to_char(happened_at at time zone 'Europe/Paris','HH24:MI') as "minute",sum((details->>'seconds')::numeric) seconds from public.au_stats_events_17v01 where user_id=p_owner and kind='listening' and happened_at>=p_start and happened_at<p_end and received_at<=least(p_end,now()) group by 1) g;
 select coalesce(jsonb_agg(jsonb_build_object('action',action,'at',created_at)),'[]'::jsonb) into community_activity from public.au_activity_17 where actor=p_owner and created_at>=p_start and created_at<p_end;
 result:=jsonb_build_object('start',p_start,'end',p_end,'trackingSince',tracked,'listening',listening,'events',events,'messages',messages,'contributions',contributions,'playlistChanges',libraries,'playlists',coalesce(library,'[]'::jsonb),'libraryTracked',library is not null,'firstTracks',first_tracks,'firstConversations',first_conversations,'minuteDistribution',minutes,'communityActivity',community_activity,'trophyCollection',coalesce((select jsonb_agg(details||jsonb_build_object('exhibited',exhibited,'awardedAt',awarded_at)) from public.au_trophy_awards_17v01 where owner_id=p_owner and awarded_at<=least(p_end,now())),'[]'::jsonb),'trophies',public.au_trophy_progress_17v01(p_owner,extract(year from p_start at time zone 'Europe/Paris')::integer),'capturedAt',now());
 return result;
end$$;
create or replace function public.au_stats_comparable_17v01(p_owner uuid,p_start timestamptz,p_end timestamptz,p_kind text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare facts jsonb:=public.au_stats_source_17v01(p_owner,p_start,p_end);tracked timestamptz:=(facts->>'trackingSince')::timestamptz;a timestamptz;b timestamptz;m timestamptz;previous_month timestamptz;
begin
 if p_kind='annual' then a:=((p_start at time zone 'Europe/Paris')-interval '1 year') at time zone 'Europe/Paris';b:=((p_end at time zone 'Europe/Paris')-interval '1 year') at time zone 'Europe/Paris';
 elsif p_kind='monthly' then a:=((p_start at time zone 'Europe/Paris')-interval '1 month') at time zone 'Europe/Paris';b:=least(p_start,a+(p_end-p_start));
 else a:=p_start-(p_end-p_start);b:=p_start;end if;
 if a>='2025-12-31T23:00:00Z' and tracked<=a then facts:=facts||jsonb_build_object('previous',public.au_stats_source_17v01(p_owner,a,b));end if;
 a:=((p_start at time zone 'Europe/Paris')-interval '1 year') at time zone 'Europe/Paris';b:=((p_end at time zone 'Europe/Paris')-interval '1 year') at time zone 'Europe/Paris';
 if a>='2025-12-31T23:00:00Z' and tracked<=a then facts:=facts||jsonb_build_object('previousYear',public.au_stats_source_17v01(p_owner,a,b));end if;
 m:=date_trunc('month',(p_end-interval '1 microsecond') at time zone 'Europe/Paris') at time zone 'Europe/Paris';
 previous_month:=((m at time zone 'Europe/Paris')-interval '1 month') at time zone 'Europe/Paris';
 if previous_month>='2025-12-31T23:00:00Z' and tracked<=previous_month then facts:=facts||jsonb_build_object('currentMonth',public.au_stats_source_17v01(p_owner,m,p_end),'previousMonth',public.au_stats_source_17v01(p_owner,previous_month,least(m,previous_month+(p_end-m))));end if;
 return facts;
end$$;
create or replace function public.au_stats_view_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a timestamptz:=(p->>'start')::timestamptz; b timestamptz:=(p->>'end')::timestamptz;
begin
 u:=public.au_social_member();
 if a is null or b is null or a>=b or b>((a at time zone 'Europe/Paris')+interval '1 year') at time zone 'Europe/Paris' or a<'2025-12-31T23:00:00Z' then raise exception 'Période invalide.';end if;
 return public.au_stats_comparable_17v01(u,a,b,coalesce(p->>'kind','programmed'));
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
 insert into public.au_summaries_17v01(owner_id,kind,summary_year,period_start,period_end,reveal_at,snapshot) values(p_owner,p_kind,y,p_start,p_end,p_reveal,facts) returning id into sid;
 insert into public.au_member_notifications(user_id,kind,body) values(p_owner,'summary','Un nouveau résumé personnel est disponible dans Statistiques et résumés.');
 return sid;
end$$;
revoke all on function public.au_stats_comparable_17v01(uuid,timestamptz,timestamptz,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
