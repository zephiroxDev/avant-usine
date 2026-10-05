(function(){
 'use strict';
 window.AU_INIT_ACTIVITY=function({getClient,getUser,audio,getTrack}){
  const clock=new window.AU_LISTENING_CLOCK.ListeningClock();let accountId=null,ready=false,busy=false,generation=0,queue=[],sessionId=null,lastActivity=0,wasPlaying=false,playback=null,lastUsage=Date.now();
  const platform=location.protocol==='avantusine:'?'desktop-pc':matchMedia('(pointer:coarse)').matches?'web-mobile':'web-pc';
  const prefix='au-stats-events-17v01:';
  function save(){if(!accountId)return;try{localStorage.setItem(prefix+accountId,JSON.stringify(queue));}catch{window.dispatchEvent(new CustomEvent('au:stats-notice',{detail:'Stockage local indisponible : les mesures en attente ne seront conservées que tant que cette fenêtre reste ouverte.'}));}}
  function record(event){if(!accountId||getUser()?.id!==accountId)return;queue.push({...event,details:{...event.details,platform}});save();if(ready&&queue.length>=10)flush();}
  function emit(kind,details){record({id:crypto.randomUUID(),kind,at:new Date().toISOString(),details:{...details,platform}});}
  async function changed(){const next=getUser()?.id||null;if(next===accountId)return;generation++;accountId=next;ready=false;busy=false;queue=[];sessionId=null;lastActivity=0;playback=null;wasPlaying=false;lastUsage=Date.now();clock.reset();if(!next)return;try{const pending=JSON.parse(localStorage.getItem(prefix+next)||'[]');queue=Array.isArray(pending)?pending.filter(e=>e&&typeof e.id==='string'&&Date.parse(e.at)>Date.now()-48*3600000):[];}catch{}const token=generation;try{const {error}=await getClient().rpc('au_stats_record_17v01',{p:[]});if(error)throw error;if(token!==generation)return;ready=true;emit('login',{});flush();}catch{if(token===generation)window.dispatchEvent(new CustomEvent('au:stats-notice',{detail:'Le suivi des statistiques attend la connexion au serveur.'}));}}
  async function flush(){if(!ready||busy||!queue.length||!accountId||getUser()?.id!==accountId)return;busy=true;const token=generation;queue=queue.filter(e=>Date.parse(e.at)>Date.now()-48*3600000);const batch=queue.slice(0,100);try{const {error}=await getClient().rpc('au_stats_record_17v01',{p:batch});if(error)throw error;if(token!==generation)return;const ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));save();}catch{if(token===generation)window.dispatchEvent(new CustomEvent('au:stats-notice',{detail:'Mesures conservées sur cet appareil en attendant la synchronisation.'}));}finally{if(token===generation)busy=false;}}
  function sample(finishing=false){if(!accountId)return;const song=getTrack();if(!song)return;const playing=finishing?wasPlaying:!audio.paused&&!audio.ended&&!audio.seeking;if(playing&&!playback){playback={playbackId:crypto.randomUUID(),trackKey:song.key,volume:song.volume};emit('track_start',playback);}const segment=clock.sample({position:audio.currentTime,wallTime:Date.now(),playing,trackKey:song.key,rate:audio.playbackRate});wasPlaying=playing;if(!segment)return;if(!sessionId||Date.now()-lastActivity>30*60000){sessionId=crypto.randomUUID();emit('session',{sessionId});}lastActivity=Date.now();emit('listening',{trackKey:song.key,volume:song.volume,playbackId:playback?.playbackId,duration:Number.isFinite(audio.duration)?audio.duration:null,seconds:segment.seconds,startPosition:segment.startPosition,endPosition:segment.endPosition,sessionId});}
  audio.addEventListener('play',()=>{const song=getTrack();if(song&&(!playback||playback.trackKey!==song.key)){if(playback)emit('track_end',{...playback,completed:false});playback={playbackId:crypto.randomUUID(),trackKey:song.key,volume:song.volume};emit('track_start',playback);}clock.reset();sample();});
  audio.addEventListener('pause',()=>{sample(true);wasPlaying=false;clock.reset();flush();});
  audio.addEventListener('ended',()=>{sample(true);if(playback)emit('track_end',{...playback,completed:true});playback=null;wasPlaying=false;clock.reset();flush();},true);
  audio.addEventListener('seeking',()=>{clock.reset();});
  audio.addEventListener('ratechange',()=>{clock.reset();});
  window.addEventListener('au:before-trackchange',()=>{sample(true);if(playback)emit('track_end',{...playback,completed:audio.ended});playback=null;wasPlaying=false;clock.reset();});
  window.addEventListener('au:activity',event=>{if(event.detail?.kind)emit(event.detail.kind,event.detail.details||{});});
  window.addEventListener('au:routechange',event=>emit('section',{section:event.detail.route}));
  window.addEventListener('online',()=>{if(ready)flush();else if(accountId){accountId=null;changed();}});
  window.addEventListener('pagehide',()=>{sample(true);save();});
  document.addEventListener('visibilitychange',()=>{lastUsage=Date.now();});
  setInterval(()=>{sample();const now=Date.now(),seconds=(now-lastUsage)/1000;lastUsage=now;if(accountId&&!document.hidden&&seconds>0&&seconds<=35)emit('usage',{seconds});flush();},20000);
  return {changed,record,flush,emit};
 };
})();
