create table public.au_projects_19 (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 100),
 project jsonb not null check (jsonb_typeof(project)='object' and octet_length(project::text)<=1500000 and project->>'format'='avant-usine-studio' and project->>'version'='1' and project->>'id'=id),
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.au_projects_19 enable row level security;
revoke all on public.au_projects_19 from public,anon,authenticated;
grant select,insert,update,delete on public.au_projects_19 to authenticated;
create policy projects_19_select on public.au_projects_19 for select to authenticated using ((select auth.uid())=user_id);
create policy projects_19_insert on public.au_projects_19 for insert to authenticated with check ((select auth.uid())=user_id);
create policy projects_19_update on public.au_projects_19 for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy projects_19_delete on public.au_projects_19 for delete to authenticated using ((select auth.uid())=user_id);
create function public.au_projects_19(p_action text,p jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); item public.au_projects_19; identifier text:=p->>'id'; expected bigint:=(p->>'revision')::bigint;
begin
 if u is null then raise exception 'Connecte-toi pour synchroniser les projets.'; end if;
 if identifier is null or length(identifier) not between 1 and 100 then raise exception 'Projet invalide.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':'||identifier,1900));
 select * into item from public.au_projects_19 where user_id=u and id=identifier for update;
 if found and (expected is null or expected<>item.revision) then raise exception 'Le projet a changé sur un autre appareil. Choisis la version à conserver.';end if;
 if not found and expected is not null then raise exception 'Ce projet a été supprimé sur un autre appareil.';end if;
 if p_action='delete' then delete from public.au_projects_19 where user_id=u and id=identifier;return jsonb_build_object('deleted',true);end if;
 if p_action<>'save' then raise exception 'Action inconnue.';end if;
 insert into public.au_projects_19(user_id,id,project) values(u,identifier,p->'project')
 on conflict(user_id,id) do update set project=excluded.project,revision=au_projects_19.revision+1,updated_at=now() returning * into item;
 return jsonb_build_object('revision',item.revision,'updatedAt',item.updated_at);
end $$;
revoke all on function public.au_projects_19(text,jsonb) from public,anon;
grant execute on function public.au_projects_19(text,jsonb) to authenticated;
