-- Annual snapshots and individual permission grants. No role bypass for private contents.
begin;
create table public.au_stats_tracking_17v01 (
 user_id uuid primary key references auth.users(id),
 started_at timestamptz not null default now()
);
insert into public.au_stats_tracking_17v01(user_id) select id from auth.users;
create function public.au_stats_new_member_17v01() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.au_stats_tracking_17v01(user_id,started_at) values(new.id,new.created_at) on conflict(user_id) do nothing;return new;end$$;
create trigger au_stats_new_member_17v01 after insert on auth.users for each row execute function public.au_stats_new_member_17v01();
revoke all on function public.au_stats_new_member_17v01() from public,anon,authenticated;
create table public.au_stats_events_17v01 (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 event_id uuid not null,
 kind text not null check(kind in ('listening','track_start','track_end','session','login','section','function','usage','blind_round','blind_game','sync_start','sync_finish','sync_abandon')),
 happened_at timestamptz not null,
 received_at timestamptz not null default now(),
 details jsonb not null,
 unique(user_id,event_id)
);
create index au_stats_events_17v01_period on public.au_stats_events_17v01(user_id,happened_at,kind);
alter table public.au_stats_tracking_17v01 enable row level security;
alter table public.au_stats_events_17v01 enable row level security;
revoke all on public.au_stats_tracking_17v01,public.au_stats_events_17v01 from anon,authenticated;

create function public.au_stats_record_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
revoke all on function public.au_stats_record_17v01(jsonb) from public,anon,authenticated;
grant execute on function public.au_stats_record_17v01(jsonb) to authenticated;
create table public.au_playlist_versions_17v01 (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 playlists jsonb not null,
 changes jsonb not null
);
create index au_playlist_versions_17v01_period on public.au_playlist_versions_17v01(user_id,created_at desc);
alter table public.au_playlist_versions_17v01 enable row level security;
revoke all on public.au_playlist_versions_17v01 from anon,authenticated;
insert into public.au_playlist_versions_17v01(user_id,playlists,changes) select user_id,coalesce(library->'playlists','[]'::jsonb),'[]'::jsonb from public.au_account_libraries;
create function public.au_playlist_capture_17v01() returns trigger language plpgsql security definer set search_path='' as $$
declare before_list jsonb; after_list jsonb; changes jsonb;
begin
 before_list:=case when tg_op='INSERT' then '[]'::jsonb else coalesce(old.library->'playlists','[]'::jsonb) end;
 after_list:=coalesce(new.library->'playlists','[]'::jsonb);
 if before_list=after_list then return new;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',coalesce(a.item->>'id',b.item->>'id'),'action',case when b.item is null then 'created' when a.item is null then 'deleted' else 'modified' end,'added',coalesce((select count(*) from jsonb_array_elements_text(coalesce(a.item->'keys','[]'::jsonb)) x where not(coalesce(b.item->'keys','[]'::jsonb) ? x.value)),0),'removed',coalesce((select count(*) from jsonb_array_elements_text(coalesce(b.item->'keys','[]'::jsonb)) x where not(coalesce(a.item->'keys','[]'::jsonb) ? x.value)),0))),'[]'::jsonb) into changes
 from jsonb_array_elements(after_list) a(item) full join jsonb_array_elements(before_list) b(item) on a.item->>'id'=b.item->>'id'
 where a.item is distinct from b.item;
 insert into public.au_playlist_versions_17v01(user_id,playlists,changes) values(new.user_id,after_list,changes);
 return new;
end$$;
create trigger au_playlist_capture_17v01 after insert or update on public.au_account_libraries for each row execute function public.au_playlist_capture_17v01();
revoke all on function public.au_playlist_capture_17v01() from public,anon,authenticated;
create table public.au_summaries_17v01 (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 kind text not null check(kind in ('annual','monthly','programmed')),
 summary_year integer not null check(summary_year>=2026),
 period_start timestamptz not null,
 period_end timestamptz not null,
 reveal_at timestamptz not null,
 snapshot jsonb not null,
 public_listing boolean not null default false,
 created_at timestamptz not null default now(),
 check(period_start<period_end),
 check(reveal_at>=period_end),
 check(kind<>'annual' or (period_start=make_date(summary_year,1,1)::timestamp at time zone 'Europe/Paris' and period_end=make_date(summary_year+1,1,1)::timestamp at time zone 'Europe/Paris' and reveal_at=period_end)),
 check(kind<>'programmed' or period_end<=((period_start at time zone 'Europe/Paris')+interval '6 months') at time zone 'Europe/Paris'),
 check(not public_listing or (kind='annual' and summary_year>=2027)),
 unique(owner_id,kind,period_start,period_end)
);
create index au_summaries_17v01_public on public.au_summaries_17v01(owner_id,summary_year desc) where public_listing;
create table public.au_trophy_rules_17v01 (
 family text primary key,label text not null,unit text not null,thresholds numeric[] not null check(cardinality(thresholds)=12)
);
insert into public.au_trophy_rules_17v01 values
 ('listening','Temps d’écoute','heures',array[1,5,15,30,60,120,250,500,900,1500,2200,3000]),
 ('tracks','Diversité musicale','morceaux distincts',array[1,3,5,10,20,35,50,75,100,150,250,500]),
 ('volumes','Exploration des volumes','volumes distincts',array[1,2,3,4,5,6,7,8,9,10,11,12]),
 ('plays','Écoutes lancées','lancements',array[10,50,100,250,500,1000,2500,5000,10000,25000,50000,100000]),
 ('active_days','Régularité d’écoute','jours actifs',array[1,5,10,20,40,60,90,120,180,240,300,365]),
 ('sessions','Sessions d’écoute','sessions',array[1,10,25,50,100,250,500,1000,2000,3500,6000,10000]),
 ('playlists','Création de playlists','playlists créées',array[1,2,5,10,20,35,50,100,200,350,600,1000]),
 ('playlist_adds','Collection personnelle','ajouts à des playlists',array[1,10,25,50,100,250,500,1000,2000,3500,6000,10000]),
 ('messages','Échanges privés','messages échangés',array[1,10,50,100,250,500,1000,2500,5000,10000,25000,100000]),
 ('community','Participation communautaire','contributions',array[1,5,10,25,50,100,250,500,1000,2000,3500,5000]),
 ('synchronization','Synchronisation','propositions de synchronisation',array[1,2,5,10,25,50,100,200,350,500,750,1000]),
 ('blind_games','Blind Test','parties terminées',array[1,5,10,25,50,100,250,500,1000,2000,3500,5000]),
 ('blind_answers','Reconnaissance musicale','bonnes réponses',array[1,10,50,100,250,500,1000,2500,5000,10000,25000,100000]),
 ('community_days','Régularité communautaire','jours de participation',array[1,5,10,20,40,60,90,120,180,240,300,365]);
alter table public.au_trophy_rules_17v01 enable row level security;
revoke all on public.au_trophy_rules_17v01 from anon,authenticated;
create table public.au_trophy_awards_17v01 (
 owner_id uuid not null references auth.users(id),year integer not null check(year>=2026),family text not null references public.au_trophy_rules_17v01(family),
 level integer not null check(level between 1 and 12),details jsonb not null,awarded_at timestamptz not null,
 exhibited boolean not null default false,primary key(owner_id,year,family,level),check(not exhibited or year>=2027)
);
alter table public.au_trophy_awards_17v01 enable row level security;
revoke all on public.au_trophy_awards_17v01 from anon,authenticated;
create function public.au_trophy_progress_17v01(p_owner uuid,p_year integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a timestamptz:=make_date(p_year,1,1)::timestamp at time zone 'Europe/Paris';b timestamptz:=make_date(p_year+1,1,1)::timestamp at time zone 'Europe/Paris';counts jsonb;result jsonb;
begin
 select jsonb_build_object('listening',coalesce(sum((details->>'seconds')::numeric) filter(where kind='listening'),0)/3600,'tracks',count(distinct details->>'trackKey') filter(where kind='listening'),'volumes',count(distinct details->>'volume') filter(where kind='listening'),'plays',count(*) filter(where kind='track_start'),'active_days',count(distinct (happened_at at time zone 'Europe/Paris')::date) filter(where kind='listening'),'sessions',count(*) filter(where kind='session'),'blind_games',count(*) filter(where kind='blind_game'),'blind_answers',count(*) filter(where kind='blind_round' and details->>'correct'='true')) into counts
 from public.au_stats_events_17v01 where user_id=p_owner and happened_at>=a and happened_at<b and received_at<=least(b,now());
 counts:=counts||jsonb_build_object('messages',(select count(*) from public.au_messages where (sender=p_owner or recipient=p_owner) and created_at>=a and created_at<b),'synchronization',(select count(*) from public.au_sync_submissions where user_id=p_owner and created_at>=a and created_at<b));
 select counts||jsonb_build_object('community',count(*),'community_days',count(distinct (created_at at time zone 'Europe/Paris')::date)) into counts from (
  select created_at from public.au_sync_submissions where user_id=p_owner and created_at>=a and created_at<b
  union all select created_at from public.au_lyrics_contributions where user_id=p_owner and created_at>=a and created_at<b
  union all select created_at from public.au_comments where user_id=p_owner and created_at>=a and created_at<b
 ) c;
 select counts||jsonb_build_object('playlists',count(*) filter(where change->>'action'='created'),'playlist_adds',coalesce(sum((change->>'added')::numeric),0)) into counts
 from public.au_playlist_versions_17v01 v cross join lateral jsonb_array_elements(v.changes) change where v.user_id=p_owner and v.created_at>=a and v.created_at<b;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.family||'-'||p_year||'-'||i,'family',r.family,'name',r.label,'year',p_year,'level',i,'rarity',(array['Minimal','Basique','Typique','Commun','Atypique','Rare','Très rare','Précieux','Extrêmement rare','Rarissime','Exotique','Extraordinairement rare'])[i],'threshold',r.thresholds[i],'unit',r.unit,'value',coalesce((counts->>r.family)::numeric,0),'progress',least(1,coalesce((counts->>r.family)::numeric,0)/r.thresholds[i]),'earned',now()>=b and coalesce((counts->>r.family)::numeric,0)>=r.thresholds[i],'locked',now()<b,'awardedAt',case when now()>=b and coalesce((counts->>r.family)::numeric,0)>=r.thresholds[i] then b else null end,'publicEligible',p_year>=2027,'exhibited',coalesce(t.exhibited,false)) order by r.family,i),'[]'::jsonb) into result
 from public.au_trophy_rules_17v01 r cross join generate_series(1,12) i left join public.au_trophy_awards_17v01 t on t.owner_id=p_owner and t.year=p_year and t.family=r.family and t.level=i;
 return result;
end$$;
revoke all on function public.au_trophy_progress_17v01(uuid,integer) from public,anon,authenticated;
create function public.au_trophy_collection_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.au_social_member();chosen jsonb:=coalesce(p->'selected','[]'::jsonb);wanted integer;found_count integer;
begin
 if p->>'action'='exhibit' then
  if jsonb_typeof(chosen)<>'array' or octet_length(chosen::text)>100000 then raise exception 'Sélection invalide.';end if;
  select count(distinct value) into wanted from jsonb_array_elements_text(chosen);
  select count(*) into found_count from public.au_trophy_awards_17v01 where owner_id=u and year>=2027 and awarded_at<=now() and chosen ? (details->>'id');
  if found_count<>wanted then raise exception 'Seuls les trophées obtenus de 2027 et des années suivantes sont exposables.';end if;
  update public.au_trophy_awards_17v01 set exhibited=chosen ? (details->>'id') where owner_id=u and year>=2027 and awarded_at<=now();
 end if;
 return jsonb_build_object('trophies',coalesce((select jsonb_agg(details||jsonb_build_object('exhibited',exhibited,'awardedAt',awarded_at) order by year desc,family,level) from public.au_trophy_awards_17v01 where owner_id=u and awarded_at<=now()),'[]'::jsonb));
end$$;
create function public.au_trophy_profile_17v01(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('trophies',coalesce(jsonb_agg(jsonb_build_object('id',details->>'id','name',details->>'name','year',year,'rarity',details->>'rarity','threshold',details->'threshold','unit',details->>'unit','awardedAt',awarded_at) order by year desc,level desc),'[]'::jsonb)) from public.au_trophy_awards_17v01 where owner_id=p_owner and year>=2027 and exhibited and awarded_at<=now();
$$;
revoke all on function public.au_trophy_collection_17v01(jsonb),public.au_trophy_profile_17v01(uuid) from public,anon,authenticated;
grant execute on function public.au_trophy_collection_17v01(jsonb) to authenticated;
grant execute on function public.au_trophy_profile_17v01(uuid) to anon,authenticated;
create table public.au_summary_grants_17v01 (
 summary_id uuid not null references public.au_summaries_17v01(id),
 viewer_id uuid not null references auth.users(id),
 state text not null default 'pending' check(state in ('pending','accepted','refused','revoked')),
 requested_at timestamptz not null default now(),
 decided_at timestamptz,
 primary key(summary_id,viewer_id)
);
alter table public.au_summaries_17v01 enable row level security;
alter table public.au_summary_grants_17v01 enable row level security;
revoke all on public.au_summaries_17v01,public.au_summary_grants_17v01 from anon,authenticated;

create function public.au_summary_immutable_17v01() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Un résumé conservé ne peut pas être supprimé.';end if;
 if (to_jsonb(new)-'public_listing') is distinct from (to_jsonb(old)-'public_listing') then
  raise exception 'Le contenu historique d’un résumé est immuable.';
 end if;
 return new;
end$$;
create trigger au_summary_preserve_17v01 before update or delete on public.au_summaries_17v01 for each row execute function public.au_summary_immutable_17v01();

create function public.au_summary_access_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; s public.au_summaries_17v01; a text:=p->>'action'; target uuid; decision text; changed_count integer;
begin
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
end$$;

-- Deliberately expose metadata only: never the snapshot or private grant list.
create function public.au_summary_profile_17v01(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('summaries',coalesce(jsonb_agg(jsonb_build_object('id',id,'year',summary_year,'kind',kind,'start',period_start,'end',period_end) order by summary_year desc),'[]'::jsonb))
 from public.au_summaries_17v01 where owner_id=p_owner and public_listing and summary_year>=2027 and reveal_at<=now();
$$;
revoke all on function public.au_summary_immutable_17v01(),public.au_summary_access_17v01(jsonb),public.au_summary_profile_17v01(uuid) from public,anon,authenticated;
grant execute on function public.au_summary_access_17v01(jsonb) to authenticated;
grant execute on function public.au_summary_profile_17v01(uuid) to anon,authenticated;

create function public.au_stats_source_17v01(p_owner uuid,p_start timestamptz,p_end timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
revoke all on function public.au_stats_source_17v01(uuid,timestamptz,timestamptz) from public,anon,authenticated;

create function public.au_stats_comparable_17v01(p_owner uuid,p_start timestamptz,p_end timestamptz,p_kind text) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
revoke all on function public.au_stats_comparable_17v01(uuid,timestamptz,timestamptz,text) from public,anon,authenticated;

create function public.au_stats_view_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a timestamptz:=(p->>'start')::timestamptz; b timestamptz:=(p->>'end')::timestamptz;
begin
 u:=public.au_social_member();
 if a is null or b is null or a>=b or b>((a at time zone 'Europe/Paris')+interval '1 year') at time zone 'Europe/Paris' or a<'2025-12-31T23:00:00Z' then raise exception 'Période invalide.';end if;
 return public.au_stats_comparable_17v01(u,a,b,coalesce(p->>'kind','programmed'));
end$$;
revoke all on function public.au_stats_view_17v01(jsonb) from public,anon,authenticated;
grant execute on function public.au_stats_view_17v01(jsonb) to authenticated;
create table public.au_summary_schedules_17v01 (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),
 period_start timestamptz not null,period_end timestamptz not null,generate_at timestamptz not null,
 summary_id uuid references public.au_summaries_17v01(id),created_at timestamptz not null default now(),
 check(period_start<period_end),check(generate_at>=period_end),
 check(period_end<=((period_start at time zone 'Europe/Paris')+interval '6 months') at time zone 'Europe/Paris'),
 unique(owner_id,period_start,period_end)
);
alter table public.au_summary_schedules_17v01 enable row level security;
revoke all on public.au_summary_schedules_17v01 from anon,authenticated;
create function public.au_summary_generate_17v01(p_owner uuid,p_kind text,p_start timestamptz,p_end timestamptz,p_reveal timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
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
revoke all on function public.au_summary_generate_17v01(uuid,text,timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
create function public.au_summary_ensure_17v01(p_owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare y integer;created_year integer;current_year integer:=extract(year from now() at time zone 'Europe/Paris')::integer;a timestamptz;b timestamptz;
begin
 select greatest(2026,extract(year from created_at at time zone 'Europe/Paris')::integer) into created_year from auth.users where id=p_owner and email_confirmed_at is not null;
 if created_year is null then return;end if;
 for y in created_year..current_year-1 loop
  a:=make_date(y,1,1)::timestamp at time zone 'Europe/Paris';b:=make_date(y+1,1,1)::timestamp at time zone 'Europe/Paris';
  if not exists(select 1 from public.au_summaries_17v01 where owner_id=p_owner and kind='annual' and summary_year=y) then perform public.au_summary_generate_17v01(p_owner,'annual',a,b,b);end if;
 end loop;
 a:=date_trunc('month',greatest((select created_at from auth.users where id=p_owner),'2025-12-31T23:00:00Z'::timestamptz) at time zone 'Europe/Paris') at time zone 'Europe/Paris';
 while a<date_trunc('month',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris' loop
  b:=((a at time zone 'Europe/Paris')+interval '1 month') at time zone 'Europe/Paris';
  perform public.au_summary_generate_17v01(p_owner,'monthly',a,b,b);a:=b;
 end loop;
end$$;
revoke all on function public.au_summary_ensure_17v01(uuid) from public,anon,authenticated;
create function public.au_summary_tick_17v01() returns void language plpgsql security definer set search_path='' as $$
declare member record;y integer;current_year integer:=extract(year from now() at time zone 'Europe/Paris')::integer;a timestamptz;b timestamptz;schedule record;
begin
 for member in select id,created_at from auth.users where email_confirmed_at is not null loop
  perform public.au_summary_ensure_17v01(member.id);
  for y in greatest(2026,extract(year from member.created_at at time zone 'Europe/Paris')::integer)..current_year-1 loop
   a:=make_date(y,1,1)::timestamp at time zone 'Europe/Paris';b:=make_date(y+1,1,1)::timestamp at time zone 'Europe/Paris';
   if not exists(select 1 from public.au_summaries_17v01 where owner_id=member.id and kind='annual' and summary_year=y) then perform public.au_summary_generate_17v01(member.id,'annual',a,b,b);end if;
  end loop;
 end loop;
 for schedule in select * from public.au_summary_schedules_17v01 where summary_id is null and generate_at<=now() order by generate_at for update skip locked loop
  update public.au_summary_schedules_17v01 set summary_id=public.au_summary_generate_17v01(schedule.owner_id,'programmed',schedule.period_start,schedule.period_end,schedule.generate_at) where id=schedule.id;
 end loop;
end$$;
revoke all on function public.au_summary_tick_17v01() from public,anon,authenticated;
create function public.au_summary_plan_17v01(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.au_social_member();a timestamptz;b timestamptz;g timestamptz;sid uuid;
begin
 if p->>'action'='list' then return jsonb_build_object('plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'start',period_start,'end',period_end,'generateAt',generate_at,'summaryId',summary_id) order by generate_at) from public.au_summary_schedules_17v01 where owner_id=u),'[]'::jsonb));end if;
 a:=(p->>'start')::timestamptz;b:=(p->>'end')::timestamptz;g:=(p->>'generateAt')::timestamptz;
 if a is null or b is null or g is null or a>=b or g<b or g<now() or a<'2025-12-31T23:00:00Z' or b>((a at time zone 'Europe/Paris')+interval '6 months') at time zone 'Europe/Paris' then raise exception 'Période ou date de génération invalide : six mois calendaires maximum.';end if;
 if (select count(*) from public.au_summary_schedules_17v01 where owner_id=u and summary_id is null)>=24 then raise exception '24 résumés sont déjà en attente.';end if;
 insert into public.au_summary_schedules_17v01(owner_id,period_start,period_end,generate_at) values(u,a,b,g) returning id into sid;
 return jsonb_build_object('id',sid);
end$$;
revoke all on function public.au_summary_plan_17v01(jsonb) from public,anon,authenticated;
grant execute on function public.au_summary_plan_17v01(jsonb) to authenticated;
create function public.au_blind_history_17v01() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=public.au_social_member();r jsonb;g jsonb;
begin
 select jsonb_build_object('rounds',count(*),'correct',count(*) filter(where details->>'correct'='true'),'fastestMs',min((details->>'responseMs')::numeric)) into r from public.au_stats_events_17v01 where user_id=u and kind='blind_round';
 select jsonb_build_object('games',count(*),'bestScore',coalesce(max((details->>'score')::numeric),0)) into g from public.au_stats_events_17v01 where user_id=u and kind='blind_game';
 return r||g;
end$$;
revoke all on function public.au_blind_history_17v01() from public,anon,authenticated;
grant execute on function public.au_blind_history_17v01() to authenticated;
select cron.schedule('avant-usine-summaries-17v01','* * * * *','select public.au_summary_tick_17v01();');
revoke all on sequence public.au_stats_events_17v01_id_seq,public.au_playlist_versions_17v01_id_seq from anon,authenticated;
commit;
