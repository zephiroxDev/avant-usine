/* Original Archive.org media remains unchanged. Edits are applied by the player. */
(function(root){'use strict';
const graphs=new WeakMap();
const volumeBindings=new WeakMap();
function ensureGraph(audio){let g=graphs.get(audio);if(!g){const C=root.AudioContext||root.webkitAudioContext;if(!C)throw Error('Le réglage audio n’est pas disponible sur cet appareil.');const context=new C(),source=context.createMediaElementSource(audio),gain=context.createGain(),master=context.createGain();source.connect(gain);gain.connect(master);master.connect(context.destination);g={context,gain,master,source};graphs.set(audio,g);}return g;}
// iOS ignores HTMLMediaElement.volume. Keep a separate post-fade gain, so the
// visible control changes the sound and never overwrites a fade envelope.
function installVolume(audio,{force=false}={}){
 const nav=root.navigator||{},ios=root.document?.documentElement?.dataset.auApp==='ios'||/iPhone|iPad|iPod/.test(nav.userAgent||'')||nav.platform==='MacIntel'&&nav.maxTouchPoints>1;
 if(!force&&!ios||volumeBindings.has(audio))return volumeBindings.get(audio)||null;
 let value=Number.isFinite(audio.volume)?audio.volume:1;
 const apply=()=>{try{const g=ensureGraph(audio);g.master.gain.setValueAtTime(audio.muted?0:value,g.context.currentTime);g.context.resume().catch(()=>{});}catch(error){audio.dispatchEvent(new CustomEvent('au:audio-edit-error',{detail:error.message}));}};
 Object.defineProperty(audio,'volume',{configurable:true,get:()=>value,set(next){next=Number(next);if(!Number.isFinite(next)||next<0||next>1)throw new RangeError('Volume invalide.');const changed=next!==value;value=next;apply();if(changed)audio.dispatchEvent(new Event('volumechange'));}});
 const resume=()=>{const g=graphs.get(audio);if(g&&g.context.state!=='running')g.context.resume().catch(()=>{});};
 audio.addEventListener('volumechange',apply);audio.addEventListener('play',apply);root.document?.addEventListener('pointerdown',resume,{passive:true});root.document?.addEventListener('keydown',resume);
 const binding={get value(){return value;},dispose(){audio.removeEventListener('volumechange',apply);audio.removeEventListener('play',apply);root.document?.removeEventListener('pointerdown',resume);root.document?.removeEventListener('keydown',resume);volumeBindings.delete(audio);delete audio.volume;const g=graphs.get(audio);if(g)g.master.gain.setValueAtTime(1,g.context.currentTime);}};volumeBindings.set(audio,binding);return binding;
}
function normalize(edit,duration){if(!Number.isFinite(duration)||duration<=0)return null;const start=Math.max(0,Math.min(duration-.01,Number(edit?.start)||0)),end=edit?.end==null||edit.end===''?duration:Math.max(start+.01,Math.min(duration,Number(edit.end)||duration)),length=end-start;return {start,end,fadeIn:Math.max(0,Math.min(length/2,Number(edit?.fadeIn)||0)),fadeOut:Math.max(0,Math.min(length/2,Number(edit?.fadeOut)||0)),length};}
function gainAt(time,edit){if(!edit||time<edit.start||time>edit.end)return 0;return Math.min(edit.fadeIn?Math.max(0,(time-edit.start)/edit.fadeIn):1,edit.fadeOut?Math.max(0,(edit.end-time)/edit.fadeOut):1,1);}
function attach(audio,getEdit,{bypass=()=>false}={}){let ended=false,disposed=false,frame=0,scheduled='',lastSource='';audio.crossOrigin='anonymous';
 const config=()=>{const edit=getEdit?.();return bypass()||!edit?null:normalize(edit,audio.duration);};
 function graph(){const g=ensureGraph(audio);g.context.resume().catch(()=>{});return g;}
 function schedule(force=false){const e=config(),g=graphs.get(audio);if(!e||!e.fadeIn&&!e.fadeOut){if(g){if(!audio.paused)g.context.resume().catch(()=>{});g.gain.gain.cancelScheduledValues(g.context.currentTime);g.gain.gain.setValueAtTime(1,g.context.currentTime);}return;}
  const key=[audio.currentSrc||audio.src,e.start,e.end,e.fadeIn,e.fadeOut,audio.playbackRate,audio.paused].join('|');if(!force&&key===scheduled)return;scheduled=key;try{const {context,gain}=graph(),now=context.currentTime,t=audio.currentTime,rate=audio.playbackRate||1;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gainAt(t,e),now);if(audio.paused)return;if(e.fadeIn&&t<e.start+e.fadeIn)gain.gain.linearRampToValueAtTime(1,now+(e.start+e.fadeIn-t)/rate);const fadeStart=e.end-e.fadeOut;if(e.fadeOut&&t<fadeStart)gain.gain.setValueAtTime(1,now+(fadeStart-t)/rate);if(e.fadeOut&&t<e.end)gain.gain.linearRampToValueAtTime(0,now+(e.end-t)/rate);}catch(error){audio.dispatchEvent(new CustomEvent('au:audio-edit-error',{detail:error.message}));}}
 function enforce(){if(disposed)return;const src=audio.currentSrc||audio.src;if(src!==lastSource){lastSource=src;ended=false;scheduled='';}const e=config();if(!e)return;if(audio.currentTime<e.start-.01){audio.currentTime=e.start;ended=false;schedule(true);}if(audio.currentTime<e.end-.02)ended=false;if(e.end<audio.duration-.01&&audio.currentTime>=e.end&&!ended&&!audio.paused){ended=true;audio.pause();audio.dispatchEvent(new Event('ended'));}}
 function play(){const e=config();if(e&&(audio.currentTime<e.start||audio.currentTime>=e.end)){audio.currentTime=e.start;ended=false;}schedule(true);tick();}
 function tick(){cancelAnimationFrame(frame);frame=0;enforce();if(config()&&!audio.paused&&!disposed)frame=requestAnimationFrame(tick);}
 const metadata=()=>{ended=false;scheduled='';enforce();schedule(true);},changed=()=>{enforce();schedule(true);},pause=()=>{cancelAnimationFrame(frame);frame=0;schedule(true);};
 for(const [event,fn]of [['loadedmetadata',metadata],['play',play],['pause',pause],['seeked',changed],['ratechange',changed],['timeupdate',enforce],['emptied',metadata],['waiting',pause],['playing',play]])audio.addEventListener(event,fn);
 return {range:config,refresh:changed,dispose(){disposed=true;cancelAnimationFrame(frame);for(const [event,fn]of [['loadedmetadata',metadata],['play',play],['pause',pause],['seeked',changed],['ratechange',changed],['timeupdate',enforce],['emptied',metadata],['waiting',pause],['playing',play]])audio.removeEventListener(event,fn);const g=graphs.get(audio);if(g){g.gain.gain.cancelScheduledValues(g.context.currentTime);g.gain.gain.setValueAtTime(1,g.context.currentTime);}}};
}
/* Source fragment inserted into audio-edits-19v06.js by the build preparation. */
/* Source fragment inserted into audio-edits-19v06.js by the build preparation. */
/* Source fragment inserted into audio-edits-19v06.js by the build preparation. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
/* Creator audio editor fragment, embedded in audio-edits-19v06.js. */
function editor(host,track,onchange,{pauseOthers=()=>{}}={}){
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;},box=E('details'),summary=E('summary','Découpe et fondus'),body=E('div'),audio=E('audio'),state=E('p','Charge le morceau pour choisir le début et la fin.'),message=E('p'),inputs={},abort=new AbortController();
 box.className='au-audio-edit au21-audio-editor';body.className='au21-audio-body';message.setAttribute('role','status');box.append(summary,body);host.append(box);
 let duration=0,disposed=false,previewing=false,busy=false,epoch=0,loading=null,loadError='',nativePreview=null;
 let draft={start:Number(track.audio_edit?.start)||0,end:track.audio_edit?.end??null,fadeIn:Number(track.audio_edit?.fadeIn)||0,fadeOut:Number(track.audio_edit?.fadeOut)||0};
 const initial=JSON.stringify(draft),clock=value=>{const n=Math.max(0,Number(value)||0);return Math.floor(n/60)+':'+(n%60).toFixed(1).padStart(4,'0');};
 function button(text,fn){const b=E('button',text);b.type='button';b.className='button secondary';b.onclick=fn;return b;}
 function section(title){const s=E('section');s.append(E('h3',title));body.append(s);return s;}
 const cut=section('1. Choisir le passage à garder');cut.append(E('p','Écoute puis mets en pause à l’endroit voulu. Les temps ci-dessous peuvent aussi être saisis directement.'));
 audio.controls=true;audio.preload='metadata';audio.crossOrigin='anonymous';if(track.src)audio.src=track.src;cut.append(audio);
 const loadButton=button('Charger le morceau',async()=>{loadError='';try{if(loading&&audio.src){const muted=audio.muted;audio.muted=true;audio.play().then(()=>{if(!previewing)audio.pause();audio.muted=muted;}).catch(()=>{audio.muted=muted;});}await ready(true);}catch(e){loadError=e.message;message.textContent=e.message;}render();});cut.append(loadButton);
 function field(parent,key,label){const wrap=E('label',label),input=E('input');input.type='number';input.min='0';input.step='.1';input.setAttribute('aria-label',label+' en secondes');wrap.append(input,E('small','secondes'));parent.append(wrap);inputs[key]=input;input.onchange=()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<0){input.setCustomValidity('Entre un nombre de secondes positif.');return;}const next={...draft,[key]:n};if(duration&&((key==='start'&&n>=(next.end??duration))||(key==='end'&&(n<=next.start||n>duration)))){input.setCustomValidity('Le début doit être avant la fin, dans la durée du morceau.');input.reportValidity();return;}input.setCustomValidity('');draft=next;changed();};}
 const marks=E('div'),times=E('div');times.className='au21-audio-fields';cut.append(marks,times);field(times,'start','Début conservé');field(times,'end','Fin conservée');
 marks.append(button('Prendre cette position comme début',()=>{if(!duration)return;draft.start=Math.min(audio.currentTime,(draft.end??duration)-.1);changed();}),button('Prendre cette position comme fin',()=>{if(!duration)return;draft.end=Math.max(draft.start+.1,Math.min(duration,audio.currentTime));changed();}));cut.append(state);
 const fades=section('2. Adoucir les extrémités');fades.append(E('p','0 seconde : aucun fondu. Par exemple, 2 secondes pour une entrée ou une sortie douce.'));const fadeFields=E('div');fadeFields.className='au21-audio-fields';fades.append(fadeFields);field(fadeFields,'fadeIn','Fondu au début');field(fadeFields,'fadeOut','Fondu à la fin');
 const tests=section('3. Écouter puis appliquer');tests.append(E('p','Ces essais ne modifient pas encore le morceau publié.'));
 const testStart=button('Écouter le début modifié',()=>listen(false)),testEnd=button('Écouter la fin modifiée',()=>listen(true)),original=button('Réécouter l’original',()=>{epoch++;audio.pause();previewing=false;binding.refresh();audio.currentTime=0;playOriginal();});
 const apply=button('Appliquer au brouillon',()=>{const e=value();if(!e||!valid())return;draft=compact(e);track.audio_edit={...draft};onchange();message.textContent='Découpe et fondus appliqués au brouillon. Enregistre puis publie le volume pour les rendre disponibles.';});
 const reset=button('Annuler la découpe et les fondus',()=>{epoch++;audio.pause();previewing=false;draft={start:0,end:null,fadeIn:0,fadeOut:0};delete track.audio_edit;onchange();binding.refresh();render();message.textContent='Original rétabli dans le brouillon. Le fichier Archive.org reste inchangé.';});
 tests.append(testStart,testEnd,original,apply,reset,message);
 const binding=attach(audio,()=>draft,{bypass:()=>!previewing});
 function value(){return normalize(draft,duration);}
 function compact(e){return{start:e.start,end:Math.abs(e.end-duration)<.001?null:e.end,fadeIn:e.fadeIn,fadeOut:e.fadeOut};}
 function valid(){const invalid=Object.values(inputs).find(n=>!n.checkValidity());if(!invalid)return true;message.textContent='Vérifie les temps saisis : début avant la fin, fondus dans la durée disponible.';invalid.reportValidity();return false;}
 function changed(){epoch++;audio.pause();previewing=false;binding.refresh();render();message.textContent='Réglages modifiés. Écoute le résultat puis applique-le au brouillon.';}
 function render(){const e=value();for(const[key,input]of Object.entries(inputs)){input.disabled=!duration;input.max=key.startsWith('fade')?Math.max(0,(e?.length||0)/2):duration;input.value=key==='end'?(draft.end??duration):draft[key];}testStart.disabled=testEnd.disabled=apply.disabled=busy||!e;loadButton.hidden=!!e;loadButton.disabled=false;loadButton.textContent=loadError?'Réessayer le chargement':loading?'Chargement…':'Charger le morceau';state.textContent=e?'Prêt · À garder : '+clock(e.start)+' → '+clock(e.end)+' · Durée finale : '+clock(e.length):loadError?'Chargement impossible. Appuie sur Réessayer.':loading?'Chargement du fichier audio…':'Appuie sur Charger le morceau pour commencer.';}
 function wait(event){return new Promise((resolve,reject)=>{const end=()=>{clearTimeout(timer);audio.removeEventListener(event,ok);audio.removeEventListener('error',fail);},ok=()=>{end();resolve();},fail=()=>{end();reject(Error('Le fichier audio ne répond pas. Réessaie.'));},timer=setTimeout(fail,15000);audio.addEventListener(event,ok,{once:true});audio.addEventListener('error',fail,{once:true});});}
 async function ready(gesture=false){if(nativePreview&&duration>0){render();return;}if(Number.isFinite(audio.duration)&&audio.duration>0&&(!window.Capacitor?.Plugins?.IOSUpdates?.prepareAudioPreview||nativePreview||!/^https:\/\/(?:[^/]+\.)?archive\.org\//i.test(track.src))){duration=audio.duration;render();return;}if(loading)return loading;if(!track.src)throw Error('Ce morceau n’a pas de source audio.');
  loading=(async()=>{const native=window.Capacitor?.Plugins?.IOSUpdates;if(!nativePreview&&native?.prepareAudioPreview&&window.Capacitor?.convertFileSrc&&/^https:\/\/(?:[^/]+\.)?archive\.org\//i.test(track.src)){
    const copy=await native.prepareAudioPreview({url:track.src});if(disposed){await native.releaseAudioPreview({id:copy.id});return;}nativePreview=copy;audio.removeAttribute('crossorigin');audio.src=window.Capacitor.convertFileSrc(copy.uri);if(Number.isFinite(copy.duration)&&copy.duration>0){duration=copy.duration;audio.preload='auto';audio.load();loadError='';return;}
   }const loaded=wait('loadedmetadata');audio.preload='auto';audio.load();
   // An explicit tap unlocks metadata acquisition on WKWebView installations that defer preloading.
   if(gesture){pauseOthers();const muted=audio.muted;audio.muted=true;audio.play().then(()=>{if(!disposed&&!previewing)audio.pause();audio.muted=muted;}).catch(()=>{audio.muted=muted;});}
   await loaded;if(disposed)return;duration=Number.isFinite(audio.duration)?audio.duration:0;if(!duration)throw Error('La durée de ce fichier audio est indisponible.');loadError='';
  })();render();try{await loading;}catch(e){loadError=e.message;throw e;}finally{loading=null;if(!disposed)render();}}
 async function playOriginal(){try{pauseOthers();await ready();await audio.play();}catch(e){message.textContent=e.message;}}
 async function listen(end){if(busy||!valid())return;const token=++epoch;busy=true;audio.pause();previewing=false;binding.refresh();render();try{pauseOthers();await ready();const e=value();if(!e)throw Error('Durée audio indisponible.');if(e.fadeIn||e.fadeOut)await ensureGraph(audio).context.resume();if(disposed||token!==epoch)return;
   const target=end?Math.max(e.start,e.end-Math.max(6,e.fadeOut+2)):e.start;
   // Position first while original playback is active; only then apply bounds.
   if(Math.abs(audio.currentTime-target)>.03){const positioned=wait('seeked');audio.currentTime=target;await positioned;}
   if(disposed||token!==epoch)return;previewing=true;binding.refresh();await audio.play();message.textContent='Préécoute avec découpe et fondus. Le morceau publié reste inchangé.';
  }catch(e){previewing=false;binding.refresh();message.textContent=e.message||'La préécoute n’a pas démarré.';}finally{busy=false;if(!disposed)render();}}
 audio.addEventListener('loadedmetadata',()=>{duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:(nativePreview?.duration||duration);render();},{signal:abort.signal});
 audio.addEventListener('play',()=>pauseOthers(),{signal:abort.signal});
 audio.addEventListener('au:audio-edit-error',e=>{message.textContent=e.detail||'Les fondus ne peuvent pas être lus sur cet appareil.';},{signal:abort.signal});
 box.addEventListener('toggle',()=>{if(box.open)ready().catch(e=>{message.textContent=e.message;render();});else{epoch++;audio.pause();}},{signal:abort.signal});
 audio.addEventListener('error',()=>{loadError='Le fichier audio ne répond pas. Vérifie la connexion puis réessaie.';message.textContent=loadError;duration=0;render();},{signal:abort.signal});
 const parent=host.closest('dialog');parent?.addEventListener('close',()=>{epoch++;audio.pause();},{signal:abort.signal});
 render();return{dispose(){disposed=true;epoch++;abort.abort();audio.pause();binding.dispose();audio.removeAttribute('src');audio.load();if(nativePreview)window.Capacitor?.Plugins?.IOSUpdates?.releaseAudioPreview?.({id:nativePreview.id}).catch(()=>{});box.remove();}};
}

const api={normalize,gainAt,attach,editor,installVolume};root.AU_AUDIO_EDITS_19=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
