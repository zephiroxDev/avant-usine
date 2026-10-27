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

test('Private22.1 only admits the exact reviewed build tuple',()=>{
 const m={patch:'22.1',version:'2.2.1',build_number:42,object_path:'betatesting-22-1-test-1.ipa'};assert(allowedBetaRelease(m));
 for(const change of [{patch:'22.0'},{version:'2.2.0'},{build_number:41},{build_number:43},{object_path:'public.ipa'},{object_path:'../betatesting-22-1-test-1.ipa'}])assert(!allowedBetaRelease({...m,...change}));
});

test('Device feedback build43 uses an iOS-download-compatible filename',()=>{
 const m={patch:'22.1',version:'2.2.1',build_number:43,object_path:'betatesting-22-1-0-test-2.ipa'};assert(allowedBetaRelease(m));assert(/^betatesting-[0-9]+-[0-9]+-[0-9]+-test-[1-9][0-9]*\.ipa$/.test(m.object_path));assert(!allowedBetaRelease({...m,build_number:42}));assert(!allowedBetaRelease({...m,object_path:'betatesting-22-1-test-2.ipa'}));
});
