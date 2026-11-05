-- Patch 24.0 — à appliquer seulement après validation de l'aperçu.

-- 2.4 : une synchronisation peut accompagner des paroles encore en attente.
-- Sans paroles publiées ni widget Genius, la source devient la dernière
-- contribution EN ATTENTE de la personne connectée (jamais celle d'un autre).
create or replace function public.au_sync_source(k text)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare t jsonb;l jsonb;txt text;prov text;begin
 select x into t from public.au_catalog c cross join lateral jsonb_array_elements(c.published->'tracks') x where c.number::text||':'||(x->>'number')=k;
 if t is null then raise exception 'Morceau introuvable.';end if;
 txt:=btrim(coalesce(t->>'lyrics',''));prov:='catalogue';
 if txt='' then select body into txt from public.au_genius_sync_text where track_key=k and genius_id=t->'genius'->>'id';prov:='widget Genius — texte proposé, à vérifier';end if;
 if coalesce(btrim(txt),'')='' and coalesce(t->'genius'->>'id','')='' and auth.uid() is not null then
  select body into txt from public.au_lyrics_contributions where track_key=k and user_id=auth.uid() and status='pending' order by id desc limit 1;
  prov:='contribution en attente de validation';
 end if;
 l:=public.au_lyric_lines(coalesce(txt,''));
 return jsonb_build_object('track',k,'title',t->>'title','src',t->>'src','lines',l,'hash',md5(l::text),'provenance',prov);
end $function$;

-- 3 : code d'accès des versions de test. Seule une empreinte HMAC est stockée
-- (calculée par la fonction Edge avec un secret serveur) ; aucune lecture publique.
create table if not exists public.au_beta_access_24(
 id smallint primary key default 1 check(id=1),
 code_hash text,
 code_version integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.au_beta_access_24 enable row level security;
revoke all on public.au_beta_access_24 from anon,authenticated;
insert into public.au_beta_access_24(id) values(1) on conflict do nothing;

create table if not exists public.au_beta_attempts_24(
 id bigserial primary key,
 ip_hash text not null,
 ok boolean not null,
 at timestamptz not null default now()
);
create index if not exists au_beta_attempts_24_ip on public.au_beta_attempts_24(ip_hash,at desc);
create index if not exists au_beta_attempts_24_at on public.au_beta_attempts_24(at desc);
alter table public.au_beta_attempts_24 enable row level security;
revoke all on public.au_beta_attempts_24 from anon,authenticated;

-- Les fiches de versions de test : les notes restent privées (3.4).
revoke select on public.au_beta_builds_20 from anon;
