begin;
create schema if not exists au_editor_private;
revoke all on schema au_editor_private from public;
grant usage on schema au_editor_private to anon, authenticated;
create table if not exists au_editor_private.drafts(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 80),revision bigint not null default 1,documents jsonb not null,created_by uuid not null,updated_at timestamptz not null default now());
create table if not exists au_editor_private.published(profile text primary key check(profile in ('web-pc','web-mobile','desktop','ios','android','ps4')),version text not null,revision bigint not null default 0,document jsonb not null default '{"version":1,"patches":[],"blocks":[]}',updated_at timestamptz not null default now());
create table if not exists au_editor_private.history(profile text not null,version text not null,revision bigint not null,document jsonb not null,draft_name text not null,created_at timestamptz not null default now(),primary key(profile,version));
alter table au_editor_private.drafts enable row level security;
alter table au_editor_private.published enable row level security;
alter table au_editor_private.history enable row level security;
revoke all on all tables in schema au_editor_private from public,anon,authenticated;
insert into au_editor_private.published(profile,version) values('web-pc','20.0.4'),('web-mobile','20.0.4'),('desktop','0.6.4'),('ios','2.0.4'),('android','0.3.4'),('ps4','0.25') on conflict do nothing;
create or replace function au_editor_private.valid_document(d jsonb) returns boolean language sql immutable set search_path='' as $f$
select jsonb_typeof(d) is not distinct from 'object' and d->>'version'='1' and jsonb_typeof(d->'patches') is not distinct from 'array' and jsonb_typeof(d->'blocks') is not distinct from 'array' and case when jsonb_typeof(d->'patches')='array' then jsonb_array_length(d->'patches')<=300 else false end and case when jsonb_typeof(d->'blocks')='array' then jsonb_array_length(d->'blocks')<=100 else false end and octet_length(d::text)<=1800000;
$f$;
revoke all on function au_editor_private.valid_document(jsonb) from public,anon,authenticated;
create or replace function au_editor_private.api(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $f$
declare d au_editor_private.drafts%rowtype; pub au_editor_private.published%rowtype; v_id uuid; k text; targets text[]; versions jsonb; v text; previous text; digits text; docs jsonb; result jsonb; n integer; valid_profiles constant text[]:=array['web-pc','web-mobile','desktop','ios','android','ps4'];
begin
 if p_action='read' then
  select * into pub from au_editor_private.published where profile=p->>'profile';
  if not found then raise exception 'Destination inconnue.'; end if;
  return jsonb_build_object('document',pub.document,'revision',pub.revision,'version',pub.version);
 end if;
 if p_action='versions' then return (select jsonb_object_agg(profile,version) from au_editor_private.published); end if;
 if auth.uid() is null or not coalesce(public.au_is_creator(),false) then raise insufficient_privilege using message='Accès réservé au Créateur.'; end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'revision',revision,'updated_at',updated_at) order by updated_at desc) from au_editor_private.drafts),'[]'); end if;
 if p_action='load' then
  select * into d from au_editor_private.drafts where id=(p->>'id')::uuid;
  if not found then raise exception 'Brouillon introuvable.'; end if;
  return jsonb_build_object('id',d.id,'name',d.name,'revision',d.revision,'documents',d.documents);
 end if;
 if p_action='save' then
  if length(btrim(coalesce(p->>'name','')))<1 or length(p->>'name')>80 then raise exception 'Donne un nom au brouillon (80 caractères maximum).'; end if;
  docs=p->'documents';if jsonb_typeof(docs) is distinct from 'object' or octet_length(docs::text)>4000000 then raise exception 'Brouillon invalide ou trop volumineux.'; end if;
  foreach k in array valid_profiles loop if not coalesce(au_editor_private.valid_document(docs->k),false) then raise exception 'Présentation invalide pour %.',k; end if;end loop;
  if exists(select 1 from jsonb_object_keys(docs) x where not x=any(valid_profiles)) then raise exception 'Destination inconnue.'; end if;
  v_id=nullif(p->>'id','')::uuid;
  if v_id is null then
   if (select count(*) from au_editor_private.drafts)>=50 then raise exception '50 brouillons sont déjà enregistrés. Exporte et supprime ceux qui ne servent plus.';end if;
   insert into au_editor_private.drafts(name,documents,created_by) values(btrim(p->>'name'),docs,auth.uid()) returning * into d;
  else
   select * into d from au_editor_private.drafts where id=v_id for update;
   if not found then raise exception 'Brouillon introuvable.';end if;
   if d.revision is distinct from (p->>'revision')::bigint then raise exception 'Ce brouillon a changé ailleurs. Exporte tes changements avant de le recharger.';end if;
   update au_editor_private.drafts set name=btrim(p->>'name'),documents=docs,revision=revision+1,updated_at=now() where id=v_id returning * into d;
  end if;
  return jsonb_build_object('id',d.id,'revision',d.revision);
 end if;
 if p_action='history' then return coalesce((select jsonb_agg(jsonb_build_object('version',h.version,'draft_name',h.draft_name,'created_at',h.created_at) order by h.created_at desc) from au_editor_private.history h where h.profile=p->>'profile'),'[]');end if;
 if p_action='history_get' then return (select jsonb_build_object('document',h.document) from au_editor_private.history h where h.profile=p->>'profile' and h.version=p->>'version');end if;
 if p_action='delete' then
  select * into d from au_editor_private.drafts where id=(p->>'id')::uuid for update;
  if not found then raise exception 'Brouillon introuvable.';end if;
  if d.revision is distinct from (p->>'revision')::bigint then raise exception 'Le brouillon a changé ailleurs.';end if;
  delete from au_editor_private.drafts where id=d.id;
  return jsonb_build_object('deleted',true);
 end if;
 if p_action='publish' then
  select * into d from au_editor_private.drafts where id=(p->>'id')::uuid for update;
  if not found or d.revision is distinct from (p->>'revision')::bigint then raise exception 'Enregistre puis recharge le brouillon avant de publier.';end if;
  if jsonb_typeof(p->'profiles') is distinct from 'array' then raise exception 'Choisis les destinations.';end if;
  targets=array(select jsonb_array_elements_text(p->'profiles'));n=cardinality(targets);
  if n<1 or n>6 or (select count(distinct x) from unnest(targets) x)<>n then raise exception 'Choix de destinations invalide.';end if;
  if exists(select 1 from unnest(targets) x where not x=any(valid_profiles)) then raise exception 'Destination inconnue.';end if;
  if targets && array['desktop','android','ps4'] then raise exception 'Windows, Android et PS4 restent en pause. Leurs brouillons sont conservés, mais aucune publication ne les réactive.';end if;
  perform 1 from au_editor_private.published where profile=any(targets) order by profile for update;
  versions=p->'versions';result='{}';
  foreach k in array targets loop
   select * into pub from au_editor_private.published where profile=k;
   if versions->k->>'current' is distinct from pub.version then raise exception 'La version de % a changé : vérifie le nouveau numéro avant de publier.',k;end if;
   if (versions->k->>'automatic')::boolean is true then
    digits=substring(pub.version from '[0-9]+$');v=regexp_replace(pub.version,'[0-9]+$',lpad(((digits::bigint)+1)::text,greatest(length(digits),length(((digits::bigint)+1)::text)),'0'));
   else v=btrim(versions->k->>'value');end if;
   if v is null or length(v)>32 or v!~'^(?:[0-9]{1,6}V)?[0-9]{1,6}(?:[.][0-9]{1,6}){0,3}$' then raise exception 'Indique un numéro de version valide pour %.',k;end if;
   if regexp_split_to_array(replace(upper(v),'V','.'),'[.]')::bigint[] <= regexp_split_to_array(replace(upper(pub.version),'V','.'),'[.]')::bigint[] then raise exception 'La version de % doit être plus récente que %.',k,pub.version;end if;
   insert into au_editor_private.history(profile,version,revision,document,draft_name) values(k,v,pub.revision+1,d.documents->k,d.name);
   update au_editor_private.published set version=v,revision=revision+1,document=d.documents->k,updated_at=now() where profile=k;
   result=jsonb_set(result,array[k],to_jsonb(v));
   delete from au_editor_private.history h where h.profile=k and h.version not in(select x.version from au_editor_private.history x where x.profile=k order by x.created_at desc limit 20);
  end loop;
  return jsonb_build_object('published',result);
 end if;
 raise exception 'Action inconnue.';
end;$f$;
revoke all on function au_editor_private.api(text,jsonb) from public;
grant execute on function au_editor_private.api(text,jsonb) to anon,authenticated;
create or replace function public.au_site_editor_24(p_action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $f$select au_editor_private.api(p_action,p);$f$;
revoke all on function public.au_site_editor_24(text,jsonb) from public;
grant execute on function public.au_site_editor_24(text,jsonb) to anon,authenticated;
commit;
