/* iOS: transfer the actual audio to AVPlayer while the WebView is hidden. */
(()=>{'use strict';
const native=window.Capacitor?.Plugins?.LiveLyrics;if(!native?.preparePlayback)return;
let prepared='',preparing=null,phase='',owner=null,nativePlaying=false,serial=Promise.resolve();
const wrapped=new WeakSet();
const queue=fn=>{serial=serial.then(fn,fn).catch(error=>window.dispatchEvent(new CustomEvent('au:island-relay-error',{detail:error.message||String(error)})));return serial;};
async function prepare(s){
 if(!s?.data?.lines?.length||!s.audio||phase||!s.key)return;
 if(!wrapped.has(s.audio)){wrapped.add(s.audio);const a=s.audio,play=a.play.bind(a),pause=a.pause.bind(a);
  const getter=window.HTMLMediaElement&&a instanceof HTMLMediaElement&&Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'paused')?.get;let actualPaused=a.paused;
  Object.defineProperty(a,'paused',{configurable:true,get(){return owner?.audio===a&&['native','restoring'].includes(phase)?!nativePlaying:getter?getter.call(a):actualPaused;},set(value){actualPaused=value;}});
  a.pause=()=>{if(phase==='native'&&owner?.audio===a){nativePlaying=false;native.controlPlayback({key:owner.key,playing:false}).catch(()=>{});}else pause();};
  a.play=()=>{if(phase==='native'&&owner?.audio===a){if(window.AU_PLAYBACK_SOURCE_19?.()?.key===owner.key){nativePlaying=true;return native.controlPlayback({key:owner.key,playing:true});}return queue(foreground).then(play);}return play();};
 }
 const id=s.key+'|'+(s.audio.currentSrc||s.audio.src);
 if(prepared===id)return;if(preparing)return preparing;
 preparing=(async()=>{const url=s.audio.currentSrc||s.audio.src;if(!url)return;
 const options={key:s.key};
 if(url.startsWith('https:'))options.url=url;
 else if(url.startsWith('blob:')){const blob=await(await fetch(url)).blob();if(blob.size>120_000_000)throw Error('Fichier trop volumineux pour le relais audio ; lecture habituelle conservée.');options.extension=({'audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/x-wav':'wav','audio/flac':'flac','audio/ogg':'ogg'})[blob.type]||'audio';options.data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});}
 else return;
 if(window.AU_PLAYBACK_SOURCE_19?.()?.key!==s.key)return;
 await native.preparePlayback(options);prepared=id;
 })().finally(()=>preparing=null);return preparing;
}
async function background(){
 if(phase||!document.hidden)return;
 const s=window.AU_PLAYBACK_SOURCE_19?.(),a=s?.audio;
 if(!s?.data?.lines?.length||!a||a.paused||a.ended||localStorage.getItem('au-ios-lyrics-island')==='false')return;
 await prepare(s);if(!prepared.startsWith(s.key+'|')||!document.hidden||a.paused)return;
 phase='arming';owner=s;
 let pausedByRelay=false;
 try{
  const range=window.AU_AUDIO_EDITS_19?.normalize(s.audioEdit,a.duration)||{start:0,end:a.duration,fadeIn:0,fadeOut:0};
  let sleep=null;try{sleep=JSON.parse(localStorage.getItem('au-sleep-18v05')||'null');}catch{}
  const arm=()=>native.armPlayback({key:s.key,position:a.currentTime,rate:a.playbackRate,volume:a.muted?0:a.volume,...range,sleepDeadline:sleep?.deadline||null});
  let before=a.currentTime;await arm();
  if(Math.abs(a.currentTime-before)>.2)await arm();
  if(!document.hidden||a.paused||a.ended||window.AU_PLAYBACK_SOURCE_19?.()?.key!==s.key){phase='';owner=null;return;}
  a.pause();pausedByRelay=true;await native.commitPlayback({key:s.key});nativePlaying=true;phase='native';
 }catch(error){await native.releasePlayback().catch(()=>{});phase='';owner=null;if(pausedByRelay)await a.play().catch(()=>{});throw error;}
}
async function foreground(resumeAfterError=false,allowResume=true){
 if(!phase)return;
 const s=owner;phase='restoring';
 try{const result=await native.releasePlayback();nativePlaying=!!result.playing;const raw=window.AU_PLAYBACK_SOURCE_19?.();
  if(result.owned&&s&&result.key===s.key&&(raw?.key===s.key||s.local&&document.getElementById('audio')?.paused)){window.dispatchEvent(new CustomEvent('au:native-listening',{detail:{key:s.key,duration:s.audio.duration,segments:result.segments||[]}}));s.audio.currentTime=result.position;phase='';owner=null;if(allowResume&&(result.playing||resumeAfterError))await s.audio.play();else s.audio.dispatchEvent(new Event('pause'));}
 }finally{phase='';owner=null;window.dispatchEvent(new Event('au:island-relay-restored'));}
}
window.AU_ISLAND_AUDIO_19={prepare:s=>queue(()=>prepare(s)),get active(){return !!phase;},get phase(){return phase;}};
document.addEventListener('visibilitychange',()=>queue(()=>document.hidden?background():foreground()));
window.addEventListener('au:before-trackchange',()=>queue(async()=>{await foreground();prepared='';}));
native.addListener('playbackEnded',()=>queue(async()=>{const s=owner;await foreground(false,false);if(s){s.audio.pause();s.audio.dispatchEvent(new Event('ended'));}}));
native.addListener('playbackError',event=>queue(async()=>{await foreground(true);throw Error(event.message);}));
native.addListener('playbackSleep',()=>queue(async()=>{await foreground(false,false);window.dispatchEvent(new Event('au:native-sleep'));}));
native.addListener('playbackState',event=>{if(owner?.key===event.key)nativePlaying=!!event.playing;});
})();
