\set ON_ERROR_STOP on
begin;
set local role anon;
do $t$ begin
 if public.au_site_editor_24('minor_history','{}')<>'[]'::jsonb then raise exception 'Expected empty public feed';end if;
 begin perform public.au_site_editor_24('preview_minor','{}');raise check_violation using message='Anonymous preview allowed';exception when insufficient_privilege then null;end;
 begin perform public.au_site_editor_24('publish','{}');raise check_violation using message='Anonymous publish allowed';exception when insufficient_privilege then null;end;
end $t$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $t$ declare docs jsonb;draft jsonb;preview jsonb;result jsonb;patch jsonb;move jsonb;nextdoc jsonb;before_versions jsonb;before_mobile jsonb;number_before bigint;failure boolean:=false;
begin
 select jsonb_object_agg(k,'{"version":1,"patches":[],"blocks":[]}'::jsonb) into docs from unnest(array['web-pc','web-mobile','ios','desktop','android','ps4']) k;
 patch='{"key":"lyrics","selector":"#lyricsButton","styles":{"width":"80%"},"meta":{"label":"Paroles","kind":"bouton"},"before":{"styles":{"width":"66%"},"place":{"parent":"#player","index":0,"label":"Lecteur"}}}';
 move='{"key":"immersion","selector":"#immersionButton","styles":{},"meta":{"label":"Immersion","kind":"bouton"},"before":{"place":{"parent":"#player","index":1,"label":"Lecteur"}},"place":{"parent":"#settings","index":0,"label":"Paramètres"}}';
 nextdoc=jsonb_build_object('version',1,'patches',jsonb_build_array(patch,move),'blocks','[]'::jsonb);
 docs=jsonb_set(jsonb_set(docs,'{web-pc}',nextdoc),'{ios}',nextdoc);
 draft=public.au_site_editor_24('save',jsonb_build_object('name','Isolated test only','documents',docs));
 preview=public.au_site_editor_24('preview_minor',jsonb_build_object('id',draft->>'id','revision',draft->'revision','profiles',jsonb_build_array('web-pc','ios')));
 if jsonb_array_length(preview->'changes')<>2 then raise exception 'Expected 2 grouped notes: %',preview;end if;
 if not exists(select 1 from jsonb_array_elements(preview->'changes') c where c->>'text' like '%66 % à 80 %%' and jsonb_array_length(c->'platforms')=2) then raise exception 'Wrong exact width/platform grouping: %',preview;end if;
 if not exists(select 1 from jsonb_array_elements(preview->'changes') c where c->>'text' like '%Immersion%Lecteur%Paramètres%') then raise exception 'Missing named move';end if;
 before_versions=public.au_site_editor_24('versions','{}');before_mobile=public.au_site_editor_24('read','{"profile":"web-mobile"}');
 result=public.au_site_editor_24('publish',jsonb_build_object('id',draft->>'id','revision',draft->'revision','profiles',jsonb_build_array('web-pc','ios'),'expected_revisions',preview->'revisions'));
 if result->>'adjustment'<>'1' then raise exception 'First adjustment not 1';end if;
 if before_versions<>public.au_site_editor_24('versions','{}') then raise exception 'Application version was changed';end if;
 if before_mobile<>public.au_site_editor_24('read','{"profile":"web-mobile"}') then raise exception 'Unselected platform changed';end if;
 -- Multiple draft edits collapse into only the final published difference.
 docs=jsonb_set(docs,'{web-pc,patches,0,styles,width}','"85%"');draft=public.au_site_editor_24('save',jsonb_build_object('id',draft->>'id','revision',draft->'revision','name','Draft intermediate','documents',docs));
 docs=jsonb_set(docs,'{web-pc,patches,0,styles,width}','"75%"');draft=public.au_site_editor_24('save',jsonb_build_object('id',draft->>'id','revision',draft->'revision','name','Draft final','documents',docs));
 preview=public.au_site_editor_24('preview_minor',jsonb_build_object('id',draft->>'id','revision',draft->'revision','profiles',jsonb_build_array('web-pc')));
 if jsonb_array_length(preview->'changes')<>1 or preview->'changes'->0->>'text' not like '%80 % à 75 %%' then raise exception 'Intermediate edit leaked: %',preview;end if;
 -- A stale confirmation must not change data or create a publication.
 begin perform public.au_site_editor_24('publish',jsonb_build_object('id',draft->>'id','revision',draft->'revision','profiles',jsonb_build_array('web-pc'),'expected_revisions','{"web-pc":0}'::jsonb));exception when raise_exception then failure=true;end;
 if not failure then raise exception 'Stale confirmation accepted';end if;
 if (select count(*) from au_editor_private.minor_publications)<>1 then raise exception 'Duplicate publication';end if;
 -- Newly added blocks report their final text only, never draft intermediate values.
 if (select count(*) from au_editor_private.presentation_diff('{"version":1,"patches":[],"blocks":[]}','{"version":1,"patches":[{"key":"new","selector":"#au-custom-new","text":"Texte final","styles":{},"meta":{"label":"Texte intermédiaire","kind":"texte"},"before":{"text":"Texte intermédiaire"}}],"blocks":[{"id":"new","type":"text","parent":"#home","parentLabel":"Écouter","text":"Texte intermédiaire"}]}'))<>1 then raise exception 'New block draft edits leaked';end if;
 if not exists(select 1 from au_editor_private.presentation_diff('{"version":1,"patches":[],"blocks":[]}','{"version":1,"patches":[{"key":"new","selector":"#au-custom-new","text":"Texte final","styles":{}}],"blocks":[{"id":"new","type":"text","parent":"#home","text":"Texte intermédiaire"}]}') x where x->>'text' like '%Texte final%' and x->>'text' not like '%Texte intermédiaire%') then raise exception 'Final added text missing';end if;
 -- Private tool and secret-zone changes never become public notes.
 if exists(select 1 from au_editor_private.presentation_diff('{"version":1,"patches":[],"blocks":[]}',jsonb_build_object('version',1,'patches',jsonb_build_array(jsonb_set(patch,'{meta,private}','true')),'blocks','[]'::jsonb))) then raise exception 'Private change leaked';end if;
 if exists(select 1 from au_editor_private.presentation_diff('{"version":1,"patches":[],"blocks":[]}','{"version":1,"patches":[],"blocks":[{"id":"hidden","type":"text","parent":"#accountDialog","text":"secret"}]}')) then raise exception 'Private block leaked';end if;
 begin perform public.au_site_editor_24('preview_minor',jsonb_build_object('id',draft->>'id','revision',draft->'revision','profiles',jsonb_build_array('android')));raise check_violation using message='Paused platform allowed';exception when raise_exception then null;end;
end $t$;
set local role anon;
select public.au_site_editor_24('minor_history','{}') as verified_public_feed;
reset role;
rollback;
select 'PASS exact before/after, per-change destinations, draft collapse, unchanged binary versions, no duplicates, private exclusions, paused apps and access controls' as result;
