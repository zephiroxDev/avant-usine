alter table public.au_sync_submissions add column studio_data jsonb;
alter table public.au_sync_published add column studio_data jsonb;

create function au_private.studio_validate_19(data jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare lines jsonb:=data->'lines'; starts jsonb:=data->'times'; endings jsonb:=data->'line_ends'; curves jsonb:=data->'curves'; tracks jsonb:=data->'tracks'; assignments jsonb:=data->'line_tracks'; mode text:=data->>'sync_mode'; d numeric:=(data->>'duration')::numeric; i integer; j integer; n integer; a numeric; b numeric; x numeric; t numeric; px numeric; pt numeric; c jsonb; point jsonb;
begin
 if data is null or octet_length(data::text)>1500000 or mode not in ('highlight','blocks') or d is null or d<=0 or d>21600 or jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 600 then raise exception 'Projet ou durée invalide.';end if;
 n:=jsonb_array_length(lines);
 if jsonb_typeof(starts) is distinct from 'array' or jsonb_typeof(endings) is distinct from 'array' or jsonb_array_length(starts)<>n or jsonb_array_length(endings)<>n or jsonb_typeof(assignments) is distinct from 'array' or jsonb_array_length(assignments)<>n or jsonb_typeof(tracks) is distinct from 'array' or jsonb_array_length(tracks) not between 1 and 32 then raise exception 'Pistes ou repères incomplets.';end if;
 if exists(select 1 from jsonb_array_elements(tracks) q where jsonb_typeof(q->'id') is distinct from 'string' or length(q->>'id') not between 1 and 100 or jsonb_typeof(q->'name') is distinct from 'string' or length(q->>'name') not between 1 and 100) or (select count(distinct q->>'id') from jsonb_array_elements(tracks) q)<>jsonb_array_length(tracks) then raise exception 'Piste invalide.';end if;
 if mode='highlight' and (jsonb_typeof(curves) is distinct from 'array' or jsonb_array_length(curves)<>n) then raise exception 'Surlignage incomplet.';end if;
 for i in 0..n-1 loop
  if jsonb_typeof(lines->i) is distinct from 'string' or length(trim(lines->>i)) not between 1 and 2000 or jsonb_typeof(starts->i) is distinct from 'number' or jsonb_typeof(endings->i) is distinct from 'number' or jsonb_typeof(assignments->i) is distinct from 'string' then raise exception 'Phrase invalide.';end if;
  if not exists(select 1 from jsonb_array_elements(tracks) q where q->>'id'=assignments->>i) then raise exception 'Piste de la phrase introuvable.';end if;
  a:=(starts->>i)::numeric;b:=(endings->>i)::numeric;
  if a<0 or b<=a or b>d or (i>0 and a<(starts->>(i-1))::numeric) then raise exception 'Repères hors du morceau ou ordre des débuts invalide.';end if;
  if mode='highlight' then
   c:=curves->i;px:=-1;pt:=-1;
   if jsonb_typeof(c) is distinct from 'array' or jsonb_array_length(c) not between 2 and 2000 then raise exception 'Surlignage incomplet.';end if;
   for point in select value from jsonb_array_elements(c) loop
    if jsonb_typeof(point) is distinct from 'array' or jsonb_array_length(point)<>2 or jsonb_typeof(point->0) is distinct from 'number' or jsonb_typeof(point->1) is distinct from 'number' then raise exception 'Repère de mot invalide.';end if;
    x:=(point->>0)::numeric;t:=(point->>1)::numeric;
    if x<0 or x>length(lines->>i) or x<=px or t< a or t>b or t<=pt then raise exception 'Les mots doivent avancer dans leur phrase.';end if;
    px:=x;pt:=t;
   end loop;
   if (c->0->>0)::numeric<>0 or (c->0->>1)::numeric<>a or px<>length(lines->>i) or pt<>b then raise exception 'Repères de début ou de fin incomplets.';end if;
  end if;
 end loop;
 return jsonb_build_object('version','2.0','sync_mode',mode,'duration',d,'lines',lines,'times',starts,'line_ends',endings,'line_tracks',assignments,'tracks',tracks,'curves',case when mode='highlight' then curves else 'null'::jsonb end,'end_time',(select max(value::text::numeric) from jsonb_array_elements(endings)));
end $$;
revoke all on function au_private.studio_validate_19(jsonb) from public,anon,authenticated;

alter function public.au_sync(text,jsonb) rename to au_sync_before_19;
create function public.au_sync(p_action text,p jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; s public.au_sync_submissions; v public.au_sync_published; src jsonb; data jsonb; result jsonb; new_id bigint; k text;
begin
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
end $$;
revoke all on function public.au_sync(text,jsonb) from public;
grant execute on function public.au_sync(text,jsonb) to anon,authenticated;

revoke execute on function public.au_sync_before_19(text,jsonb) from public, anon, authenticated;
