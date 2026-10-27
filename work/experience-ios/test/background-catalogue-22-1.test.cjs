const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../web/lyrics-audio.js'),'utf8');
for(const lyrics of [null,{lines:['Test']}])for(const island of ['false','true'])for(const systemPaused of [false,true])test(`Background handoff and restoration: lyrics=${!!lyrics}, island=${island}, systemPaused=${systemPaused}`,async()=>{
 const events={},calls=[];
 class Audio extends EventTarget{constructor(){super();this._paused=false;this.currentTime=23;this.currentSrc='https://example.test/catalogue.mp3';this.duration=180;this.playbackRate=.75;this.volume=.8;this.muted=false;this.ended=false;}get paused(){return this._paused;}pause(){this._paused=true;}play(){this._paused=false;return Promise.resolve();}}
 const a=new Audio(),s={key:'1:2',title:'Catalogue',audio:a,data:lyrics,audioEdit:{start:5,end:175,fadeIn:2,fadeOut:3}};
 const native={preparePlayback:async o=>calls.push(['prepare',o]),armPlayback:async o=>calls.push(['arm',o]),commitPlayback:async o=>calls.push(['commit',o]),controlPlayback:async()=>{},releasePlayback:async()=>({owned:true,key:s.key,position:42,playing:true,segments:[]}),addListener:(n,f)=>events[n]=f};
 const w=new EventTarget(),d=new EventTarget();w.Capacitor={Plugins:{LiveLyrics:native}};w.AU_PLAYBACK_SOURCE_19=()=>s;w.AU_AUDIO_EDITS_19={normalize:x=>x};d.hidden=false;d.getElementById=()=>a;
 class CE extends Event{constructor(n,o={}){super(n);this.detail=o.detail;}}
 vm.runInNewContext(code,{window:w,document:d,localStorage:{getItem:k=>k==='au-ios-lyrics-island'?island:null},HTMLMediaElement:Audio,WeakSet,Promise,Event,CustomEvent:CE});
 await w.AU_ISLAND_AUDIO_19.prepare(s);
 if(systemPaused)a._paused=true;d.hidden=true;d.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setImmediate(r));
 assert.equal(w.AU_ISLAND_AUDIO_19.phase,'native');assert.equal(a.paused,false,'public playback state reflects native ownership');
 assert.equal(calls.filter(c=>c[0]==='commit').length,1);
 const arm=calls.find(c=>c[0]==='arm')[1];assert.equal(arm.position,23);assert.equal(arm.rate,.75);assert.equal(arm.start,5);assert.equal(arm.fadeOut,3);
 assert.equal(calls.find(c=>c[0]==='commit')[1].title,'Catalogue');
 d.hidden=false;events.applicationState({active:true});await new Promise(r=>setImmediate(r));
 assert.equal(a.currentTime,42);assert.equal(a.paused,false);assert.equal(w.AU_ISLAND_AUDIO_19.phase,'');
});
