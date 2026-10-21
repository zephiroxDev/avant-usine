const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.AU_BETA_TEST_ROOT||path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'web/lyrics-audio.js'),'utf8');
const beta=code.includes('Private beta: native lifecycle owns');
for(const ownershipEvent of [false,true])test('Native ownership restores real WebView audio '+ownershipEvent,{skip:!beta},async()=>{
 const handlers={},calls={prepare:0,arm:0,commit:0,release:0,play:0};
 class Audio extends EventTarget{constructor(){super();this._paused=false;this.currentTime=43;this.currentSrc='https://example.test/audio.mp3';this.duration=180;this.playbackRate=1;this.volume=.7;this.muted=false;this.ended=false;}get paused(){return this._paused;}pause(){this._paused=true;}play(){this._paused=false;calls.play++;return Promise.resolve();}}
 const audio=new Audio(),source={key:'track',audio,data:{lines:['Words']}};
 const native={preparePlayback:async()=>{calls.prepare++;},armPlayback:async()=>{calls.arm++;},commitPlayback:async()=>{calls.commit++;},controlPlayback:async()=>{},releasePlayback:async()=>{calls.release++;return {owned:true,key:'track',playing:true,position:55,segments:[]}},addListener:(n,f)=>{handlers[n]=f;}};
 const window=new EventTarget();window.Capacitor={Plugins:{LiveLyrics:native}};window.AU_PLAYBACK_SOURCE_19=()=>source;
 const document=new EventTarget();document.hidden=false;document.getElementById=()=>audio;
 class CustomEvent extends Event{constructor(n,o={}){super(n);this.detail=o.detail;}}
 vm.runInNewContext(code,{window,document,localStorage:{getItem:()=>null},HTMLMediaElement:Audio,WeakSet,Promise,Event,CustomEvent,fetch:()=>{throw Error('Unexpected network')},FileReader:class{}});
 await window.AU_ISLAND_AUDIO_19.prepare(source);assert.equal(calls.prepare,1);
 document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setImmediate(r));
 assert.equal(calls.arm,0);assert.equal(calls.commit,0);assert.equal(audio.paused,false,'WebKit is never paused by a JS background promise');
 audio._paused=true;
 if(ownershipEvent){handlers.nativeOwnership({key:'track',playing:true});assert.equal(window.AU_ISLAND_AUDIO_19.phase,'native');assert.equal(audio.paused,false);}
 document.hidden=false;handlers.applicationState({active:true,nativeOwned:true,key:'track',playing:true});
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(calls.release,1);assert.equal(audio.currentTime,55);assert.equal(calls.play,1);assert.equal(audio.paused,false);assert.equal(window.AU_ISLAND_AUDIO_19.phase,'');
});
