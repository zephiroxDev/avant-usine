import{openTrackExport}from'./local-export-23-1.mjs';
import{exportAudio}from'./album-audio-21.mjs';
import{exportSync,syncLrc}from'./album-sync-21.mjs';
import{jpegCover}from'./album-assets-21.mjs';
const local=()=>window.AU_LOCAL_18,native=['desktop','ios','android'].includes(document.documentElement.dataset.auApp),temporary=new Map();
const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},button=(label,fn)=>{const n=E('button',label);n.type='button';n.className='button secondary';n.onclick=fn;return n;};
window.AU_ALBUM_21={webLocal:!native,albumZip};
async function resource(url,signal){const response=await fetch(url,{signal});if(!response.ok)throw Error('HTTP '+response.status);const blob=await response.blob();if(!blob.size)throw Error('Fichier vide.');return blob;}
function extension(name){return(new URL(name,location.href).pathname.split('.').at(-1)||'mp3').toLowerCase();}
async function seconds(blob){const a=document.createElement('audio'),url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const finish=(fn,value)=>{clearTimeout(timer);fn(value);},timer=setTimeout(()=>reject(Error('Durée audio indisponible.')),15000);a.onloadedmetadata=()=>Number.isFinite(a.duration)&&a.duration>0?finish(resolve,a.duration):finish(reject,Error('Durée audio invalide.'));a.onerror=()=>finish(reject,Error('Fichier audio illisible.'));a.preload='metadata';a.src=url;});}finally{a.removeAttribute('src');a.load();URL.revokeObjectURL(url);}}
async function published(key,signal){const response=await fetch('https://djjfzymrkncwhrocpxjo.supabase.co/rest/v1/rpc/au_sync',{method:'POST',headers:{apikey:'sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX','Content-Type':'application/json'},body:JSON.stringify({p_action:'published',p:{track:key}}),signal});if(!response.ok)throw Error('Synchronisation indisponible.');return response.json();}

export async function prepareAlbum(volume,{signal,onprogress=()=>{},fetchResource=resource,getPublished=published}={}){
 const snapshot=structuredClone(volume),api=local();if(!api)throw Error('Le service Local se charge.');
 const result={catalogueId:String(snapshot.number),name:snapshot.title,tracks:[],cover:null,motion:null,missing:[],warnings:[],preparedAt:new Date().toISOString()};
 try{const blob=await fetchResource(snapshot.cover,signal),jpeg=await jpegCover(blob);result.cover={blob:jpeg,name:'pochette.jpg'};}catch(error){if(signal?.aborted)throw error;result.warnings.push('Pochette principale : '+error.message);}
 if(snapshot.motion)try{result.motion={blob:await fetchResource(snapshot.motion,signal),name:'pochette-animee.'+extension(snapshot.motion)};}catch(error){if(signal?.aborted)throw error;result.warnings.push('Pochette animée : '+error.message);}
 for(let i=0;i<snapshot.tracks.length;i++){
  signal?.throwIfAborted();const track=snapshot.tracks[i],key=snapshot.number+':'+track.number,title=api.stripTitleNumber(track.title),position=i+1;
  onprogress({position,total:snapshot.tracks.length,title,stage:'Récupération audio'});
  try{
   const original=await fetchResource(track.src,signal),originalDuration=await seconds(original);let sync=null;
   try{sync=await getPublished(key,signal);}catch(error){if(signal?.aborted)throw error;result.warnings.push(title+' — synchronisation non récupérée : '+error.message);}
   const range=window.AU_AUDIO_EDITS_19.normalize(track.audio_edit,originalDuration),modified=range&&(range.start>0||range.end<originalDuration||range.fadeIn||range.fadeOut);
   let blob=original,ext=extension(track.src),duration=originalDuration;
   let cover=result.cover,motion=result.motion;
   if(track.cover&&track.cover!==snapshot.cover)try{cover={blob:await jpegCover(await fetchResource(track.cover,signal)),name:'pochette.jpg'};}catch(error){result.warnings.push(title+' — pochette individuelle non récupérée.');}
   if(track.motion&&track.motion!==snapshot.motion)try{motion={blob:await fetchResource(track.motion,signal),name:'pochette-animee.'+extension(track.motion)};}catch(error){result.warnings.push(title+' — pochette animée individuelle non récupérée.');}
   const tags={title,artist:track.artist||'JuL',album:snapshot.title,trackNumber:position,tracksTotal:snapshot.tracks.length,lyrics:sync?.lines?.join('\n')||track.lyrics||''};
   if(modified||!['mp3','wav','flac'].includes(ext)){
    onprogress({position,total:snapshot.tracks.length,title,stage:'Fabrication du fichier avec ses métadonnées'});
    const transformed=await exportAudio(original,{edit:track.audio_edit,tags,cover:cover?.blob,signal});blob=transformed.blob;ext=transformed.extension;duration=transformed.duration;
    if(ext==='wav')result.warnings.push(title+' — export WAV : encodage compressé indisponible sur cet appareil.');
   }else blob=await api.writeTags(original,{...track,title,album:snapshot.title,name:'source.'+ext,cover},position);
   const lyrics=sync?.lines?.length?exportSync(sync,range||{start:0,end:originalDuration}):null;
   const stem=String(position).padStart(Math.max(2,String(snapshot.tracks.length).length),'0')+' - '+api.clean(title);
   result.tracks.push({id:crypto.randomUUID(),catalogueKey:key,title,artist:tags.artist,album:snapshot.title,genre:track.genre||'',year:track.year||'',position,name:stem+'.'+ext,blob,duration,cover,motion,lyrics,plain:lyrics?.lines.join('\n')||track.lyrics||'',source_audio_edit:track.audio_edit||null});
  }catch(error){if(signal?.aborted)throw error;result.missing.push({position,title,reason:error.message});}
 }
 if(!result.tracks.length)throw Error('Aucune piste récupérée. Aucun album vide n’a été créé.');return result;
}

export async function albumZip(snapshot,onprogress=()=>{}){
 const api=local(),root=api.clean(snapshot.name)+'/',entries=[],manifest={version:'21.0',name:snapshot.name,preparedAt:snapshot.preparedAt,missing:snapshot.missing,warnings:snapshot.warnings,tracks:[]};
 const add=(name,blob)=>{if(blob)entries.push({name:root+name,blob});},text=(name,value,type)=>add(name,new Blob([value],{type:type||'text/plain;charset=utf-8'}));
 const asset=(name,value)=>{if(value?.blob)add(name+'.'+extension(value.name),value.blob);};
 asset('Pochettes/Album/pochette',snapshot.cover);asset('Pochettes/Album/pochette-animee',snapshot.motion);
 for(const t of snapshot.tracks){const stem=t.name.replace(/\.[^.]+$/,'');add(t.name,t.blob);if(t.plain)text('Paroles/'+stem+'.txt',t.plain);if(t.lyrics){text('Synchronisations/'+stem+'.json',JSON.stringify(t.lyrics,null,2),'application/json');const lrc=syncLrc(t.lyrics);if(lrc)text('Synchronisations/'+stem+'.lrc',lrc);}asset('Pochettes/Morceaux/'+stem,t.cover);asset('Pochettes/Morceaux/'+stem+'-animee',t.motion);manifest.tracks.push({title:t.title,artist:t.artist,album:t.album,position:t.position,file:t.name,duration:t.duration,source_audio_edit:t.source_audio_edit});}
 text('metadonnees.json',JSON.stringify(manifest,null,2),'application/json');return api.zip(entries,onprogress);
}

function download(blob,name,host){const url=URL.createObjectURL(blob),a=E('a','Télécharger le ZIP');a.className='button';a.href=url;a.download=local().clean(name)+'.zip';host.append(a);a.click();return()=>URL.revokeObjectURL(url);}
function mount(api){
 const page=document.getElementById('local');let host;
 if(!native){page.replaceChildren();const header=E('div'),heading=E('h1','Local, sans se compliquer la vie.'),kicker=E('p','Sur ton appareil');heading.id='localHeading';heading.tabIndex=-1;header.className='au222-page-heading';kicker.className='au222-kicker';header.append(kicker,heading);const block=(title,text)=>{const n=E('section');n.className='au222-content-block';n.append(E('h2',title));if(text){const p=E('p',text);p.className='au222-muted';n.append(p);}return n;};const albums=block('Les albums du catalogue','Préparation temporaire pour l’export : télécharge ton ZIP avant de fermer cet onglet. Les fichiers ne sont pas conservés entre les visites.');albums.append(button('Choisir un album',()=>api.navigate('collection')));const personal=block('Mes fichiers','L’import personnel et le stockage durable restent réservés aux applications compatibles.');personal.append(button('Voir les applications',()=>api.navigate('telechargements')));const prepared=block('Albums préparés');host=E('div');prepared.append(host);page.append(header,albums,personal,prepared);for(const n of document.querySelectorAll('[data-go="local"]')){n.removeAttribute('aria-disabled');n.title='Préparer les albums du catalogue';}}
 const showTemporary=()=>{if(!host)return;host.replaceChildren();if(!temporary.size){const empty=E('p','Aucun album préparé pour le moment.');empty.className='au222-muted';host.append(empty);}for(const snapshot of temporary.values()){const card=E('article');card.className='major-card';card.append(E('h2',snapshot.name),E('p',snapshot.tracks.length+' pistes prêtes'),button('Exporter le ZIP',()=>open(snapshot,true)));const tracks=E('details'),summary=E('summary','Exporter un morceau de cet album');tracks.append(summary);for(const track of snapshot.tracks){const row=E('div');row.className='actions';row.append(E('span',String(track.position||1).padStart(2,'0')+' · '+track.title),button('Exporter',()=>openTrackExport(track)));tracks.append(row);}card.append(tracks);host.append(card);}};
 async function open(volume,prepared=false){
  const d=E('dialog');d.className='xp-dialog au21-album-dialog';const controller=new AbortController(),note=E('p','Les fichiers seront préparés sur cet appareil.'),progress=E('progress'),results=E('div'),actions=E('div'),close=button('Fermer',()=>d.close());let snapshot=prepared?volume:null,revoke=null,nativeStored=false;
  progress.max=1;progress.value=0;d.append(E('h2',volume.title||volume.name),close,note,progress,results,actions);document.body.append(d);d.showModal();
  d.addEventListener('close',()=>{controller.abort();setTimeout(()=>revoke?.(),60000);d.remove();},{once:true});
  const run=async fn=>{for(const b of actions.querySelectorAll('button'))b.disabled=true;try{await fn();}catch(error){if(!controller.signal.aborted)note.textContent=error.message;}finally{for(const b of actions.querySelectorAll('button'))b.disabled=false;}};
  const acquire=async()=>{if(snapshot){if(native&&!nativeStored){const saved=await local().storeCatalogue(snapshot);if(!saved)return false;nativeStored=true;}return true;}snapshot=await prepareAlbum(volume,{signal:controller.signal,onprogress:x=>{progress.value=(x.position-1)/x.total;note.textContent=x.stage+' : '+x.position+' / '+x.total+' — '+x.title;}});results.replaceChildren();for(const missing of snapshot.missing)results.append(E('p','Piste manquante : '+missing.position+' — '+missing.title+' ('+missing.reason+')'));for(const warning of snapshot.warnings)results.append(E('p',warning));if(snapshot.missing.length&&!confirm('Ces pistes n’ont pas été récupérées : '+snapshot.missing.map(x=>x.title).join(', ')+'. Continuer avec un album incomplet ?')){snapshot=null;return false;}temporary.set(snapshot.catalogueId,snapshot);showTemporary();if(native){const stored=await local().storeCatalogue(snapshot);if(!stored){snapshot=null;return false;}nativeStored=true;}progress.value=1;note.textContent='Album préparé : '+snapshot.tracks.length+' pistes.';return true;};
  actions.append(button('Préparer et télécharger le ZIP',()=>run(async()=>{if(!await acquire())return;const zip=await albumZip(snapshot,(n,total)=>{progress.value=n/total;note.textContent='ZIP : '+n+' / '+total+' fichiers';});revoke?.();revoke=download(zip,snapshot.name,results);note.textContent='ZIP prêt. Les fichiers manquants éventuels figurent dans le bilan.';})));
  if(native)actions.append(button('Conserver dans Local sans ZIP',()=>run(async()=>{if(await acquire())note.textContent='Album conservé dans Local. Tu pourras l’exporter plus tard.';})));
 }
 document.addEventListener('click',e=>{const a=e.target.closest('#albumZip,#downloadGrid a.button');if(!a)return;let volume;if(a.id==='albumZip'){const select=document.getElementById('albumSelect');volume=api.catalogue()[Number(select?.value)||0];}else{const card=a.closest('.download-card');volume=api.catalogue().find(v=>v.zip&&new URL(v.zip,location.href).href===a.href)||api.catalogue().find(v=>v.title===card?.querySelector('h2')?.textContent?.trim());}if(volume){e.preventDefault();e.stopImmediatePropagation();open(volume);}},{capture:true});
 window.AU_ALBUM_21.open=volume=>open(volume);window.addEventListener('au:routechange',e=>{if(!native)document.body.dataset.localActive=String(e.detail.route==='local');});
 showTemporary();
}
if(window.AU_EXPERIENCE)mount(window.AU_EXPERIENCE);else window.addEventListener('au:experience-ready',()=>mount(window.AU_EXPERIENCE),{once:true});
