/** Individual exports use the stored, already-rendered audio: no second trim. */
export function openTrackExport(track){
 globalThis.AU_MAINTENANCE_19?.assert('local_export');
 const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const d=E('dialog',undefined,'local-dialog'),head=E('header',undefined,'local-dialog-head'),body=E('div'),status=E('p','Le format d’origine évite une nouvelle compression. Le ZIP conserve aussi les pochettes, paroles et synchronisations disponibles.'),progress=E('progress'),select=E('select'),label=E('label','Format audio'),controller=new AbortController();let busy=false;
 const button=(text,fn)=>{const b=E('button',text,'button secondary');b.type='button';b.onclick=fn;return b;};
 head.append(E('h2','Exporter — '+track.title),button('Fermer',()=>d.close()));d.append(head,body);d.setAttribute('aria-label','Exporter — '+track.title);progress.max=1;progress.value=0;status.setAttribute('role','status');
 for(const [value,text]of [['original','Format d’origine'],['mp3','MP3 — compatible avec la plupart des lecteurs'],['m4a','M4A / AAC — selon les capacités de cet appareil'],['wav','WAV — fichier plus volumineux']]){const o=E('option',text);o.value=value;select.append(o);}label.append(select);body.append(label,status,progress);
 async function run(complete){if(busy)return;busy=true;select.disabled=true;body.querySelectorAll('[data-local-export-kind]').forEach(b=>b.disabled=true);try{status.textContent='Préparation sur cet appareil…';const result=await buildTrackExport(track,{format:select.value,complete,signal:controller.signal,onprogress:n=>{progress.value=n;status.textContent='Préparation : '+Math.round(n*100)+' %';}});if(!d.open)return;const url=URL.createObjectURL(result.blob),a=E('a','Télécharger '+result.name,'button');a.href=url;a.download=result.name;body.append(a);a.click();d.addEventListener('close',()=>setTimeout(()=>URL.revokeObjectURL(url),30000),{once:true});progress.value=1;status.textContent='Fichier prêt. Le morceau dans Local reste inchangé.';}catch(error){if(error.name!=='AbortError')status.textContent=error.message;}finally{busy=false;select.disabled=false;body.querySelectorAll('[data-local-export-kind]').forEach(b=>b.disabled=false);}}
 for(const [name,complete]of [['Audio seul',false],['ZIP complet',true]]){const b=button(name,()=>run(complete));b.dataset.localExportKind=complete?'zip':'audio';body.append(b);}d.addEventListener('close',()=>{controller.abort();d.remove();},{once:true});document.body.append(d);d.showModal();return d;
}
export async function buildTrackExport(track,{format='original',complete=false,onprogress=()=>{},signal}={}){
 const api=globalThis.AU_LOCAL_18;if(!api)throw Error('Bibliothèque locale indisponible.');
 if(track.localFileUnavailable||!(track.blob instanceof Blob)||!track.blob.size)throw Error('Rattache le fichier audio original avant de l’exporter.');
 if(!['original','mp3','m4a','wav'].includes(format))throw Error('Format non pris en charge.');
 signal?.throwIfAborted();const stem=api.clean(track.title),metadata={title:track.title,artist:track.artist||'',album:track.album||'',genre:track.genre||'',year:track.year||''};
 let audio=track.blob,extension=String(track.name||'').split('.').at(-1)?.toLowerCase();
 if(!/^[a-z0-9]{1,8}$/.test(extension||''))extension=({'audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/flac':'flac','audio/ogg':'ogg'}[audio.type]||'audio');
 if(format==='original'){audio=await api.writeTags(audio,track,track.position||Number(track.track)||api.initialNumber(track.name)||1);onprogress(.7);}
 else{const {exportAudio}=await import('./album-audio-21.mjs');const result=await exportAudio(audio,{format,tags:metadata,cover:track.cover?.blob,signal,onprogress:n=>onprogress(n*.7)});audio=result.blob;extension=result.extension;}
 if(!complete)return{blob:audio,name:stem+'.'+extension,metadata};
 const root=stem+'/',entries=[{name:root+stem+'.'+extension,blob:audio}];
 const json=(name,value)=>entries.push({name:root+name,blob:new Blob([JSON.stringify(value,null,2)],{type:'application/json'})});
 json('metadonnees.json',{...metadata,audio:stem+'.'+extension,format:extension});
 const plain=track.plain||track.lyrics?.lines?.join('\n');if(plain)entries.push({name:root+'Paroles/'+stem+'.txt',blob:new Blob([plain],{type:'text/plain;charset=utf-8'})});
 if(track.lyrics){json('Synchronisation/'+stem+'.json',track.lyrics);const text=api.lrc(track.lyrics);if(text)entries.push({name:root+'Synchronisation/'+stem+'.lrc',blob:new Blob([text],{type:'text/plain;charset=utf-8'})});}
 for(const [key,label]of [['cover','pochette'],['motion','pochette-animee']]){const asset=track[key],blob=asset instanceof Blob?asset:asset?.blob;if(!blob)continue;const extension=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','video/mp4':'mp4','video/webm':'webm'}[blob.type]||'bin');entries.push({name:root+'Pochettes/'+label+'.'+extension,blob});}
 signal?.throwIfAborted();const blob=await api.zip(entries,(n,total)=>onprogress(.7+.3*n/total));return{blob,name:stem+'.zip',metadata,entries:entries.map(e=>e.name)};
}
