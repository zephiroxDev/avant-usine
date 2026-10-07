const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const web=path.resolve(__dirname,'../github-sync-import'),source=fs.readFileSync(path.join(web,'app-17v01.js'),'utf8');
class Element{constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.value='';this.disabled=false;this.dataset={};this.className='';this.classList={toggle(){}};}append(...n){this.children.push(...n);}setAttribute(){}addEventListener(k,fn){this.listeners[k]=fn;}removeEventListener(k){delete this.listeners[k];}}
const context={window:{},URL,console,document:{createElement:tag=>new Element(tag),createTextNode:t=>t}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(web,'sharing-17v06.js'),'utf8'),context);
vm.runInContext(source.slice(source.indexOf('const AU_KARAOKE='),source.indexOf('function createKaraokeEditor('))+source.slice(source.indexOf('function normaliseReviewFile('),source.indexOf('function createReviewCoverage('))+source.slice(source.indexOf('function createBlockEditor('),source.indexOf('function initLyricsCopy(')),context);
const id='12345678-1234-4234-8234-123456789abc',url=context.window.AU_SHARE_17V06.shareURL(id);assert.equal(url,'https://zephiroxdev.github.io/avant-usine/?share='+id);assert.equal(context.window.AU_SHARE_17V06.token(url),id);assert.throws(()=>context.window.AU_SHARE_17V06.shareURL('../bad'));
const api=context.window.AU_SYNC_17V06,lines=['ab','cd'],curves=[[[0,1],[1,2],[2,3]],[[0,4],[1,5],[2,6]]],detailed=JSON.stringify({lines,curves,duration:8});
assert.equal(api.selectedFile(detailed,'lyrics.json','highlight',null,context.normaliseReviewFile,context.reviewDataValid).sync_mode,'highlight');
const simple=api.selectedFile(detailed,'lyrics.json','blocks',8,context.normaliseReviewFile,context.reviewDataValid);assert.equal(simple.curves,null);assert.deepEqual(Array.from(simple.times),[1,4]);assert.equal(simple.end_time,6);
for(const [name,text]of [['lyrics.lrc','[00:01.00]ab'],['lyrics.json',JSON.stringify({lines,times:[1,4],duration:8})],['lyrics.json',JSON.stringify({syncedLyrics:'[00:01.00]ab'})]])assert.throws(()=>api.selectedFile(text,name,'highlight',8,context.normaliseReviewFile,context.reviewDataValid));
assert.throws(()=>api.selectedFile(detailed,'lyrics.json','',8,context.normaliseReviewFile,context.reviewDataValid));assert.throws(()=>api.selectedFile('{','lyrics.json','blocks',8,context.normaliseReviewFile,context.reviewDataValid));
assert.equal(api.selectedFile('[offset:2000]\n[00:01.00]ab\n[00:04.00]cd\n[00:06.00]','lyrics.lrc','blocks',null,context.normaliseReviewFile,context.reviewDataValid).end_time,8);
assert.deepEqual(Array.from(api.selectedFile(JSON.stringify({lines:[{text:'a',start_ms:2000},{text:'b',start_ms:4000}]}),'lyrics.json','blocks',null,context.normaliseReviewFile,context.reviewDataValid).times),[2,4]);
(async()=>{
 const host=new Element('div'),audio={currentTime:3,playbackRate:1,preservesPitch:false,paused:true,duration:10,pause(){this.paused=true;},addEventListener(){},removeEventListener(){}};let saved;
 const speed=api.speed({host,audio,initial:.75,onchange:v=>saved=v}),select=host.children[0].children[1];assert.equal(audio.playbackRate,.75);assert.equal(audio.currentTime,3);assert.equal(audio.preservesPitch,true);
 const editorHost=new Element('div'),editor=context.createBlockEditor({host:editorHost,lines,audio,play:async()=>audio.paused=false,onchange(){}}),down=editorHost.children[0].children[0].children[0];await editor.start();
 for(const [rate,time]of [[.5,3],[2,6]]){select.value=String(rate);select.listeners.change();assert.equal(audio.currentTime,time===3?3:3);audio.currentTime=time;await down.onclick();assert.equal(saved,rate);}
 assert.deepEqual(Array.from(editor.times),[3,6],'Different rates never scale the captured song positions');audio.currentTime=9;await down.onclick();assert.equal(editor.endTime,9);const snapshot=JSON.stringify(editor.times);select.value='1';select.listeners.change();assert.equal(JSON.stringify(editor.times),snapshot);assert.equal(audio.currentTime,9);
 speed.dispose();speed.dispose();assert.equal(audio.playbackRate,1);assert.equal(audio.preservesPitch,false);assert.equal(audio.currentTime,9);editor.dispose();
 assert(source.includes('work?.speed?.dispose()'));assert(source.includes('await trackSharing.ready()'));assert(source.includes('requested_mode:requestedMode'));
 console.log('PASS 17V06: canonical share links, precise timings at .5×/2×, unchanged progress and restoration, Highlight format rejection, simple conversion, LRC offsets, structured JSON.');
})().catch(e=>{console.error(e);process.exitCode=1;});
