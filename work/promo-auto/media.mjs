import {BASE,MEDIA_BASE} from './worker.mjs';
export async function ensureMedia(asset,{root,key,fetcher=fetch}) {
  if(root!=='https://djjfzymrkncwhrocpxjo.supabase.co'||!asset.startsWith(MEDIA_BASE))return false;
  const filename=asset.slice(MEDIA_BASE.length);if(!/^promo-[a-z0-9-]+\.mp4$/.test(filename))return false;
  const ready=async()=>{const r=await fetcher(asset,{method:'HEAD',signal:AbortSignal.timeout(10000)});return r.ok&&(r.headers.get('Content-Type')||'').includes('video/mp4')};
  if(await ready())return true;
  const source=await fetcher(BASE+filename,{signal:AbortSignal.timeout(20000)}),limit=10*1024*1024;
  if(!source.ok||!(source.headers.get('Content-Type')||'').includes('video/mp4')||Number(source.headers.get('Content-Length'))>limit||!source.body)return false;
  const reader=source.body.getReader(),chunks=[];let total=0;
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();return false;}chunks.push(value)}
  if(total<24)return false;const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  if(String.fromCharCode(...bytes.subarray(4,8))!=='ftyp')return false;
  const uploaded=await fetcher(root+'/storage/v1/object/au-promo-media/'+filename,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'video/mp4','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(20000)});
  return (uploaded.ok||uploaded.status===409)&&await ready();
}
