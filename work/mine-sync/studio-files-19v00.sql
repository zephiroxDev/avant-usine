alter function public.au_sync_moderation(text,jsonb) rename to au_sync_moderation_before_19;
create function public.au_sync_moderation(p_action text,p jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; f public.au_sync_files; data jsonb; src jsonb; k text; identifier bigint; result jsonb;
begin
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
end $$;
revoke all on function public.au_sync_moderation(text,jsonb) from public,anon;
grant execute on function public.au_sync_moderation(text,jsonb) to authenticated;

revoke execute on function public.au_sync_moderation_before_19(text,jsonb) from public, anon, authenticated;
