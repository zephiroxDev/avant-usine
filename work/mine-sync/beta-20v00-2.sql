-- Creator lookup is the existing server-authoritative role check, not user metadata.
create table if not exists public.au_beta_builds_20 (
 id uuid primary key default gen_random_uuid(),
 patch text not null,
 platform text not null check(platform in ('ios','android','windows')),
 version text not null,
 build_number integer not null check(build_number>0),
 object_path text not null unique check(object_path !~ '(^/|\.\.)'),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes bigint not null check(bytes>0),
 notes text not null default '',
 ready boolean not null default false,
 parts jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.au_beta_builds_20 enable row level security;
revoke all on public.au_beta_builds_20 from anon,authenticated;
grant select on public.au_beta_builds_20 to authenticated;
grant execute on function public.au_is_creator() to authenticated;
create policy beta_creator_read_20 on public.au_beta_builds_20 for select to authenticated using ((select public.au_is_creator()));
insert into storage.buckets(id,name,public) values('au-beta-builds','au-beta-builds',false) on conflict(id) do nothing;
create policy beta_creator_file_read_20 on storage.objects for select to authenticated using (bucket_id='au-beta-builds' and (select public.au_is_creator()));
-- Uploads remain service-side only; no public or client write grants.
