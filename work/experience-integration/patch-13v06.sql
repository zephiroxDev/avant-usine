begin;
-- Original bytes are kept independently of any lyric parsing or matching.
create table if not exists public.au_sync_files (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id), track_key text not null,
 file_name text not null, byte_size bigint not null check(byte_size>=0),
 chunk_count integer not null check(chunk_count>=0),
 status text not null default 'uploading' check(status in('uploading','pending','accepted','rejected')),
 analysis jsonb not null default '{}', note text not null default '',
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewer uuid references auth.users(id), revision integer not null default 1
);
create table if not exists public.au_sync_file_chunks (
 file_id bigint not null references public.au_sync_files(id),
 part integer not null check(part>=0), payload text not null,
 primary key(file_id,part)
);
alter table public.au_sync_files enable row level security;
alter table public.au_sync_file_chunks enable row level security;
revoke all on public.au_sync_files,public.au_sync_file_chunks from public,anon,authenticated;
revoke all on sequence public.au_sync_files_id_seq from public,anon,authenticated;
create or replace function public.au_sync_files_api(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
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
end $$;
revoke all on function public.au_sync_files_api(text,jsonb) from public,anon;
grant execute on function public.au_sync_files_api(text,jsonb) to authenticated;

alter table public.au_sync_submissions add column if not exists sync_mode text not null default 'highlight';
alter table public.au_sync_submissions add column if not exists line_groups jsonb;
alter table public.au_sync_submissions add column if not exists block_times jsonb;
alter table public.au_sync_published add column if not exists sync_mode text not null default 'highlight';
alter table public.au_sync_published add column if not exists line_groups jsonb;
alter table public.au_sync_published add column if not exists block_times jsonb;
do $$begin if to_regprocedure('public.au_sync_before_13v06(text,jsonb)') is null then alter function public.au_sync(text,jsonb) rename to au_sync_before_13v06;end if;end $$;
create or replace function public.au_sync(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;s public.au_sync_submissions;pub public.au_sync_published;src jsonb;groups jsonb;starts jsonb;adjusted jsonb:='[]';mode text;d numeric;g integer;prev_g integer:=-1;count_g integer:=0;t numeric;prev_t numeric:=-1;adjust_t numeric;last_adjust numeric:=-1;n integer;i integer;begin
 if p is null or octet_length(p::text)>1500000 then raise exception 'Contribution trop volumineuse.';end if;
 if p_action in('submit','approve') then
  perform public.au_social_member();
  if p_action='approve' then
   if not public.au_can_review() then raise exception 'Accès réservé à la modération.';end if;
   select * into s from public.au_sync_submissions where id=(p->>'id')::bigint for update;
   if not found then raise exception 'Contribution introuvable.';end if;
   mode:=coalesce(p->>'sync_mode',s.sync_mode);src:=public.au_sync_source(s.track_key);d:=s.duration;
  else mode:=coalesce(p->>'sync_mode','highlight');src:=public.au_sync_source(p->>'track');d:=(p->>'duration')::numeric;end if;
  if mode not in('highlight','blocks') then raise exception 'Mode inconnu.';end if;
  if mode='blocks' then
   groups:=coalesce(p->'line_groups',s.line_groups);starts:=coalesce(p->'block_times',s.block_times);n:=jsonb_array_length(src->'lines');
   if n not between 1 and 600 or jsonb_typeof(groups) is distinct from 'array' or jsonb_typeof(starts) is distinct from 'array' or jsonb_array_length(groups)<>n or jsonb_array_length(starts)<>n or d is null or d<=0 or d>21600 then raise exception 'Blocs incomplets.';end if;
   for i in 0..n-1 loop
    if jsonb_typeof(groups->i) is distinct from 'number' or jsonb_typeof(starts->i) is distinct from 'number' then raise exception 'Marque chaque bloc.';end if;
    if (groups->>i)::numeric<>trunc((groups->>i)::numeric) then raise exception 'Groupe invalide.';end if;
    g:=(groups->>i)::integer;t:=(starts->>i)::numeric;
    if g=prev_g then count_g:=count_g+1;if t<>prev_t then raise exception 'Les lignes du même bloc doivent partager leur début.';end if;
    else if g<>prev_g+1 or t<=prev_t then raise exception 'Les blocs doivent avancer dans l’ordre.';end if;count_g:=1;end if;
    if count_g>3 or t<0 or t>=d then raise exception 'Un bloc contient au maximum trois lignes et un début valide.';end if;
    adjust_t:=t+(count_g-1)*0.000001;
    if adjust_t<=last_adjust or adjust_t>=d then raise exception 'Les débuts de blocs sont trop proches.';end if;
    adjusted:=adjusted||jsonb_build_array(adjust_t);last_adjust:=adjust_t;prev_g:=g;prev_t:=t;
   end loop;
   result:=public.au_sync_before_13v06(p_action,(p-'curves'-'line_groups'-'block_times')||jsonb_build_object('times',adjusted));
  else result:=public.au_sync_before_13v06(p_action,p);groups:=null;starts:=null;end if;
  if p_action='submit' then update public.au_sync_submissions set sync_mode=mode,line_groups=groups,block_times=starts where id=result::text::bigint;
  else update public.au_sync_submissions set sync_mode=mode,line_groups=groups,block_times=starts where id=s.id;update public.au_sync_published set sync_mode=mode,line_groups=groups,block_times=starts where submission_id=s.id;end if;
  return result;
 end if;
 result:=public.au_sync_before_13v06(p_action,p);
 if p_action='published' and result is not null and result<>'null'::jsonb then
  select * into pub from public.au_sync_published where track_key=p->>'track';
  result:=result||jsonb_build_object('sync_mode',pub.sync_mode,'line_groups',pub.line_groups);
  if pub.sync_mode='blocks' then result:=result||jsonb_build_object('times',pub.block_times,'curves',null);end if;
 end if;
 if p_action='review' and result is not null then select * into s from public.au_sync_submissions where id=(p->>'id')::bigint;result:=result||jsonb_build_object('sync_mode',s.sync_mode,'line_groups',s.line_groups,'block_times',s.block_times);end if;
 return result;
end $$;
revoke all on function public.au_sync_before_13v06(text,jsonb) from public,anon,authenticated;
revoke all on function public.au_sync(text,jsonb) from public;
grant execute on function public.au_sync(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
