import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedBetaRelease} from './beta-metadata.mjs';
const valid={patch:'20.0.3',version:'2.0.3',build_number:31,object_path:'betatesting-20-0-3-test-2.ipa'};
test('Keep the already supported private beta and explicitly admit the reviewed handoff build',()=>{
 assert(allowedBetaRelease(valid));
 assert(allowedBetaRelease({...valid,object_path:'betatesting-20-0-2-test-31.ipa'}));
 assert(allowedBetaRelease({patch:'20.0.2',version:'2.0.2',build_number:30,object_path:'betatesting-20-0-2-test-1.ipa'}));
});
test('Reject crossed release identities, arbitrary paths and unreviewed builds',()=>{
 for(const change of [{patch:'20.0.2'},{version:'2.0.2'},{build_number:32},{build_number:'31'},{object_path:'../betatesting-20-0-3-test-2.ipa'},{object_path:'betatesting-20-0-3-test-3.ipa'},{object_path:'/betatesting-20-0-3-test-2.ipa'},{object_path:'public.ipa'}])assert(!allowedBetaRelease({...valid,...change}));
 for(const x of [null,undefined,'20.0.3',{}])assert(!allowedBetaRelease(x));
});

