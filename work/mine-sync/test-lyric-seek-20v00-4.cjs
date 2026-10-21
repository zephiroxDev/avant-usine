const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'outputs/20v00-4');fs.mkdirSync(out,{recursive:true});process.env.TEMP=process.env.TMP=out;
const code=fs.readFileSync(path.join(root,'work/github-sync-import/app-17v01.js'),'utf8');
const view=code.slice(code.indexOf('function lyricsEndTime('),code.indexOf('const lyricPaletteCache='));
const karaoke=code.slice(code.indexOf('const AU_KARAOKE='),code.indexOf('function createKaraokeEditor('));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--mute-audio']});try{
 const page=await browser.newPage();await page.setContent('<div id="host" style="height:200px;overflow:auto"></div>');
 await page.evaluate(()=>{window.clock=String;window.track=()=>({});window.COLLECTION=[{number:1}];window.playingVolume=0;window.AU_GENIUS_SYNC={peek:()=>''};window.community={items:[]};window.automatic=false;});
 await page.addScriptTag({content:karaoke+'\n'+view+'\nwindow.createPublicLyricsView=createPublicLyricsView;'});
 for(const mode of ['blocks','highlight']){
  await page.evaluate(mode=>{window.position=0;window.data={sync_mode:mode,lines:['First phrase','Second phrase','A back'],times:[0,10,9],line_ends:[8,18,13],duration:30,curves:mode==='highlight'?[[[0,0],[12,8]],[[0,10],[13,18]],[[0,9],[6,13]]]:null};window.v?.dispose();window.v=createPublicLyricsView(document.getElementById('host'),data,{endActions:false,currentOnly:false,automatic:()=>automatic,resumeFollow:()=>automatic=true,seek:t=>{position=t;v.paint(t);}});v.paint(15);automatic=false;document.getElementById('host').dispatchEvent(new WheelEvent('wheel',{deltaY:100}));},mode);
  await page.locator('.au-lyric-line').first().click();
  assert.equal(await page.evaluate(()=>position),0);
  assert.equal(await page.evaluate(()=>automatic),true,'Selecting a phrase must resume automatic following');
  await page.evaluate(()=>v.paint(11));
  assert.equal(await page.locator('[aria-current=true]').count(),2,'Main phrase and overlapping back must follow the same clock');
  await page.locator('.au-lyric-line').nth(1).press('Enter');
  assert.equal(await page.evaluate(()=>position),10);
  await page.evaluate(()=>v.paint(1));
  assert.equal(await page.locator('[aria-current=true]').count(),1,'Backward seek clears obsolete current phrases');
 }
 await page.evaluate(()=>{v.dispose();automatic=true;window.data={sync_mode:'blocks',lines:['Previous phrase','Chosen phrase'],times:[0,10],line_ends:[10,18],duration:30};v=createPublicLyricsView(document.getElementById('host'),data,{endActions:false,seek:t=>{position=t;v.paint(t);}});v.paint(9);});
 await page.locator('.au-lyric-line').nth(1).evaluate(n=>n.click());
 assert.equal(await page.evaluate(()=>position),10);
 assert.equal(await page.locator('.is-exiting').count(),0,'An explicit seek must not replay the exit of a previous phrase');
 assert.equal(await page.locator('[aria-current=true]').textContent(),'Chosen phrase');
 const wav=Buffer.alloc(44+8000*2*30);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 await page.evaluate(async src=>{window.a=new Audio(src);await new Promise((resolve,reject)=>{a.onloadedmetadata=resolve;a.onerror=reject;});v.dispose();v=createPublicLyricsView(document.getElementById('host'),data,{endActions:false,currentOnly:false,seek:t=>a.currentTime=t});a.addEventListener('seeked',()=>v.paint(a.currentTime));a.addEventListener('timeupdate',()=>v.paint(a.currentTime));a.currentTime=2;await a.play();},'data:audio/wav;base64,'+wav.toString('base64'));
 await page.locator('.au-lyric-line').nth(1).click();
 await page.waitForFunction(()=>!a.seeking&&a.currentTime>=10&&a.currentTime<11);
 assert.equal(await page.locator('[aria-current=true]').textContent(),'Chosen phrase');
 await page.waitForTimeout(600);assert(await page.evaluate(()=>a.currentTime>10.1&&!a.paused),'Actual media must continue from the chosen timestamp '+JSON.stringify(await page.evaluate(()=>({time:a.currentTime,paused:a.paused,seeking:a.seeking,ready:a.readyState,error:a.error?.message}))));
 await page.locator('.au-lyric-line').first().click();await page.waitForFunction(()=>!a.seeking&&a.currentTime<1);
 assert.equal(await page.locator('[aria-current=true]').textContent(),'Previous phrase');
 await page.evaluate(()=>a.pause());
 console.log('PASS: phrase selection resumes following, preserves timestamps and overlaps, clears stale active lines');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
