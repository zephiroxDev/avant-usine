(()=>{
'use strict';
const BASE='https://zephiroxdev.github.io/avant-usine/';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATES=[.5,.75,1,2];
function shareURL(id){if(!UUID.test(id||''))throw Error('Lien de partage invalide.');const u=new URL(BASE);u.searchParams.set('share',id);return u.href;}
function token(url){return new URL(url).searchParams.get('share');}
function speed({host,audio,initial=1,onchange=()=>{}}){
 const before=audio.playbackRate,pitch=audio.preservesPitch,label=document.createElement('label'),select=document.createElement('select'),help=document.createElement('small');let disposed=false;
 label.className='major-field sync-speed';label.append(document.createTextNode('Vitesse de lecture'));
 for(const [value,text]of [[.5,'0,50×'],[.75,'0,75×'],[1,'1× — vitesse normale'],[2,'2×']]){const o=document.createElement('option');o.value=String(value);o.textContent=text;select.append(o);}
 select.setAttribute('aria-label','Vitesse de lecture pendant la synchronisation');select.value=String(RATES.includes(initial)?initial:1);label.append(select);help.textContent='Les repères suivent la position réelle du morceau, quelle que soit la vitesse.';label.append(help);host.append(label);
 function apply(){if(disposed)return;const rate=Number(select.value);if(!RATES.includes(rate))return;audio.playbackRate=rate;if('preservesPitch'in audio)audio.preservesPitch=true;onchange(rate);}
 select.addEventListener('change',apply);apply();
 return {get value(){return Number(select.value);},dispose(){if(disposed)return;disposed=true;select.removeEventListener('change',apply);select.disabled=true;audio.playbackRate=before;if('preservesPitch'in audio)audio.preservesPitch=pitch;}};
}
function selectedFile(text,name,mode,duration,normalise,valid){
 if(!['highlight','blocks'].includes(mode))throw Error('Choisis Highlight Progression ou synchronisation simple avant d’importer.');
 if(mode==='highlight'&&!/\.json$/i.test(name))throw Error('Highlight Progression demande un JSON détaillé. Les fichiers LRC sont réservés à la synchronisation simple.');
 if(!/\.(lrc|json)$/i.test(name))throw Error('Choisis un fichier JSON ou LRC.');
 let original;if(/\.json$/i.test(name)){try{original=JSON.parse(text);}catch{throw Error('Le fichier JSON est illisible.');}}
 if(mode==='highlight'&&(original?.sync_mode==='blocks'||typeof original?.syncedLyrics==='string'))throw Error('Ce JSON contient une synchronisation simple. Choisis synchronisation simple ou un JSON Highlight détaillé.');
 if(!Number.isFinite(duration)||duration<=0){
  const ends=(original?.curves||[]).flatMap(c=>Array.isArray(c)?c.map(p=>p?.[1]).filter(Number.isFinite):[]);
  for(const line of original?.lines||[])if(line&&typeof line==='object')for(const value of [line.end_ms,line.start_ms,line.startTimeMs])if(value!=null&&Number.isFinite(Number(value)))ends.push(Number(value)/1000);
  const lrc=[...text.matchAll(/\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)].map(m=>Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||0)));
  const starts=(original?.times||original?.block_times||[]).filter(Number.isFinite);
  const offset=Number(text.match(/^\s*\[offset:([+-]?\d+)\]/im)?.[1]||0)/1000;
  const ending=Number(original?.end_time);if(Number.isFinite(ending))ends.push(ending);
  duration=Number(original?.duration)>0?Number(original.duration):[...ends,...starts,...lrc.map(t=>t+offset)].reduce((max,t)=>Math.max(max,t),0)+.001;
 }
 const data=normalise(text,name,duration);
 if(mode==='highlight'){
  if(data.sync_mode!=='highlight'||!data.curves?.some(c=>Array.isArray(c)&&c.length>2))throw Error('Le JSON doit contenir des repères à l’intérieur des phrases pour Highlight Progression. Les départs de lignes seuls correspondent à une synchronisation simple.');
 }else{
  if(!Number.isFinite(data.end_time)&&data.curves?.length)data.end_time=data.curves.at(-1).at(-1)?.[1];
  data.curves=null;data.sync_mode='blocks';let group=-1,last=null;data.line_groups=data.times.map(t=>{if(t!==last){group++;last=t;}return group;});
 }
 if(!valid(data))throw Error('Les repères du fichier sont incomplets ou invalides. Vérifie son contenu avant l’envoi.');
 return data;
}
window.AU_SYNC_17V06={speed,selectedFile,rates:RATES};
window.AU_SHARE_17V06={shareURL,token};
window.AU_INIT_TRACK_SHARING=function({getClient,getUser,getSong,currentKey,selectSong,openProfile,tracklist,playerHost}){
 const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const B=(text,fn)=>{const b=E('button','button secondary',text);b.type='button';b.addEventListener('click',fn);return b;};
 const dialog=E('dialog','au-dialog major-dialog track-share-dialog'),head=E('div','major-dialog-head'),heading=E('h2','','Partager un morceau'),body=E('div','major-dialog-body'),status=E('p','au-note'),close=B('Fermer',()=>dialog.close());heading.id='trackShareHeading';dialog.setAttribute('aria-labelledby',heading.id);status.setAttribute('role','status');close.className='au-icon';head.append(heading,close);dialog.append(head,body,status);document.body.append(dialog);
 let generation=0;const memory=new Map();
 function open(title){heading.textContent=title;if(!dialog.open)dialog.showModal();status.textContent='';}
 async function rpc(action,p){const c=getClient();if(!c)throw Error('Le service de partage se charge ou est indisponible. Réessaie.');const {data,error}=await c.rpc('au_track_share_17v06',{p_action:action,p});if(error)throw Error(error.code==='P0001'?error.message:'Impossible de charger ce lien. Vérifie ta connexion et réessaie.');if(!data||!UUID.test(data.id))throw Error('Lien de partage introuvable.');return data;}
 function nonce(key){const cache='au-share-guest:'+key;let id=memory.get(cache);try{id=id||localStorage.getItem(cache);}catch{}if(!UUID.test(id||'')){id=crypto.randomUUID();memory.set(cache,id);try{localStorage.setItem(cache,id);}catch{}}return id;}
 function metadata(info,song){body.replaceChildren(E('h3','',song?.title||'Morceau partagé'));if(song?.volumeLabel)body.append(E('p','au-note',song.volumeLabel));
  const author=info.author;
  body.append(E('p','',author?.nickname?'Lien partagé par '+author.nickname:info.has_account?'Lien créé par un compte désormais indisponible.':'Lien créé sans compte.'));
  if(author?.id&&UUID.test(author.id))body.append(B('Voir le profil de '+author.nickname,()=>{dialog.close();openProfile(author.id);}));
  const date=E('time');date.dateTime=info.created_at;const value=new Date(info.created_at);date.textContent='Première création : '+(Number.isFinite(value.getTime())?value.toLocaleString('fr-FR',{dateStyle:'long',timeStyle:'medium'}):'date indisponible');body.append(date);
 }
 function copyTools(info,song){const url=shareURL(info.id),field=E('input','share-link');field.readOnly=true;field.value=url;field.setAttribute('aria-label','Lien direct vers ce morceau');
  const copy=B('Copier le lien',async()=>{try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(url);status.textContent='Lien copié.';}catch{field.focus();field.select();status.textContent='Copie le lien sélectionné avec le menu de ton appareil.';}});
  body.append(field,copy);
  if(typeof navigator.share==='function'&&(!navigator.canShare||navigator.canShare({url})))body.append(B('Partager avec l’appareil',async()=>{try{await navigator.share({title:song?.title||'Avant l’usine',text:'Écouter '+(song?.title||'ce morceau')+' sur Avant l’usine',url});status.textContent='Menu de partage fermé.';}catch(error){if(error.name!=='AbortError')status.textContent='Le partage natif est indisponible ici. Utilise Copier le lien.';}}));
 }
 async function share(key){const n=++generation,owner=getUser()?.id||null;open('Partager un morceau');body.replaceChildren(E('p','','Préparation du lien…'));try{const song=getSong(key);if(!song)throw Error('Ce morceau n’est plus disponible.');const info=await rpc('create',{track:key,...(!owner?{guest_key:nonce(key)}:{})});if(n!==generation)return;if(owner!==(getUser()?.id||null))throw Error('Ton compte a changé. Ferme ce panneau puis recommence le partage.');metadata(info,song);copyTools(info,song);}catch(error){if(n===generation){body.replaceChildren();status.textContent=error.message;body.append(B('Réessayer',()=>share(key)));}}}
 function decorate(){for(const row of tracklist.children){if(row.querySelector('.track-share'))continue;const index=Number(row.querySelector('[data-track]')?.dataset.track);if(!Number.isInteger(index))continue;const key=row.querySelector('[data-track]')?.dataset.trackKey;if(!key)continue;const song=getSong(key);const b=B('Partager',()=>share(key));b.className='track-share text-button';b.setAttribute('aria-label','Partager '+(song?.title||'ce morceau'));row.append(b);}}
 new MutationObserver(decorate).observe(tracklist,{childList:true});decorate();const player=B('Partager ce morceau',()=>share(currentKey()));player.className='button secondary dock-share';playerHost.append(player);
 const incoming=token(location.href);let resolved=false,resolving=false;
 if(incoming!==null){open('Morceau partagé');body.replaceChildren(E('p','','Chargement des informations du lien…'));}
 async function ready(){if(incoming===null||resolved||resolving)return;resolving=true;const n=++generation;try{if(!UUID.test(incoming))throw Error('Ce lien de partage est invalide.');const info=await rpc('resolve',{id:incoming});if(n!==generation)return;const song=getSong(info.track_key);if(!song)throw Error('Ce morceau n’est plus disponible dans la collection.');selectSong(info.track_key);open('Morceau partagé');metadata(info,song);body.append(B('Écouter ce morceau',()=>{dialog.close();song.play();}));copyTools(info,song);resolved=true;}catch(error){if(n===generation){open('Morceau partagé');body.replaceChildren();status.textContent=error.message;body.append(B('Réessayer',ready));}}finally{resolving=false;}}
 dialog.addEventListener('close',()=>generation++);
 return {share,ready};
};
})();
