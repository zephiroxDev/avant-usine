/* Portable backup: authenticated chunk encryption, no login/session transfer. */
(()=>{'use strict';
const MAGIC=new TextEncoder().encode('AU18BKP2'),SIZE=8*1024*1024,ITERATIONS=600000;
const encode=new TextEncoder(),decode=new TextDecoder('utf-8',{fatal:true});
const pin=value=>{if(!/^\d{6}$/.test(value))throw Error('Le code doit contenir exactement 6 chiffres.');return value;};
const b64=bytes=>btoa(String.fromCharCode(...bytes)),un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const word=n=>{const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);return b;};
async function key(code,salt){const material=await crypto.subtle.importKey('raw',encode.encode(pin(code)),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
function iv(prefix,index){const bytes=new Uint8Array(12);bytes.set(prefix);new DataView(bytes.buffer).setUint32(8,index,false);return bytes;}
async function protectedFile(blob){if(blob.size<12)return false;const bytes=new Uint8Array(await blob.slice(0,8).arrayBuffer());return MAGIC.every((value,index)=>bytes[index]===value);}
async function encrypt(blob,code,progress=()=>{}){
 if(blob.size>0xffffffff)throw Error('La sauvegarde dépasse la limite de 4 Go.');pin(code);
 const salt=crypto.getRandomValues(new Uint8Array(16)),nonce=crypto.getRandomValues(new Uint8Array(8));
 const header=encode.encode(JSON.stringify({format:'avant-usine-protected-backup',version:2,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:b64(salt),nonce:b64(nonce),chunkBytes:SIZE,bytes:blob.size})),secret=await key(code,salt),parts=[MAGIC,word(header.length),header],total=Math.ceil(blob.size/SIZE);
 for(let i=0;i<total;i++){const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv(nonce,i),additionalData:new Uint8Array([...header,...word(i)])},secret,await blob.slice(i*SIZE,(i+1)*SIZE).arrayBuffer());parts.push(word(bytes.byteLength),bytes);progress(i+1,total);}
 return new Blob(parts,{type:'application/octet-stream'});
}
async function decrypt(blob,code,progress=()=>{}){
 pin(code);if(blob.size<12||blob.size>0xffffffff+20000)throw Error('Sauvegarde interrompue ou trop volumineuse.');
 const prefix=new Uint8Array(await blob.slice(0,12).arrayBuffer());if(!MAGIC.every((b,i)=>prefix[i]===b))throw Error('Format de sauvegarde non reconnu.');const size=new DataView(prefix.buffer).getUint32(8,true);if(size<2||size>4096||12+size>=blob.size)throw Error('En-tête de sauvegarde invalide.');
 const header=new Uint8Array(await blob.slice(12,12+size).arrayBuffer()),h=JSON.parse(decode.decode(header));
 if(h.format!=='avant-usine-protected-backup'||h.version!==2||h.kdf!=='PBKDF2-SHA256'||h.iterations!==ITERATIONS||h.cipher!=='AES-256-GCM'||h.chunkBytes!==SIZE||!Number.isSafeInteger(h.bytes)||h.bytes<22||h.bytes>0xffffffff)throw Error('Version ou paramètres de sauvegarde non pris en charge.');
 const salt=un64(h.salt),nonce=un64(h.nonce);if(salt.length!==16||nonce.length!==8)throw Error('En-tête de sauvegarde invalide.');const secret=await key(code,salt),parts=[],total=Math.ceil(h.bytes/SIZE);let offset=12+size;
 for(let i=0;i<total;i++){if(offset+4>blob.size)throw Error('Sauvegarde interrompue.');const length=new DataView(await blob.slice(offset,offset+4).arrayBuffer()).getUint32(0,true),expected=Math.min(SIZE,h.bytes-i*SIZE)+16;offset+=4;if(length!==expected||offset+length>blob.size)throw Error('Sauvegarde interrompue ou corrompue.');try{parts.push(await crypto.subtle.decrypt({name:'AES-GCM',iv:iv(nonce,i),additionalData:new Uint8Array([...header,...word(i)])},secret,await blob.slice(offset,offset+length).arrayBuffer()));}catch{throw Error('Code incorrect ou sauvegarde corrompue. Aucune donnée restaurée.');}offset+=length;progress(i+1,total);}
 if(offset!==blob.size)throw Error('Données inattendues dans la sauvegarde.');return new Blob(parts,{type:'application/zip'});
}
const privateKey=/auth|token|session|permission|role|creator|moderator|account-cache|public-catalog|retired-tracks|audio-signature|community-visitor|share-guest|stats-events/i;
function portableKey(name){return typeof name==='string'&&!privateKey.test(name)&&/^au-(?:theme|cover-motion|ui-sound|visual-effects|desktop-(?:accent|text|density|contrast)|development-notice-v1|community-name)$/.test(name);}
function validatePersonal(p){if(!p)return;if(p.version!==1||!p.library||!Array.isArray(p.library.favorites)||!Array.isArray(p.library.playlists)||p.library.playlists.length>50||!p.library.favorites.every(k=>typeof k==='string'&&k.length<100))throw Error('Données personnelles invalides.');for(const list of p.library.playlists)if(typeof list.id!=='string'||typeof list.name!=='string'||!Array.isArray(list.keys)||list.keys.length>500||!list.keys.every(k=>typeof k==='string'&&k.length<100))throw Error('Playlist de sauvegarde invalide.');if(!p.preferences||typeof p.preferences!=='object'||Array.isArray(p.preferences)||Object.entries(p.preferences).some(([k,v])=>!portableKey(k)||typeof v!=='string'||v.length>5*1024*1024))throw Error('Préférences de sauvegarde invalides.');if(!Array.isArray(p.drafts)||p.drafts.some(d=>typeof d.suffix!=='string'||!/^[^:]+:[^:]+:[^:]+:(?:highlight|blocks)$/.test(d.suffix)||typeof d.value!=='string'))throw Error('Brouillons de sauvegarde invalides.');if(p.roleProof&&(!['creator','moderator'].includes(p.roleProof.role)||!/^[a-f0-9]{64}$/.test(p.roleProof.token)))throw Error('Preuve de rôle invalide.');}
let adapter=null;const api={encrypt,decrypt,protectedFile,portableKey,validatePersonal,configure(value){adapter=value;}};
if(typeof module!=='undefined')module.exports=api;
if(typeof window==='undefined')return;window.AU_BACKUP_18=api;
if(typeof document==='undefined')return;
const E=(tag,text)=>Object.assign(document.createElement(tag),text===undefined?{}:{textContent:text});
function dialog(title){const d=E('dialog'),body=E('div'),h=E('h2',title),close=E('button','Fermer');d.id='auBackupDialog';d.className='au-comfort-dialog';close.className='button secondary';close.onclick=()=>d.close();d.append(h,body,close);document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();return {d,body};}
function codeField(body,label){const l=E('label',label),i=E('input');i.type='password';i.inputMode='numeric';i.pattern='[0-9]{6}';i.minLength=i.maxLength=6;i.autocomplete='off';i.setAttribute('aria-label',label);l.append(i);body.append(l);return i;}
function button(body,label,fn){const b=E('button',label);b.className='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){const n=E('p',e.message);n.setAttribute('role','alert');body.append(n);}finally{b.disabled=false;}};body.append(b);return b;}
function option(body,label,checked=false){const l=E('label'),i=E('input');i.type='checkbox';i.checked=checked;l.append(i,E('span',label));body.append(l);return i;}
function readPosition(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
async function snapshot(includeRole){
 if(!adapter||!window.AU_LOCAL_18?.snapshot)throw Error('La bibliothèque se charge. Réessaie dans un instant.');
 const id=adapter.userId(),library=adapter.library(),state=await window.AU_LOCAL_18.snapshot(),preferences={},drafts=[];
 for(let n=0;n<localStorage.length;n++){const k=localStorage.key(n);if(portableKey(k))preferences[k]=localStorage.getItem(k);else if(k.startsWith('au-sync-draft:'+(id||'undefined')+':'))drafts.push({suffix:k.slice(('au-sync-draft:'+(id||'undefined')+':').length),value:localStorage.getItem(k)});}
 if(adapter.userId()!==id)throw Error('Le compte a changé pendant la préparation. Recommence l’exportation.');
 const roleProof=includeRole?await adapter.issueRole():null;
 if(adapter.userId()!==id)throw Error('Le compte a changé pendant la préparation. Recommence l’exportation.');
 state.personal={version:1,library,preferences,drafts,position:readPosition('au-resume-v1'),localPosition:readPosition('au-local-resume-18v05'),roleProof};validatePersonal(state.personal);return state;
}
function exportDialog(){const {body}=dialog('Exporter une sauvegarde complète'),code=codeField(body,'Choisir un code à 6 chiffres'),confirm=codeField(body,'Confirmer le code');body.append(E('p','Audio, albums, playlists, favoris, pochettes, paroles, synchronisations, préférences et brouillons. Le fichier est chiffré ; conserve son code, il ne peut pas être récupéré. Les connexions et mots de passe sont exclus.'));const roles=option(body,'Inclure le rôle',false);roles.setAttribute('aria-disabled',String(!adapter?.privileged()));roles.addEventListener('click',event=>{if(!adapter?.privileged()){event.preventDefault();roles.checked=false;const message=dialog('Aucun rôle à transférer');message.d.id='auBackupRoleNotice';message.body.append(E('p','Votre compte ne possède aucun rôle Créateur ou Modérateur à transférer.'));}});const progress=E('progress'),note=E('p');body.append(progress,note);button(body,'Créer la sauvegarde protégée',async()=>{pin(code.value);if(code.value!==confirm.value)throw Error('Les deux codes doivent être identiques.');note.textContent='Préparation des données…';const state=await snapshot(roles.checked),zip=await window.AU_COMFORT_18.pack(state,n=>note.textContent=n+' fichiers préparés');const file=await encrypt(zip,code.value,(done,total)=>{progress.max=total;progress.value=done;note.textContent='Chiffrement : '+done+' / '+total;});code.value=confirm.value='';const link=E('a','Enregistrer la sauvegarde complète');link.className='button';link.href=URL.createObjectURL(file);link.download='Avant-usine-'+new Date().toISOString().slice(0,10)+'.au-backup';body.append(link);note.textContent='Sauvegarde prête. '+(state.personal.roleProof?'Elle permet aussi de transférer le rôle : garde le fichier et son code privés.':'');link.closest('dialog').addEventListener('close',()=>setTimeout(()=>URL.revokeObjectURL(link.href),30000),{once:true});});}
async function importFile(file){
 if(!file)return;document.querySelector('#auBackupDialog')?.close();
 const {body}=dialog('Importer une sauvegarde complète');if(!await protectedFile(file)){body.append(E('p','Format refusé : seules les sauvegardes protégées .au-backup sont acceptées. Les anciennes archives ZIP ne sont plus importables.'));return;}const code=codeField(body,'Code à 6 chiffres de la sauvegarde'),note=E('p','Le code choisi à l’exportation est nécessaire.'),progress=E('progress');body.append(note,progress);
 let verified=false,restored=false;
 const verify=button(body,'Vérifier la sauvegarde',async()=>{
  if(verified)return;
  const zip=await decrypt(file,code.value,(done,total)=>{progress.max=total;progress.value=done;});
  const state=await window.AU_COMFORT_18.unpack(zip,(done,total)=>{progress.max=total;progress.value=done;note.textContent='Vérification des fichiers : '+done+' / '+total;});validatePersonal(state.personal);verified=true;verify.hidden=true;if(code)code.value='';
  note.textContent=state.tracks.length+' morceaux locaux, '+state.albums.length+' albums, '+state.playlists.length+' playlists locales'+(state.personal?', '+state.personal.library.playlists.length+' playlists du catalogue et '+state.personal.library.favorites.length+' favoris':'')+'. Les morceaux locaux sont ajoutés en conservant leur organisation. Les données déjà présentes sont conservées.';
  if(!['desktop','android','ios'].includes(document.documentElement.dataset.auApp)&&state.tracks.length)note.textContent+=' Sur cette version Internet, Local est désactivé : seuls les favoris, playlists du catalogue et réglages seront restaurés. Importe ce même fichier dans une application pour récupérer aussi la bibliothèque Local. Le fichier de sauvegarde est conservé.';
  const replace=option(body,'Remplacer mes favoris et playlists du catalogue par ceux de la sauvegarde',false),role=option(body,'Transférer le rôle sur le compte actuellement connecté',false);replace.parentElement.hidden=!state.personal;role.parentElement.hidden=!state.personal?.roleProof;
  let selectedAccount=null;
  function accountLabel(){const id=adapter?.userId(),name=adapter?.userName?.()||'compte connecté';role.disabled=!id;role.parentElement.querySelector('span').textContent=id?'Transférer le rôle sur le compte actuellement connecté : '+name:'Se connecter pour transférer le rôle sur son compte';if(id!==selectedAccount)role.checked=false;selectedAccount=id;}
  accountLabel();const accountChanged=()=>accountLabel();window.addEventListener('au:backup-account-change',accountChanged);body.closest('dialog').addEventListener('close',()=>window.removeEventListener('au:backup-account-change',accountChanged),{once:true});
  if(state.personal?.roleProof)body.append(E('p','Le transfert est facultatif. Le serveur vérifie la preuve du rôle ; aucun compte ni connexion ne figure dans la sauvegarde. Connectez-vous au compte qui doit recevoir le rôle.'));
  const restore=button(body,'Restaurer les données vérifiées',async()=>{
   if(restored)return;if(!adapter)throw Error('Le compte se charge. Réessaie.');
   const id=adapter.userId(),p=state.personal,transfer=role.checked;
   if(transfer&&(!id||id!==selectedAccount))throw Error('Le compte a changé. Vérifie le compte destinataire et coche à nouveau le transfert.');
   if(p)adapter.checkLibrary(p.library,replace.checked);if(transfer)await adapter.checkRole(p.roleProof);
   if(adapter.userId()!==id)throw Error('Le compte a changé pendant la vérification. Recommence la restauration.');
   const old=new Map(),writes=new Map();
   if(p){for(const [k,v]of Object.entries(p.preferences))writes.set(k,v);for(const draft of p.drafts)writes.set('au-sync-draft:'+(id||'undefined')+':'+draft.suffix,draft.value);if(p.position)writes.set('au-resume-v1',JSON.stringify(p.position));}
   const rollback=()=>{for(const [k,v]of old){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch{}}};
   try{for(const [k,v]of writes){old.set(k,localStorage.getItem(k));localStorage.setItem(k,v);}const ids=await window.AU_LOCAL_18.restoreSnapshot(state);restored=true;restore.hidden=true;
    if(p&&adapter.userId()===id){adapter.restoreLibrary(p.library,replace.checked);const position=p.localPosition;if(position&&ids.tracks[position.id])localStorage.setItem('au-local-resume-18v05',JSON.stringify({...position,id:ids.tracks[position.id],queue:(position.queue||[]).map(k=>ids.tracks[k]).filter(Boolean),groupId:ids.albums[position.groupId]||ids.playlists[position.groupId]||null}));}
    else if(p){rollback();note.textContent='Les fichiers locaux ont été ajoutés. Le compte ayant changé, ses favoris et réglages n’ont pas été modifiés.';return;}
   }catch(error){if(!restored)rollback();throw Error((restored?'Les fichiers locaux sont restaurés, mais les réglages doivent être vérifiés : ':'Restauration refusée : ')+error.message);}
   note.textContent='Données restaurées. Recharge l’interface pour appliquer tous les réglages.';
   if(transfer){const completeRole=async()=>{if(adapter.userId()!==id)throw Error('Reconnecte-toi au compte destinataire sélectionné avant de transférer le rôle.');const result=await adapter.restoreRole(p.roleProof);note.textContent='Données restaurées. Rôle '+(result.role==='creator'?'Créateur':'Modérateur')+' transféré au compte sélectionné.';};try{await completeRole();}catch(error){note.textContent='Données restaurées. Le rôle n’a pas été transféré : '+error.message;const retry=button(body,'Réessayer uniquement le transfert du rôle',async()=>{await completeRole();retry.hidden=true;});}}
   button(body,'Recharger maintenant',()=>location.reload());
  });
 });
}
api.exportDialog=exportDialog;api.importFile=importFile;
function mount(){if(document.getElementById('backup18v06'))return;const b=E('button','Sauvegarde complète : exporter / importer');b.id='backup18v06';b.className='text-button';b.onclick=()=>{document.querySelector('#accountDialog')?.close();const {body}=dialog('Sauvegarde complète');button(body,'Exporter une sauvegarde protégée',()=>{document.querySelector('#auBackupDialog')?.close();exportDialog();});const label=E('label','Importer une sauvegarde'),file=E('input');file.type='file';file.accept='.au-backup';file.onchange=()=>importFile(file.files[0]);label.append(file);body.append(label);};document.querySelector('.footer')?.append(b);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
