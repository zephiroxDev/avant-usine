// Temporary artifact transport. Only the already signed Android 0.3.0 parts are addressable.
const root=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,bucket='au-release-stage';
const names=Array.from({length:34},(_,i)=>'android-0.3.0/Avant-Usine-Android-0.3.0.apk.b64part'+String(i).padStart(3,'0'));
async function storage(path:string,method:string,body:unknown){const r=await fetch(root+'/storage/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw Error('storage_'+r.status);return data;}
async function same(a:string,b:string){const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([digest(a),digest(b)]);return x.reduce((d,n,i)=>d|(n^y[i]),0)===0;}
Deno.serve(async request=>{if(request.method!=='POST')return new Response('',{status:405});const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return new Response('',{status:401});try{
 const r=await fetch(root+'/rest/v1/rpc/au_promo_worker',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_action:'credentials',p_payload:{}}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('auth_backend');const credentials=await r.json();if(!await same(token,credentials.cronToken))return new Response('',{status:401});
 const body=await request.json();if(body.action==='cleanup'){await storage('object/'+bucket,'DELETE',{prefixes:names});return Response.json({cleaned:names.length});}
 if(body.action!=='prepare')return new Response('',{status:400});
 // Existence is checked without creating or modifying any other bucket.
 const existing=await fetch(root+'/storage/v1/bucket/'+bucket,{headers:{apikey:key,Authorization:'Bearer '+key}});
 if(existing.status===404||existing.status===400)await storage('bucket','POST',{id:bucket,name:bucket,public:true,file_size_limit:10485760,allowed_mime_types:['text/plain']});else if(!existing.ok)throw Error('bucket_check');
 const parts=[];for(const path of names){const signed=await storage('object/upload/sign/'+bucket+'/'+path,'POST',{upsert:true});parts.push({path,upload:root+'/storage/v1'+signed.url,public:root+'/storage/v1/object/public/'+bucket+'/'+path});}
 return Response.json({parts});
}catch{return Response.json({error:'artifact_transport_failed'},{status:502});}});
