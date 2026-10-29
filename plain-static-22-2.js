/* Estimated Highlight is a reading aid only. Never publish, export or pass
   its guessed timestamps to the native synchronisation service. */
(()=>{'use strict';let mounted=false;
function mount(){const api=window.AU_EXPERIENCE,column=document.querySelector('#paroles .au20-text-column');if(mounted||!api?.renderLyricView||!column)return;mounted=true;
 const frame=document.getElementById('lyricsFrame'),host=document.createElement('section'),label=document.createElement('p'),viewport=document.createElement('div'),fallback=document.createElement('div');host.className='sync-player au21-approx au22-approx';host.hidden=true;label.className='au22-estimated-label';label.textContent='Highlight approximatif — progression estimée, non synchronisée avec le chant';viewport.className='sync-player-lines';fallback.className='au222-static-text';fallback.hidden=true;host.append(label,viewport,fallback);column.append(host);
 let view=null,signature='',raf=0,fallbackKey='';
 function dispose(){cancelAnimationFrame(raf);raf=0;view?.dispose();view=null;signature='';viewport.replaceChildren();}
 function tick(){cancelAnimationFrame(raf);raf=0;if(!view||host.hidden||document.hidden)return;view.paint(api.audio.currentTime);if(!api.audio.paused)raf=requestAnimationFrame(tick);}
 function refresh(){const audio=api.audio,precise=api.syncData(),lines=api.plainLines(api.plainLyrics()),duration=audio.duration;
  if(precise?.sync_mode!=='blocks'&&precise?.curves?.length||!lines.length){dispose();host.hidden=true;return;}
  host.hidden=false;if(frame)frame.hidden=true;
  if(!Number.isFinite(duration)||duration<=0){dispose();viewport.hidden=true;fallback.hidden=false;label.textContent='Highlight approximatif — disponible après le chargement de l’audio';const key=lines.join('\n');if(key!==fallbackKey){fallbackKey=key;fallback.replaceChildren(...lines.map(line=>{const p=document.createElement('p');p.className='au-lyric-line';p.textContent=line;return p;}));}return;}
  viewport.hidden=false;fallback.hidden=true;label.textContent='Highlight approximatif — progression estimée, non synchronisée avec le chant';
  const volume=api.volume(),track=api.track(),key=volume.number+':'+track.number+'|'+duration+'|'+JSON.stringify(track.audio_edit)+'|'+lines.join('\n');
  if(key!==signature){dispose();signature=key;const range=window.AU_AUDIO_EDITS_19?.normalize(track.audio_edit,duration)||{start:0,end:duration,length:duration},intro=Math.min(8,range.length*.06),available=Math.max(.1,range.length*.95-intro),weights=lines.map(line=>Math.max(6,Array.from(line).length)),total=weights.reduce((a,b)=>a+b,0);let cursor=0;const times=weights.map(weight=>{const t=range.start+intro+cursor/total*available;cursor+=weight;return t;}),data={lines,times,line_ends:times.map((t,i)=>times[i+1]??range.end),duration,end_time:range.end,curves:lines.map((line,i)=>[[0,times[i]],[Array.from(line).length,times[i+1]??range.end]]),sync_mode:'highlight',estimated:true};view=api.renderLyricView(viewport,data,{media:audio,currentOnly:true,endActions:false,seekable:false,seek:()=>{},controlsHost:document.querySelector('[data-xp-lyrics-settings]')||undefined});}
  const state=document.getElementById('lyricsState');if(state)state.textContent='Highlight approximatif · minutage estimé, pas une synchronisation précise.';tick();
 }
 for(const event of ['loadedmetadata','durationchange','seeked','play','pause','timeupdate','emptied','error'])api.audio.addEventListener(event,refresh);
 for(const event of ['au:trackchange','au:routechange','au:sync-published','au:lyrics-render','au22:lyrics-override'])window.addEventListener(event,()=>queueMicrotask(refresh));
 window.addEventListener('message',event=>{if(frame&&event.source===frame.contentWindow&&event.data?.type==='avant-usine-sync-text'&&event.data.request===frame.dataset.request)queueMicrotask(refresh);});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else refresh();});refresh();
}
document.addEventListener('au:experience-mounted',()=>queueMicrotask(mount));window.addEventListener('au:experience-ready',()=>queueMicrotask(mount));mount();})();
