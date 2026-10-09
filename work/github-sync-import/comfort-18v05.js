/* Shared offline controls and a portable, verified personal-library backup. */
(()=>{'use strict';
const E=(tag,text)=>Object.assign(document.createElement(tag),text===undefined?{}:{textContent:text});
const digest=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
async function pack(state,onprogress=()=>{}){
 const entries=[],assets=[],shared=new Map();let index=0;
 async function encode(value){
  if(value instanceof Blob){const sha256=await digest(value),key=sha256+':'+value.type;if(shared.has(key))return {$asset:shared.get(key)};const name='assets/'+(++index);shared.set(key,name);assets.push({name,bytes:value.size,type:value.type,sha256});entries.push({name,blob:value});onprogress(index);return {$asset:name};}
  if(Array.isArray(value)){const out=[];for(const item of value)out.push(await encode(item));return out;}
  if(value&&typeof value==='object'){const out={};for(const [key,item]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Champ de sauvegarde invalide.');out[key]=await encode(item);}return out;}
  return value;
 }
 const library=await encode(state),manifest={format:'avant-usine-library',version:1,created:new Date().toISOString(),library,assets};
 entries.push({name:'backup.json',blob:new Blob([JSON.stringify(manifest)],{type:'application/json'})});
 return window.AU_LOCAL_18.zip(entries);
}
async function unzip(blob){
 if(blob.size>0xffffffff)throw Error('Cette sauvegarde dépasse la limite ZIP de 4 Go.');
 if(blob.size<22)throw Error('Sauvegarde interrompue.');const tail=new DataView(await blob.slice(-22).arrayBuffer());if(tail.getUint32(0,true)!==0x06054b50||tail.getUint16(20,true)!==0)throw Error('ZIP incomplet.');
 const files=new Map();let offset=0;
 while(offset+4<=blob.size){const header=new Uint8Array(await blob.slice(offset,offset+30).arrayBuffer()),view=new DataView(header.buffer);const sig=view.getUint32(0,true);if(sig===0x02014b50)break;
  if(sig!==0x04034b50||header.length<30||view.getUint16(8,true)!==0||(view.getUint16(6,true)&9))throw Error('ZIP de sauvegarde invalide ou format non pris en charge.');
  const size=view.getUint32(18,true),uncompressed=view.getUint32(22,true),length=view.getUint16(26,true),extra=view.getUint16(28,true),start=offset+30+length+extra;
  const name=new TextDecoder('utf-8',{fatal:true}).decode(await blob.slice(offset+30,offset+30+length).arrayBuffer());
  if(size!==uncompressed||start+size>blob.size||files.has(name)||! /^(backup\.json|assets\/\d+)$/.test(name))throw Error('Contenu ZIP incohérent.');
  const file=blob.slice(start,start+size);let crc=0xffffffff;const reader=file.stream().getReader();for(;;){const {done,value}=await reader.read();if(done)break;for(const c of value)crc=crcTable[(crc^c)&255]^(crc>>>8);}if(((crc^0xffffffff)>>>0)!==view.getUint32(14,true))throw Error('Fichier ZIP corrompu : '+name);
  files.set(name,file);offset=start+size;
 }
 if(!files.has('backup.json')||files.get('backup.json').size>64*1024*1024)throw Error('Manifeste de sauvegarde absent ou trop volumineux.');
 if(tail.getUint16(10,true)!==files.size||tail.getUint32(16,true)!==offset||offset+tail.getUint32(12,true)!==blob.size-22)throw Error('Index ZIP incohérent.');
 return files;
}
async function unpack(blob,onprogress=()=>{}){
 const files=await unzip(blob),manifest=JSON.parse(await files.get('backup.json').text());
 if(manifest.format!=='avant-usine-library'||manifest.version!==1||!Array.isArray(manifest.assets)||manifest.assets.length!==files.size-1)throw Error('Sauvegarde Avant l’usine non reconnue.');
 const assets=new Map();let count=0;
 for(const meta of manifest.assets){const file=files.get(meta.name);if(!file||assets.has(meta.name)||file.size!==meta.bytes||! /^[a-f0-9]{64}$/.test(meta.sha256)||await digest(file)!==meta.sha256)throw Error('Sauvegarde corrompue : '+meta.name);assets.set(meta.name,new Blob([file],{type:typeof meta.type==='string'?meta.type:''}));onprogress(++count,manifest.assets.length);}
 function decode(value,depth=0){if(depth>30)throw Error('Sauvegarde trop imbriquée.');if(value&&typeof value==='object'){if(Object.hasOwn(value,'$asset')){if(Object.keys(value).length!==1||!assets.has(value.$asset))throw Error('Fichier de sauvegarde absent.');return assets.get(value.$asset);}if(Array.isArray(value))return value.map(v=>decode(v,depth+1));const out={};for(const [key,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Champ interdit.');out[key]=decode(v,depth+1);}return out;}return value;}
 const state=decode(manifest.library);validate(state);return state;
}
function validate(state){
 if(!state||!['tracks','albums','playlists'].every(k=>Array.isArray(state[k])&&state[k].length<=100000))throw Error('Bibliothèque de sauvegarde invalide.');
 const validCover=asset=>{if(asset&&(!(asset.blob instanceof Blob)||!asset.blob.size||! /^(image|video)\//.test(asset.blob.type)))throw Error('Pochette invalide.');};
 const ids=new Set();for(const t of state.tracks){if(typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.title!=='string'||!(t.blob instanceof Blob)||!t.blob.size||!Number.isFinite(t.duration)||t.duration<=0)throw Error('Morceau de sauvegarde invalide.');ids.add(t.id);validCover(t.cover);validCover(t.motion);if(t.lyrics)window.AU_LOCAL_18.validateLyrics(t.lyrics,t.duration);}
 for(const kind of ['albums','playlists']){const groups=new Set();for(const g of state[kind]){if(typeof g.id!=='string'||groups.has(g.id)||typeof g.name!=='string'||!Array.isArray(g.ids)||g.ids.some(id=>!ids.has(id))||new Set(g.ids).size!==g.ids.length)throw Error('Album ou playlist invalide.');validCover(g.cover);validCover(g.motion);groups.add(g.id);}}
}
function remap(state,start=0){const ids=new Map(state.tracks.map(t=>[t.id,crypto.randomUUID()]));return {tracks:state.tracks.map((t,i)=>({...t,id:ids.get(t.id),order:start+i+1})),albums:state.albums.map(g=>({...g,id:crypto.randomUUID(),ids:g.ids.map(id=>ids.get(id))})),playlists:state.playlists.map(g=>({...g,id:crypto.randomUUID(),ids:g.ids.map(id=>ids.get(id))}))};}
window.AU_COMFORT_18={pack,unpack,validate,remap};
if(typeof document==='undefined')return;
let sleep=null;try{sleep=JSON.parse(localStorage.getItem('au-sleep-18v05')||'null');}catch{}
const audios=[document.getElementById('audio'),document.getElementById('localAudio')].filter(Boolean);
function writeSleep(){try{localStorage.setItem('au-sleep-18v05',JSON.stringify(sleep));}catch{}}
function finish(){sleep=null;writeSleep();audios.forEach(a=>a.pause());renderSleep();}
function elapsed(){if(sleep?.deadline&&Date.now()>=sleep.deadline)finish();}
function end(event){if(sleep?.end&&(!sleep.target||sleep.target===event.currentTarget.id)){event.stopImmediatePropagation();finish();}}
for(const a of audios){a.addEventListener('ended',end,true);a.addEventListener('timeupdate',elapsed);a.addEventListener('play',elapsed);}
setInterval(elapsed,1000);document.addEventListener('visibilitychange',elapsed);window.addEventListener('pageshow',elapsed);
const sleepButton=E('button','Minuteur de sommeil');sleepButton.className='text-button';sleepButton.onclick=()=>{
 const d=E('dialog'),h=E('h2','Minuteur de sommeil'),note=E('p');d.className='au-comfort-dialog';d.append(h,note);
 const status=()=>{note.textContent=sleep?.end?'Arrêt à la fin du morceau en cours.':sleep?.deadline?'Arrêt prévu à '+new Date(sleep.deadline).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Aucun arrêt programmé.';};
 for(const minutes of [15,30,60]){const b=E('button',minutes+' minutes');b.className='button';b.onclick=()=>{sleep={deadline:Date.now()+minutes*60000};writeSleep();renderSleep();status();};d.append(b);}
 const endButton=E('button','À la fin du morceau');endButton.className='button';endButton.onclick=()=>{const active=audios.find(a=>!a.paused);if(!active){note.textContent='Lance un morceau avant de choisir cette option.';return;}sleep={end:true,target:active.id};writeSleep();renderSleep();status();};
 const cancel=E('button','Annuler le minuteur');cancel.className='button secondary';cancel.onclick=()=>{sleep=null;writeSleep();renderSleep();status();};
 const close=E('button','Fermer');close.className='button secondary';close.onclick=()=>d.close();d.append(endButton,cancel,close);d.addEventListener('close',()=>d.remove());document.body.append(d);status();d.showModal();
};
function renderSleep(){sleepButton.textContent=sleep?.end?'Minuteur : fin du morceau':sleep?.deadline?'Minuteur : '+Math.max(0,Math.ceil((sleep.deadline-Date.now())/60000))+' min':'Minuteur de sommeil';}
document.querySelector('.footer')?.append(sleepButton);renderSleep();elapsed();
let diagnostic={platform:'web',current:'18V06',latest:null,checked:null,error:null};
window.AU_UPDATE_DIAGNOSTIC={configure(value){Object.assign(diagnostic,value);},record(value){Object.assign(diagnostic,value,{checked:new Date().toISOString()});},snapshot(){return {...diagnostic};}};
if(window.AU_WINDOWS_DIAGNOSTIC)window.AU_UPDATE_DIAGNOSTIC.configure({platform:'desktop',search:async()=>window.AU_UPDATE_DIAGNOSTIC.record(await window.AU_WINDOWS_DIAGNOSTIC.search())});
const diag=E('button','Diagnostic des mises à jour');diag.className='text-button';diag.onclick=()=>{
 document.querySelector('#accountDialog')?.close();const d=E('dialog'),h=E('h2','Diagnostic des mises à jour'),p=E('p'),check=E('button','Rechercher'),close=E('button','Fermer');d.className='au-comfort-dialog';check.className='button';close.className='button secondary';d.append(h,p,check,close);close.onclick=()=>d.close();d.addEventListener('close',()=>d.remove());document.body.append(d);
 const paint=()=>{const prefix=diagnostic.platform==='ios'?'au-ios-':diagnostic.platform==='android'?'au-android-':null,skip=diagnostic.skipped||(prefix&&localStorage.getItem(prefix+'skip')),remind=diagnostic.remindAfter||(prefix&&Number(localStorage.getItem(prefix+'remind')));p.textContent='Plateforme : '+diagnostic.platform+'\nVersion installée : '+diagnostic.current+'\nDernière version : '+(diagnostic.latest||'pas encore recherchée')+'\nDernière vérification : '+(diagnostic.checked?new Date(diagnostic.checked).toLocaleString('fr-FR'):'aucune')+'\nÉtat : '+(diagnostic.error||diagnostic.state||'prêt')+(skip?'\nVersion ignorée : '+skip:'')+(remind>Date.now()?'\nRappel après : '+new Date(remind).toLocaleString('fr-FR'):'');};
 check.onclick=async()=>{check.disabled=true;try{const platform=diagnostic.platform;if(typeof diagnostic.search==='function')await diagnostic.search();else{const response=await fetch('https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);const releases=await response.json();const pattern=platform==='desktop'?/^Avant-Usine-Installation-(\d+\.\d+\.\d+)\.exe$/:platform==='android'?/^Avant-Usine-Android-(\d+\.\d+\.\d+)\.apk$/:/^Avant-Usine-iOS-(\d+\.\d+\.\d+)-non-signe\.ipa$/;const versions=releases.filter(r=>!r.draft).flatMap(r=>(r.assets||[]).map(a=>a.name.match(pattern)?.[1])).filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));diagnostic.latest=platform==='web'?window.AU_PLATFORM_HISTORIES?.[matchMedia('(max-width:600px)').matches?'web-mobile':'web-pc']?.[0]?.[0]:versions.at(-1)||null;diagnostic.error=null;diagnostic.state='Recherche terminée.';}diagnostic.checked=new Date().toISOString();}catch(error){diagnostic.error=error.message||String(error);diagnostic.checked=new Date().toISOString();}finally{check.disabled=false;paint();}};paint();d.showModal();
};document.querySelector('.footer')?.append(diag);
})();
