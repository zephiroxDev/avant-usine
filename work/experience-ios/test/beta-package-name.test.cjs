const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('Private package filenames are not restricted to a historical patch',()=>{
 const swift=fs.readFileSync(path.join(__dirname,'../native/IOSUpdates.swift'),'utf8');
 const pattern=swift.match(/name\.range\(of: "(\^betatesting-[^"]+)"/)[1].replace(/\\\\/g,'\\');
 const accepts=new RegExp(pattern);
 for(const name of ['betatesting-20-0-2-test-1.ipa','betatesting-20-0-3-test-2.ipa','betatesting-21-0-0-test-12.ipa'])assert(accepts.test(name),name);
 for(const name of ['../betatesting-20-0-3-test-2.ipa','betatesting-20-0-3-test-0.ipa','betatesting-20-0-3-test-2.ipa.exe','public.ipa'])assert(!accepts.test(name),name);
 assert(swift.includes('url.host == "djjfzymrkncwhrocpxjo.supabase.co" && url.path == "/functions/v1/beta-builds"'));
});
