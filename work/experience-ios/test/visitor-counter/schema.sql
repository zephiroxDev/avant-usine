-- Draft only: apply and transaction-test before enabling the public frontend.
create schema if not exists au22_metrics_private;
revoke all on schema au22_metrics_private from public, anon, authenticated;
create table if not exists au22_metrics_private.visit_total (
 id boolean primary key default true check (id), total bigint not null default 0 check (total >= 0)
);
create table if not exists au22_metrics_private.visit_sessions (
 browser_hash text primary key, last_seen timestamptz not null
);
create index if not exists au22_visit_last_seen on au22_metrics_private.visit_sessions(last_seen);
alter table au22_metrics_private.visit_total enable row level security;
alter table au22_metrics_private.visit_sessions enable row level security;
revoke all on all tables in schema au22_metrics_private from public, anon, authenticated;
insert into au22_metrics_private.visit_total(id,total) values(true,0) on conflict do nothing;
-- Intentional anonymous aggregate endpoint. No account, IP, or individual session is returned.
create or replace function public.au_visit_count_22_1(p_browser uuid, p_touch boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k text; previous timestamptz; stamp timestamptz := pg_catalog.clock_timestamp(); n bigint; counted boolean := false;
begin
 if p_touch then
  if p_browser is null then raise exception 'Identifiant de session requis'; end if;
  k := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_browser::text,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(k, 221));
  select last_seen into previous from au22_metrics_private.visit_sessions where browser_hash=k;
  counted := previous is null or previous <= stamp - interval '30 minutes';
  insert into au22_metrics_private.visit_sessions(browser_hash,last_seen) values(k,stamp)
   on conflict(browser_hash) do update set last_seen=greatest(visit_sessions.last_seen,excluded.last_seen);
  if counted then update au22_metrics_private.visit_total set total=total+1 where id=true; end if;
 end if;
 select total into n from au22_metrics_private.visit_total where id=true;
 return pg_catalog.jsonb_build_object('total',coalesce(n,0),'counted',counted);
end $$;
revoke all on function public.au_visit_count_22_1(uuid,boolean) from public;
grant execute on function public.au_visit_count_22_1(uuid,boolean) to anon, authenticated;
