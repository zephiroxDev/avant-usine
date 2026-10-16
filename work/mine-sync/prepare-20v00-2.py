from pathlib import Path
r=Path(__file__).resolve().parents[2]; w=r/'work/github-sync-import'
p=w/'app-17v01.js';s=p.read_text(encoding='utf-8')
s=s.replace('automatic=()=>true,endActions=true,currentOnly=true,controlsHost}={})','automatic=()=>true,resumeFollow=()=>{},endActions=true,currentOnly=true,controlsHost}={})',1)
s=s.replace("row.onclick=e=>{if(!selecting()&&e.target===row)seek?.(data.times[i]);};row.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();seek?.(data.times[i]);}};", "row.setAttribute('role','button');row.onclick=e=>{if(e.button===0&&!selecting()&&!gestureMoved&&Number.isFinite(data.times[i]))seek?.(data.times[i]);};row.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.shiftKey&&!selecting()){e.preventDefault();if(Number.isFinite(data.times[i]))seek?.(data.times[i]);}};",1)
s=s.replace('let active=-1,lastTarget=null,scrollFrame=0,disposed=false,target=0,lastWall=0;', '''let active=-1,lastTarget=null,scrollFrame=0,disposed=false,target=0,lastWall=0,manualFollow=false,gestureMoved=false,gestureStart=null;
 const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='button secondary au-lyrics-return';returnButton.textContent='Revenir aux paroles en cours';returnButton.hidden=true;controls.append(returnButton);
 function returnToCurrent(){manualFollow=false;resumeFollow();lastTarget=null;returnButton.hidden=true;if(lastPaintTime!==null){const current=rows.find(row=>row.classList.contains('is-current'));if(current)viewport.scrollTop=Math.max(0,Math.min(viewport.scrollHeight-viewport.clientHeight,viewport.scrollTop+current.getBoundingClientRect().top-viewport.getBoundingClientRect().top-viewport.clientHeight*.3));paint(lastPaintTime);}}
 returnButton.onclick=returnToCurrent;
 function pauseFollowing(){manualFollow=true;returnButton.hidden=false;cancelAnimationFrame(scrollFrame);scrollFrame=0;lastTarget=null;}
 function navigateLyrics(e){if(e.type==='wheel'||['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))pauseFollowing();}
 function moveGesture(e){if(gestureStart&&e.pointerId===gestureStart.id&&Math.hypot(e.clientX-gestureStart.x,e.clientY-gestureStart.y)>8){gestureMoved=true;pauseFollowing();}}
 viewport.addEventListener('wheel',navigateLyrics,{passive:true});viewport.addEventListener('keydown',navigateLyrics);document.addEventListener('pointermove',moveGesture,{passive:true});''',1)
s=s.replace('function downSelection(){dragging=true;',"function downSelection(e){gestureStart={id:e.pointerId,x:e.clientX,y:e.clientY};gestureMoved=false;dragging=true;",1)
s=s.replace('function upSelection(){dragging=false;','function upSelection(){gestureStart=null;dragging=false;',1)
s=s.replace('if(disposed||!automatic()||dragging||selecting())return;','if(disposed||manualFollow||!automatic()||dragging||selecting())return;',1)
s=s.replace('if(dragging||selecting()||!automatic()||active<0','if(manualFollow||dragging||selecting()||!automatic()||active<0',1)
s=s.replace('follow(time);return active;}','returnButton.hidden=(!manualFollow&&automatic())||active<0;follow(time);return active;}',1)
s=s.replace('return {rows,paint,dispose(){disposed=true;',"return {rows,paint,returnToCurrent,dispose(){disposed=true;returnButton.remove();viewport.removeEventListener('wheel',navigateLyrics);viewport.removeEventListener('keydown',navigateLyrics);document.removeEventListener('pointermove',moveGesture);",1)
s=s.replace('{automatic:()=>automatic,seek:time=>{if(Number.isFinite(audio.duration))audio.currentTime=time;tick();}}','{automatic:()=>automatic,resumeFollow:()=>{automatic=true;follow.textContent="Défilement automatique : activé";follow.setAttribute("aria-pressed","true");},seek:time=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,time));tick();}}',1)
s=s.replace("window.AU_PROMO_18.configure({getClient:()=>client,getUser:()=>user,isCreator:()=>creatorAccess});","window.AU_PROMO_18.configure({getClient:()=>client,getUser:()=>user,isCreator:()=>creatorAccess});\n window.AU_BETA_20.configure({getClient:()=>client,getUser:()=>user,isCreator:()=>creatorAccess});",1)
p.write_text(s,encoding='utf-8')
p=w/'immersion-18v05-2.js';s=p.read_text(encoding='utf-8').replace('automatic:()=>automatic&&enabled&&d.open,seek:','automatic:()=>automatic&&enabled&&d.open,resumeFollow:()=>{automatic=true;following();},seek:');p.write_text(s,encoding='utf-8')
p=w/'index.html';s=p.read_text(encoding='utf-8').replace('<script src="./promo-18v08.js"></script>','<script src="./promo-18v08.js"></script>\n<script src="./beta-20v00-2.js"></script>');p.write_text(s,encoding='utf-8')
p=w/'sw.js';s=p.read_text(encoding='utf-8').replace('20v00-1-r1','20v00-2-r1').replace("const AU_ASSETS=[","const AU_ASSETS=['./beta-20v00-2.js',",1);p.write_text(s,encoding='utf-8')
print('Public lyrics navigation and private beta hook prepared.')
