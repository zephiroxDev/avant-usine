begin;
-- Timing metadata only: existing membership, moderation, RLS and role checks remain delegated.
alter table public.au_sync_submissions add column if not exists end_time numeric;
alter table public.au_sync_published add column if not exists end_time numeric;
do $$begin
 if to_regprocedure('public.au_sync_before_16(text,jsonb)') is null then alter function public.au_sync(text,jsonb) rename to au_sync_before_16;end if;
 if to_regprocedure('public.au_sync_moderation_before_16(text,jsonb)') is null then alter function public.au_sync_moderation(text,jsonb) rename to au_sync_moderation_before_16;end if;
end $$;
create or replace function public.au_sync(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;row public.au_sync_submissions;ending numeric;last_start numeric;begin
 result:=public.au_sync_before_16(p_action,p);
 if p_action in('submit','approve') and p ? 'end_time' and p->'end_time'<>'null'::jsonb then
  select * into row from public.au_sync_submissions where id=case when p_action='submit' then result::text::bigint else (p->>'id')::bigint end for update;
  ending:=(p->>'end_time')::numeric;last_start:=coalesce(row.block_times,row.times)->>-1;
  if jsonb_typeof(p->'end_time') is distinct from 'number' or ending<=last_start or ending>row.duration then raise exception 'Fin des paroles invalide : elle doit suivre le dernier bloc et rester dans le morceau.';end if;
  update public.au_sync_submissions set end_time=ending where id=row.id;
  if p_action='approve' then update public.au_sync_published set end_time=ending where submission_id=row.id;end if;
 elsif p_action='approve' and p ? 'end_time' then
  update public.au_sync_submissions set end_time=null where id=(p->>'id')::bigint;
  update public.au_sync_published set end_time=null where submission_id=(p->>'id')::bigint;
 elsif p_action='approve' then
  update public.au_sync_published v set end_time=s.end_time from public.au_sync_submissions s where s.id=(p->>'id')::bigint and v.submission_id=s.id;
 end if;
 if p_action='published' and result is not null and result<>'null'::jsonb then result:=result||jsonb_build_object('end_time',(select end_time from public.au_sync_published where track_key=p->>'track'));end if;
 if p_action='review' and result is not null and result<>'null'::jsonb then result:=result||jsonb_build_object('end_time',(select end_time from public.au_sync_submissions where id=(p->>'id')::bigint));end if;
 return result;
end $$;
create or replace function public.au_sync_moderation(p_action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;row public.au_sync_submissions;ending numeric;last_start numeric;begin
 result:=public.au_sync_moderation_before_16(p_action,p);
 if p_action='publish_file' and p->'data' ? 'end_time' and p->'data'->'end_time'<>'null'::jsonb then
  select * into row from public.au_sync_submissions where id=(result->>'submission_id')::bigint for update;
  ending:=(p->'data'->>'end_time')::numeric;last_start:=coalesce(row.block_times,row.times)->>-1;
  if jsonb_typeof(p->'data'->'end_time') is distinct from 'number' or ending<=last_start or ending>row.duration then raise exception 'Fin des paroles invalide.';end if;
  update public.au_sync_submissions set end_time=ending where id=row.id;
  update public.au_sync_published set end_time=ending where submission_id=row.id;
 end if;
 return result;
end $$;
revoke all on function public.au_sync_before_16(text,jsonb) from public,anon,authenticated;
revoke all on function public.au_sync_moderation_before_16(text,jsonb) from public,anon,authenticated;
revoke all on function public.au_sync(text,jsonb) from public;
grant execute on function public.au_sync(text,jsonb) to anon,authenticated;
revoke all on function public.au_sync_moderation(text,jsonb) from public,anon;
grant execute on function public.au_sync_moderation(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
