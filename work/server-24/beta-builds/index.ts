// Test builds 24.0.
// • Public list: every ready test build, without notes or storage paths (3.2, 3.4).
// • Unlock: a 6-digit code checked on the server, with attempt limits (3.3).
//   Only an HMAC of the code is stored; changing it invalidates the old code
//   and every ticket minted with it.
// • Download tickets are short-lived (5 min) and signed; the file path is
//   never revealed to the browser.
// • Creator: set the code (never read it back). Deployment: upload builds.
import {sha256} from 'npm:@noble/hashes@1.8.0/sha256';
import {allowedBetaRelease} from './beta-metadata.mjs';
const root=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,bucket='au-beta-builds';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
const enc=new TextEncoder(),hex=(v:Uint8Array)=>Array.from(v,n=>n.toString(16).padStart(2,'0')).join('');
const b64=(s:string)=>btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=(s:string)=>atob(s.replaceAll('-','+').replaceAll('_','/'));
async function mac(s:string,purpose='ticket'){const k=await crypto.subtle.importKey('raw',enc.encode(purpose+':'+key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(s))));}
const same=(a:string,b:string)=>{const x=sha256(enc.encode(a)),y=sha256(enc.encode(b));return x.reduce((r,v,i)=>r|(v^y[i]),0)===0;};
async function api(path:string,method='GET',body?:unknown,token=key){const response=await fetch(root+path,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('backend_'+response.status);return response.status===204?null:response.json();}
async function creator(token:string){const user=await api('/auth/v1/user','GET',undefined,token);if(!user.id||!await api('/rest/v1/rpc/au_is_creator','POST',{},token))throw Error('not_creator');return user.id;}
async function deployment(token:string){const value=await api('/rest/v1/rpc/au_promo_worker','POST',{p_action:'credentials',p_payload:{}});if(!same(token,value.cronToken))throw Error('not_deployment');}
const result=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
const PUBLIC_FIELDS='id,platform,version,build_number,bytes,sha256,created_at';
async function access(){return (await api('/rest/v1/au_beta_access_24?id=eq.1&select=code_hash,code_version,updated_at'))[0]||{code_hash:null,code_version:0};}
function clientIp(request:Request){return (request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim();}
// Limits: 5 wrong codes per device address per 15 min, 15 per day;
// above 60 wrong codes in one hour (any address) every unlock pauses for the hour.
async function limited(ipHash:string){
 const since=(ms:number)=>encodeURIComponent(new Date(Date.now()-ms).toISOString());
 const count=async(q:string)=>{const r=await fetch(root+'/rest/v1/au_beta_attempts_24?'+q+'&ok=eq.false&select=id',{method:'HEAD',headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'}});return Number(r.headers.get('content-range')?.split('/')[1]||0);};
 if(await count('ip_hash=eq.'+ipHash+'&at=gte.'+since(15*60000))>=5)return 'Trop d’essais. Réessaie dans 15 minutes.';
 if(await count('ip_hash=eq.'+ipHash+'&at=gte.'+since(86400000))>=15)return 'Trop d’essais aujourd’hui. Réessaie demain.';
 if(await count('at=gte.'+since(3600000))>=60)return 'Les versions de test sont temporairement verrouillées. Réessaie plus tard.';
 return '';
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('',{headers:cors});
 try{
  const url=new URL(request.url),token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  if(request.method==='GET'){
   const ticket=url.searchParams.get('ticket')||'',signature=url.searchParams.get('signature')||'';
   if(!ticket||!same(signature,await mac(ticket)))return result({error:'download_forbidden'},403);
   const payload=JSON.parse(unb64(ticket));
   if(payload.exp<Date.now()||payload.exp>Date.now()+310000)return result({error:'ticket_expired'},403);
   if(payload.kind==='code'){const current=await access();if(!current.code_hash||Number(current.code_version)!==Number(payload.v))return result({error:'download_forbidden'},403);}
   else{ // creator tickets kept for applications 23.1 and earlier
    const roles=await api('/rest/v1/au_account_roles?user_id=eq.'+encodeURIComponent(payload.user)+'&role=eq.creator&select=user_id');
    const user=await api('/auth/v1/admin/users/'+encodeURIComponent(payload.user));
    if(!roles.length||!user.email_confirmed_at||user.banned_until&&Date.parse(user.banned_until)>Date.now())return result({error:'download_forbidden'},403);
   }
   const rows=await api('/rest/v1/au_beta_builds_20?id=eq.'+encodeURIComponent(payload.id)+'&ready=eq.true&select=*');const row=rows[0];if(!row)return result({error:'unavailable'},404);
   const parts=row.parts;if(!Array.isArray(parts)||!parts.length)throw Error('parts_absent');
   let index=0,total=0;const hash=sha256.create();
   const stream=new ReadableStream({async pull(controller){try{if(index>=parts.length){if(total!==Number(row.bytes)||hex(hash.digest())!==row.sha256)throw Error('package_corrupt');controller.close();return;}const part=parts[index++];const response=await fetch(root+'/storage/v1/object/authenticated/'+bucket+'/'+part.path,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('part_unavailable');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==part.bytes||hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))!==part.sha256)throw Error('part_corrupt');total+=bytes.length;hash.update(bytes);controller.enqueue(bytes);}catch(e){controller.error(e);}}});
   const name='Avant-Usine-'+(row.platform==='ios'?'iOS':row.platform==='windows'?'Windows':row.platform)+'-'+row.version+'-test-'+row.build_number+'.'+(row.object_path.split('.').at(-1)||'bin');
   return new Response(stream,{headers:{...cors,'Content-Type':'application/octet-stream','Content-Length':String(row.bytes),'Content-Disposition':'attachment; filename="'+name+'"','Cache-Control':'private, no-store'}});
  }
  if(request.method!=='POST')return result({error:'method_not_allowed'},405);
  const body=await request.json();
  if(body.action==='public_list'){const rows=await api('/rest/v1/au_beta_builds_20?ready=eq.true&select='+PUBLIC_FIELDS+'&order=created_at.desc&limit=20');const a=await access();return result({builds:rows,locked:!a.code_hash});}
  if(body.action==='unlock'){
   const code=String(body.code||'');if(!/^[0-9]{6}$/.test(code))return result({error:'Le code contient 6 chiffres.'},400);
   const ipHash=await mac(clientIp(request),'ip');const wait=await limited(ipHash);if(wait)return result({error:wait},429);
   const a=await access();if(!a.code_hash)return result({error:'Aucun code n’est encore défini pour les versions de test.'},403);
   const ok=same(await mac(code+':'+a.code_version,'code'),a.code_hash);
   await api('/rest/v1/au_beta_attempts_24','POST',{ip_hash:ipHash,ok});
   if(!ok)return result({error:'Code incorrect.'},403);
   const rows=await api('/rest/v1/au_beta_builds_20?id=eq.'+encodeURIComponent(body.id)+'&ready=eq.true&select=id');if(!rows.length)return result({error:'Cette version de test n’est plus disponible.'},404);
   const ticket=b64(JSON.stringify({kind:'code',id:rows[0].id,v:a.code_version,exp:Date.now()+300000}));
   return result({url:root+'/functions/v1/beta-builds?ticket='+ticket+'&signature='+await mac(ticket)});
  }
  if(!token)return result({error:'authentication_required'},401);
  if(body.action==='code_status'){await creator(token);const a=await access();return result({configured:!!a.code_hash,updated_at:a.code_hash?a.updated_at:null});}
  if(body.action==='set_code'){await creator(token);const code=String(body.code||'');if(!/^[0-9]{6}$/.test(code))return result({error:'Le code doit contenir exactement 6 chiffres.'},400);const a=await access(),version=Number(a.code_version||0)+1;await api('/rest/v1/au_beta_access_24?id=eq.1','PATCH',{code_hash:await mac(code+':'+version,'code'),code_version:version,updated_at:new Date().toISOString()});return result({configured:true,updated_at:new Date().toISOString()});}
  if(body.action==='download'){const owner=await creator(token),rows=await api('/rest/v1/au_beta_builds_20?id=eq.'+encodeURIComponent(body.id)+'&ready=eq.true&select=id');if(!rows.length)return result({error:'unavailable'},404);const ticket=b64(JSON.stringify({id:rows[0].id,user:owner,exp:Date.now()+300000}));return result({url:root+'/functions/v1/beta-builds?ticket='+ticket+'&signature='+await mac(ticket)});}
  await deployment(token);
  if(body.action==='prepare'){
   const m=body.metadata;if(!allowedBetaRelease(m)||!Number.isInteger(m.build_number)||m.build_number<1||m.bytes<1||m.bytes>300000000||!/^[a-f0-9]{64}$/.test(m.sha256)||!Array.isArray(m.parts)||m.parts.length<1||m.parts.length>80)throw Error('invalid_metadata');
   let total=0;for(let i=0;i<m.parts.length;i++){const p=m.parts[i];if(p.path!==m.object_path+'/part-'+String(i).padStart(3,'0')||!Number.isInteger(p.bytes)||p.bytes<1||p.bytes>4194304||!/^[a-f0-9]{64}$/.test(p.sha256))throw Error('invalid_part');total+=p.bytes;}if(total!==m.bytes)throw Error('invalid_size');
   const existing=await api('/rest/v1/au_beta_builds_20?object_path=eq.'+encodeURIComponent(m.object_path)+'&select=id,ready');if(existing[0]?.ready)throw Error('immutable_build');
   const record={patch:m.patch,platform:m.platform,version:m.version,build_number:m.build_number,object_path:m.object_path,sha256:m.sha256,bytes:m.bytes,notes:String(m.notes||'').slice(0,4000),parts:m.parts,ready:false};let id;
   if(existing.length){id=existing[0].id;await api('/rest/v1/au_beta_builds_20?id=eq.'+id,'PATCH',record);}else id=(await api('/rest/v1/au_beta_builds_20','POST',record))[0].id;
   const uploads=[];for(const part of m.parts){const value=await api('/storage/v1/object/upload/sign/'+bucket+'/'+part.path,'POST',{upsert:true});uploads.push({path:part.path,url:root+'/storage/v1'+value.url});}return result({id,uploads});
  }
  if(body.action==='complete'){
   const rows=await api('/rest/v1/au_beta_builds_20?id=eq.'+encodeURIComponent(body.id)+'&select=*');const row=rows[0];if(!row||row.ready)throw Error('invalid_build');let total=0;const hash=sha256.create();
   for(const part of row.parts){const response=await fetch(root+'/storage/v1/object/authenticated/'+bucket+'/'+part.path,{headers:{apikey:key,Authorization:'Bearer '+key}});if(!response.ok)throw Error('missing_part');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==part.bytes||hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))!==part.sha256)throw Error('corrupt_part');total+=bytes.length;hash.update(bytes);}
   if(total!==Number(row.bytes)||hex(hash.digest())!==row.sha256)throw Error('corrupt_package');await api('/rest/v1/au_beta_builds_20?id=eq.'+row.id,'PATCH',{ready:true});return result({ready:true,id:row.id,bytes:total,sha256:row.sha256});
  }
  return result({error:'unknown_action'},400);
 }catch(e){const message=e instanceof Error?e.message:'';return result({error:message==='not_creator'||message==='not_deployment'?'access_denied':'beta_service_unavailable'},message==='not_creator'||message==='not_deployment'?403:502);}
});
