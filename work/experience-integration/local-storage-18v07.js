/* Owned binary storage: never persist a picker File or a temporary URL. */
(()=>{'use strict';
const CHUNK=1024*1024,cache=new WeakMap();
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function encode(value){
 if(value instanceof Blob){
  if(cache.has(value))return cache.get(value);
  const pending=(async()=>{const chunks=[],digests=[];for(let offset=0;offset<value.size;offset+=CHUNK){const bytes=await value.slice(offset,offset+CHUNK).arrayBuffer();if(bytes.byteLength!==Math.min(CHUNK,value.size-offset))throw Error('Copie du fichier local incomplète.');chunks.push(bytes);digests.push(await hash(bytes));}return {auOwnedBinary:1,mime:value.type,size:value.size,chunks,digests};})();
  cache.set(value,pending);try{return await pending;}catch(error){cache.delete(value);throw error;}
 }
 if(Array.isArray(value))return Promise.all(value.map(encode));
 if(value&&typeof value==='object'){if(value.auOwnedBinary===1)return value;const out={};for(const [key,item]of Object.entries(value))out[key]=await encode(item);return out;}
 return value;
}
async function decode(value){
 if(value?.auOwnedBinary===1){
  if(!Number.isSafeInteger(value.size)||value.size<0||!Array.isArray(value.chunks)||value.chunks.length!==Math.ceil(value.size/CHUNK)||value.digests?.length!==value.chunks.length)throw Error('Fichier local enregistré incomplet.');
  for(let i=0;i<value.chunks.length;i++){const bytes=value.chunks[i];if(!(bytes instanceof ArrayBuffer)||bytes.byteLength!==Math.min(CHUNK,value.size-i*CHUNK)||await hash(bytes)!==value.digests[i])throw Error('Vérification du fichier local refusée.');}
  const blob=new Blob(value.chunks,{type:value.mime||''});cache.set(blob,Promise.resolve(value));return blob;
 }
 if(value instanceof Blob)return decode(await encode(value));
 if(Array.isArray(value))return Promise.all(value.map(decode));
 if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value))out[key]=await decode(item);return out;}
 return value;
}
function needsMigration(value){if(value instanceof Blob)return true;if(value?.auOwnedBinary===1)return false;if(value&&typeof value==='object')return Object.values(value).some(needsMigration);return false;}
const api={encode,decode,needsMigration,CHUNK};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.AU_LOCAL_STORAGE_18=api;
})();
