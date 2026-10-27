begin;
do $$ declare r jsonb; begin
 r:=public.au_visit_count_22_1('11111111-1111-4111-8111-111111111111',true);
 assert (r->>'total')::bigint=1 and (r->>'counted')::boolean;
 r:=public.au_visit_count_22_1('11111111-1111-4111-8111-111111111111',true);
 assert (r->>'total')::bigint=1 and not (r->>'counted')::boolean;
 update au22_metrics_private.visit_sessions set last_seen=clock_timestamp()-interval '31 minutes';
 r:=public.au_visit_count_22_1('11111111-1111-4111-8111-111111111111',true);
 assert (r->>'total')::bigint=2 and (r->>'counted')::boolean;
 r:=public.au_visit_count_22_1(null,false);assert (r->>'total')::bigint=2;
 assert not has_table_privilege('anon','au22_metrics_private.visit_sessions','select');
 assert not has_table_privilege('authenticated','au22_metrics_private.visit_total','update');
 assert has_function_privilege('anon','public.au_visit_count_22_1(uuid,boolean)','execute');
end $$;
set local role anon;
select public.au_visit_count_22_1('22222222-2222-4222-8222-222222222222',true);
reset role;
do $$ begin assert (public.au_visit_count_22_1(null,false)->>'total')::bigint=3; end $$;
rollback;
