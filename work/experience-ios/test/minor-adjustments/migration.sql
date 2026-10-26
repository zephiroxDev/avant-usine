begin;
create or replace function au_editor_private.base_api(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $f$
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
revoke all on function au_editor_private.base_api(text,jsonb) from public,anon,authenticated;
create table au_editor_private.minor_counter(singleton boolean primary key default true check(singleton),last_number bigint not null default 0);
insert into au_editor_private.minor_counter(singleton) values(true);
create table au_editor_private.minor_publications(number bigint primary key,created_at timestamptz not null default now(),changes jsonb not null);
alter table au_editor_private.minor_counter enable row level security;
alter table au_editor_private.minor_publications enable row level security;
revoke all on au_editor_private.minor_counter,au_editor_private.minor_publications from public,anon,authenticated;
create or replace function au_editor_private.note_value(v jsonb) returns text language sql immutable set search_path='' as $$
 select case when v is null or v='null'::jsonb then 'valeur d’origine' else regexp_replace(left(v#>>'{}',240),'([0-9])(%|px)$','\1 \2') end;
$$;
create or replace function au_editor_private.presentation_diff(a jsonb,b jsonb) returns setof jsonb language plpgsql immutable set search_path='' as $$
declare item_key text;p jsonb;q jsonb;baseline jsonb;label text;subject text;genitive text;prop text;old_value jsonb;new_value jsonb;sentence text;old_place jsonb;new_place jsonb;block_patch jsonb;prop_names constant jsonb:='{"font-size":"Taille du texte","width":"Largeur","max-width":"Largeur maximale","min-height":"Hauteur minimale","padding":"Espace intérieur","margin":"Marge extérieure","gap":"Espacement","border-radius":"Arrondi","color":"Couleur du texte","background-color":"Couleur du fond","opacity":"Opacité","font-weight":"Épaisseur du texte","text-align":"Alignement du texte"}';
begin
 for item_key in select x->>'key' from jsonb_array_elements(a->'patches') x union select x->>'key' from jsonb_array_elements(b->'patches') x loop
  select x into p from jsonb_array_elements(a->'patches') x where x->>'key'=item_key;
  select x into q from jsonb_array_elements(b->'patches') x where x->>'key'=item_key;
  if coalesce(q->'meta'->>'private',p->'meta'->>'private','false')='true' or coalesce(q->>'selector',p->>'selector','')~*'#(accountDialog|creatorDialog|catalogDialog)|data-au-access|data-secret-zone' then continue;end if;
  if exists(select 1 from jsonb_array_elements(b->'blocks') x where '#au-custom-'||(x->>'id')=q->>'selector') and not exists(select 1 from jsonb_array_elements(a->'blocks') x where '#au-custom-'||(x->>'id')=q->>'selector') then continue;end if;
  baseline=coalesce(p->'before',q->'before','{}');label=left(coalesce(q->'meta'->>'label',p->'meta'->>'label',baseline->>'label','Élément'),100);
  subject=coalesce(q->'meta'->>'kind',p->'meta'->>'kind','élément')||' « '||label||' »';genitive=case when subject like 'image %' then 'de l’'||subject when subject like 'élément %' then 'de l’'||subject else 'du '||subject end;
  for prop in select jsonb_object_keys(coalesce(p->'styles','{}')) union select jsonb_object_keys(coalesce(q->'styles','{}')) loop
   if not prop_names?prop then continue;end if;
   old_value=coalesce(p->'styles'->prop,baseline->'styles'->prop);new_value=coalesce(q->'styles'->prop,baseline->'styles'->prop);
   if old_value is distinct from new_value then
    sentence=(prop_names->>prop)||' '||genitive||' : de '||au_editor_private.note_value(old_value)||' à '||au_editor_private.note_value(new_value)||'.';
    return next jsonb_build_object('text',sentence,'kind','style','property',prop);
   end if;
  end loop;
  for prop in select unnest(array['text','href','image','hidden']) loop
   old_value=coalesce(p->prop,baseline->prop,case when prop='hidden' then 'false'::jsonb else null end);new_value=coalesce(q->prop,baseline->prop,case when prop='hidden' then 'false'::jsonb else null end);
   if old_value is distinct from new_value then
    sentence=case prop when 'text' then 'Texte '||genitive||' : « '||au_editor_private.note_value(old_value)||' » → « '||au_editor_private.note_value(new_value)||' ».' when 'href' then 'Destination du lien '||genitive||' : de « '||au_editor_private.note_value(old_value)||' » vers « '||au_editor_private.note_value(new_value)||' ».' when 'image' then 'Image '||genitive||' remplacée.' else case when new_value='true'::jsonb then 'Masquage de ' else 'Réaffichage de ' end||subject||'.' end;
    return next jsonb_build_object('text',sentence,'kind',prop);
   end if;
  end loop;
  old_place=coalesce(p->'place',baseline->'place');new_place=coalesce(q->'place',baseline->'place');
  if (old_place->>'parent') is distinct from (new_place->>'parent') then
   sentence='Déplacement '||genitive||' de « '||coalesce(old_place->>'label','emplacement d’origine')||' » vers « '||coalesce(new_place->>'label','nouvel emplacement')||' ».';
   return next jsonb_build_object('text',sentence,'kind','move');
  elsif (old_place->>'index') is distinct from (new_place->>'index') then
   sentence='Position '||genitive||' dans « '||coalesce(new_place->>'label',old_place->>'label','son bloc')||' » : de '||case when old_place->>'index'~'^[0-9]+$' then ((old_place->>'index')::integer+1)::text else 'la position d’origine' end||' à '||case when new_place->>'index'~'^[0-9]+$' then ((new_place->>'index')::integer+1)::text else 'la position d’origine' end||'.';
   return next jsonb_build_object('text',sentence,'kind','move');
  end if;
 end loop;
 for item_key in select x->>'id' from jsonb_array_elements(a->'blocks') x union select x->>'id' from jsonb_array_elements(b->'blocks') x loop
  select x into p from jsonb_array_elements(a->'blocks') x where x->>'id'=item_key;
  select x into q from jsonb_array_elements(b->'blocks') x where x->>'id'=item_key;
  if coalesce(q->>'private',p->>'private','false')='true' or coalesce(q->>'parent',p->>'parent','')~*'#(accountDialog|creatorDialog|catalogDialog)|data-au-access|data-secret-zone' then continue;end if;
  select x into block_patch from jsonb_array_elements(b->'patches') x where x->>'selector'='#au-custom-'||item_key;
  if p is null and block_patch->>'hidden'='true' then continue;end if;
  label=left(coalesce(block_patch->>'text',q->>'text',p->>'text','Élément'),100);
  if p is null then sentence='Ajout de '||case q->>'type' when 'heading' then 'titre' when 'button' then 'bouton-lien' when 'image' then 'image' else 'texte' end||' « '||label||' » dans « '||coalesce(block_patch->'place'->>'label',q->>'parentLabel','le bloc choisi')||' ».';
  elsif q is null then sentence='Suppression de l’élément « '||label||' ».';
  elsif p is distinct from q then sentence='Modification de l’élément ajouté « '||label||' ».';
  else continue;end if;
  return next jsonb_build_object('text',sentence,'kind','block');
 end loop;
end;$$;
revoke all on function au_editor_private.presentation_diff(jsonb,jsonb),au_editor_private.note_value(jsonb) from public,anon,authenticated;
create or replace function au_editor_private.preview_minor(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare d au_editor_private.drafts%rowtype;pub au_editor_private.published%rowtype;k text;targets text[];changes jsonb:='[]';versions jsonb:='{}';v_item jsonb;grouped jsonb;changed boolean:=false;
begin
 if auth.uid() is null or not coalesce(public.au_is_creator(),false) then raise insufficient_privilege using message='Accès réservé au Créateur.';end if;
 select * into d from au_editor_private.drafts where id=(p->>'id')::uuid;
 if not found or d.revision is distinct from (p->>'revision')::bigint then raise exception 'Enregistre puis recharge le brouillon avant de publier.';end if;
 if jsonb_typeof(p->'profiles') is distinct from 'array' then raise exception 'Choisis les destinations.';end if;
 targets=array(select jsonb_array_elements_text(p->'profiles'));
 if cardinality(targets) not between 1 and 6 or (select count(distinct x) from unnest(targets) x)<>cardinality(targets) then raise exception 'Choix de destinations invalide.';end if;
 if exists(select 1 from unnest(targets) x where x not in('web-pc','web-mobile','ios')) then raise exception 'Destination inconnue ou application en pause.';end if;
 foreach k in array targets loop
  select * into pub from au_editor_private.published where profile=k;
  versions=jsonb_set(versions,array[k],to_jsonb(pub.revision));
  if pub.document is distinct from d.documents->k then changed=true;end if;
  for v_item in select * from au_editor_private.presentation_diff(pub.document,d.documents->k) loop changes=changes||jsonb_build_array(v_item||jsonb_build_object('profile',k));end loop;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',md5(text),'text',text,'platforms',profiles) order by text),'[]') into grouped from (select item->>'text' text,jsonb_agg(distinct item->>'profile') profiles from jsonb_array_elements(changes) item group by item->>'text') x;
 return jsonb_build_object('changes',grouped,'revisions',versions,'changed',changed,'draftRevision',d.revision,'nextNumber',(select last_number+1 from au_editor_private.minor_counter where singleton));
end;$$;
revoke all on function au_editor_private.preview_minor(jsonb) from public,anon,authenticated;
create or replace function au_editor_private.api(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare preview jsonb;d au_editor_private.drafts%rowtype;k text;targets text[];minor_number bigint;v_changes jsonb;version_number text;revisions jsonb:='{}';
begin
 if p_action='minor_history' then return coalesce((select jsonb_agg(jsonb_build_object('number',h.number,'created_at',h.created_at,'changes',h.changes) order by h.number desc) from (select * from au_editor_private.minor_publications where nullif(p->>'before','') is null or number<(p->>'before')::bigint order by number desc limit 25) h),'[]');end if;
 if p_action='preview_minor' then return au_editor_private.preview_minor(p);end if;
 if p_action<>'publish' then return au_editor_private.base_api(p_action,p);end if;
 if auth.uid() is null or not coalesce(public.au_is_creator(),false) then raise insufficient_privilege using message='Accès réservé au Créateur.';end if;
 select * into d from au_editor_private.drafts where id=(p->>'id')::uuid for update;
 targets=array(select jsonb_array_elements_text(p->'profiles'));
 perform 1 from au_editor_private.published where profile=any(targets) order by profile for update;
 preview=au_editor_private.preview_minor(p);
 if not (preview->>'changed')::boolean then raise exception 'Aucun changement à publier pour ces destinations.';end if;
 if p->'expected_revisions' is distinct from preview->'revisions' then raise exception 'La présentation publiée a changé. Actualise l’éditeur et relis les ajustements avant de publier.';end if;
 v_changes=preview->'changes';
 if jsonb_array_length(v_changes)>0 then
  update au_editor_private.minor_counter set last_number=last_number+1 where singleton returning last_number into minor_number;
  if p?'notes' then
   if jsonb_typeof(p->'notes') is distinct from 'object' then raise exception 'Notes invalides.';end if;
   if exists(select 1 from jsonb_object_keys(p->'notes') x where not exists(select 1 from jsonb_array_elements(v_changes) c where c->>'id'=x)) then raise exception 'Une note ne correspond plus aux changements.';end if;
   if exists(select 1 from jsonb_each(p->'notes') x where jsonb_typeof(x.value)<>'string' or length(btrim(x.value#>>'{}')) not between 1 and 1000) then raise exception 'Chaque note doit contenir entre 1 et 1000 caractères.';end if;
   select jsonb_agg(c||jsonb_build_object('text',coalesce(p->'notes'->> (c->>'id'),c->>'text'))) into v_changes from jsonb_array_elements(v_changes) c;
  end if;
  insert into au_editor_private.minor_publications(number,changes) values(minor_number,v_changes);
 end if;
 foreach k in array targets loop
  if d.documents->k is not distinct from (select document from au_editor_private.published where profile=k) then continue;end if;
  update au_editor_private.published set document=d.documents->k,revision=revision+1,updated_at=now() where profile=k;
  select jsonb_build_object('revision',revision,'version',version) into preview from au_editor_private.published where profile=k;
  revisions=jsonb_set(revisions,array[k],preview);
  insert into au_editor_private.history(profile,version,revision,document,draft_name) select k,'minor:'||revision::text,revision,document,d.name from au_editor_private.published where profile=k;
 end loop;
 return jsonb_build_object('published',revisions,'adjustment',minor_number);
end;$$;
revoke all on function au_editor_private.api(text,jsonb) from public;
grant execute on function au_editor_private.api(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
