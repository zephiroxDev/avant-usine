begin;
create table if not exists public.au_sync_review_archives (
 reviewer uuid not null references auth.users(id), kind text not null check(kind in('file','sync')),
 item_id bigint not null, created_at timestamptz not null default now(), primary key(reviewer,kind,item_id)
);
alter table public.au_sync_review_archives enable row level security;
revoke all on public.au_sync_review_archives from public,anon,authenticated;
alter table public.au_sync_files add column if not exists published_submission_id bigint references public.au_sync_submissions(id);
alter table public.au_sync_submissions add column if not exists source_file_id bigint references public.au_sync_files(id);
create or replace function public.au_sync_moderation(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid;file_row public.au_sync_files;sync_row public.au_sync_submissions;result jsonb;src jsonb;data jsonb;lines jsonb;curves jsonb;starts jsonb;groups jsonb;adjusted jsonb:='[]';mode text;k text;d numeric;new_submission_id bigint;i integer;n integer;g integer;last_g integer:=-1;cnt integer:=0;t numeric;last_t numeric:=-1;last_adjust numeric:=-1;at numeric;begin
 u:=public.au_social_member();if not public.au_can_review() then raise exception 'Accès réservé au créateur et aux modérateurs.';end if;
 if p is null or octet_length(p::text)>1500000 then raise exception 'Demande trop volumineuse.';end if;
 if p_action='queue' then
  return jsonb_build_object('sync',(
   select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (
    select s.id,s.track_key,s.status,s.revision,s.created_at,public.au_profile_public(s.user_id) author,exists(select 1 from public.au_sync_published v where v.submission_id=s.id) is_published
    from public.au_sync_submissions s where s.source_file_id is null and exists(select 1 from public.au_sync_review_archives a where a.reviewer=u and a.kind='sync' and a.item_id=s.id)=coalesce((p->>'archived')::boolean,false)
    order by s.created_at desc limit 100) q),'files',(
   select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]') from (
    select f.*,public.au_profile_public(f.user_id) author,exists(select 1 from public.au_sync_published v where v.submission_id=f.published_submission_id) is_published from public.au_sync_files f where f.status<>'uploading' and exists(select 1 from public.au_sync_review_archives a where a.reviewer=u and a.kind='file' and a.item_id=f.id)=coalesce((p->>'archived')::boolean,false)
    order by f.created_at desc limit 100) q));
 end if;
 if p->>'kind'='file' then select * into file_row from public.au_sync_files where au_sync_files.id=(p->>'id')::bigint;if not found then raise exception 'Fichier introuvable.';end if;
 elsif p->>'kind'='sync' then select * into sync_row from public.au_sync_submissions where au_sync_submissions.id=(p->>'id')::bigint;if not found then raise exception 'Proposition introuvable.';end if;
 else raise exception 'Type de proposition invalide.';end if;
 if p_action='archive' then
  insert into public.au_sync_review_archives(reviewer,kind,item_id) values(u,p->>'kind',(p->>'id')::bigint) on conflict do nothing;return jsonb_build_object('archived',true);
 elsif p_action='restore' then
  delete from public.au_sync_review_archives where reviewer=u and kind=p->>'kind' and item_id=(p->>'id')::bigint;return jsonb_build_object('archived',false);
 elsif p_action='detail' then
  if p->>'kind'='sync' then return to_jsonb(sync_row)||jsonb_build_object('source',public.au_sync_source(sync_row.track_key),'author',public.au_profile_public(sync_row.user_id));end if;
  return public.au_sync_files_api('download',jsonb_build_object('id',file_row.id))||jsonb_build_object('author',public.au_profile_public(file_row.user_id));
 elsif p_action='unpublish' then
  new_submission_id:=case when p->>'kind'='file' then file_row.published_submission_id else sync_row.id end;
  delete from public.au_sync_published where submission_id=new_submission_id;
  if not found then raise exception 'Cette proposition n’est plus la version publique.';end if;
  return jsonb_build_object('unpublished',true);
 elsif p_action='publish_file' then
  if p->>'kind'<>'file' or (p->>'review_complete')::boolean is distinct from true then raise exception 'Termine la prévisualisation avant d’approuver.';end if;
  select * into file_row from public.au_sync_files where au_sync_files.id=file_row.id for update;
  if file_row.status='uploading' or file_row.revision is distinct from (p->>'revision')::integer then raise exception 'Le fichier a changé. Actualise la vérification.';end if;
  k:=p->>'track';src:=public.au_sync_source(k);data:=p->'data';lines:=data->'lines';d:=(data->>'duration')::numeric;mode:=coalesce(data->>'sync_mode','highlight');
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 600 or d is null or d<=0 or d>21600 then raise exception 'Paroles ou durée invalides.';end if;
  for i in 0..jsonb_array_length(lines)-1 loop if jsonb_typeof(lines->i) is distinct from 'string' or length(trim(lines->>i))=0 then raise exception 'Chaque ligne doit contenir des paroles.';end if;end loop;
  if mode='highlight' then
   curves:=data->'curves';starts:=public.au_karaoke_validate(lines,curves,d);adjusted:=starts;
  elsif mode='blocks' then
   starts:=data->'times';groups:=data->'line_groups';n:=jsonb_array_length(lines);
   if jsonb_typeof(starts) is distinct from 'array' or jsonb_typeof(groups) is distinct from 'array' or jsonb_array_length(starts)<>n or jsonb_array_length(groups)<>n then raise exception 'Timings de blocs incomplets.';end if;
   for i in 0..n-1 loop
    if jsonb_typeof(starts->i) is distinct from 'number' or jsonb_typeof(groups->i) is distinct from 'number' or (groups->>i)::numeric<>trunc((groups->>i)::numeric) then raise exception 'Timings de blocs invalides.';end if;
    t:=(starts->>i)::numeric;g:=(groups->>i)::integer;
    if g=last_g then cnt:=cnt+1;if t<>last_t then raise exception 'Les lignes du bloc doivent avoir le même début.';end if;
    else if g<>last_g+1 or t<=last_t then raise exception 'Les blocs doivent avancer dans l’ordre.';end if;cnt:=1;end if;
    at:=t+(cnt-1)*0.000001;if cnt>3 or t<0 or at>=d or at<=last_adjust then raise exception 'Un bloc contient une à trois lignes et un début valide.';end if;
    adjusted:=adjusted||jsonb_build_array(at);last_g:=g;last_t:=t;last_adjust:=at;
   end loop;
  else raise exception 'Mode de synchronisation inconnu.';end if;
  -- The reviewer intentionally approves the file text, not an automatic match with catalog lyrics.
  perform pg_advisory_xact_lock(hashtextextended(k,2061));
  insert into public.au_sync_submissions(user_id,track_key,source_hash,lines,times,duration,status,note,reviewed_at,curves,sync_mode,line_groups,block_times,source_file_id)
  values(file_row.user_id,k,src->>'hash',lines,adjusted,d,'approved',left(coalesce(p->>'note',''),1000),now(),curves,mode,groups,case when mode='blocks' then starts else null end,file_row.id) returning au_sync_submissions.id into new_submission_id;
  insert into public.au_sync_published(track_key,source_hash,lines,times,duration,submission_id,curves,sync_mode,line_groups,block_times)
  values(k,src->>'hash',lines,adjusted,d,new_submission_id,curves,mode,groups,case when mode='blocks' then starts else null end)
  on conflict(track_key) do update set source_hash=excluded.source_hash,lines=excluded.lines,times=excluded.times,duration=excluded.duration,submission_id=excluded.submission_id,curves=excluded.curves,sync_mode=excluded.sync_mode,line_groups=excluded.line_groups,block_times=excluded.block_times,revision=au_sync_published.revision+1,updated_at=now();
  update public.au_sync_files set status='accepted',track_key=k,published_submission_id=new_submission_id,note=left(coalesce(p->>'note',''),1000),reviewer=u,reviewed_at=now(),revision=revision+1 where au_sync_files.id=file_row.id;
  return jsonb_build_object('published',true,'submission_id',new_submission_id,'track',k);
 end if;raise exception 'Action inconnue.';
end $$;
revoke all on function public.au_sync_moderation(text,jsonb) from public,anon;
grant execute on function public.au_sync_moderation(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
