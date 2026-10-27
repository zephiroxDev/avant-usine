/* Listening presentation only. Audio, timestamps, accounts and annotations
   continue to use the original application services. */
(()=>{'use strict';
 let mounted=false;
 function mount(){
  const full=document.querySelector('.xp-full-player'),api=window.AU_EXPERIENCE;
  if(mounted||!full||!api)return;mounted=true;
  const body=full.querySelector('.xp-dialog-body'),normal=full.querySelector('.xp-player-normal'),dock=full.querySelector('.player-dock'),lyrics=full.querySelector('#paroles');
  const identity=lyrics.querySelector('.au20-art-column'),identityHome=identity?.parentElement;const footer=document.createElement('section');footer.className='xp-listening-transport';footer.setAttribute('aria-label','Commandes de lecture');body.insertBefore(footer,body.querySelector('.xp-player-switch'));
  const options=lyrics.querySelector('.au20-lyric-options'),annotations=lyrics.querySelector('.xp-annotations');if(options&&annotations)options.append(annotations);
  const glass=document.createElement('div');glass.className='xp-listening-light';glass.setAttribute('aria-hidden','true');full.prepend(glass);
  let timer=0,deadline=0,idle=false,ignoreWakeClick=false;
  const surfaces=()=>[full.querySelector('.xp-dialog-head'),footer,full.querySelector('.xp-player-switch'),full.querySelector('#xpOriginalOptions'),options].filter(Boolean);
  const active=()=>full.open&&full.classList.contains('xp-show-lyrics');
  function setIdle(value){if(value&&!idle){for(const n of surfaces())n.style.setProperty('--au221-chrome-height',Math.max(0,n.getBoundingClientRect().height)+'px');}idle=value;full.classList.toggle('xp-listening-idle',value);for(const n of surfaces())n.inert=value;}
  function settle(){clearTimeout(timer);if(!active())return;const remaining=deadline-performance.now();if(remaining>0){timer=setTimeout(settle,remaining);return;}
   // Never hide an open menu, an edited control or a keyboard focus target.
   if(full.querySelector('details[open],input:focus,textarea:focus,select:focus,:focus-visible')||[...document.querySelectorAll('dialog[open]')].some(d=>d!==full)){wake();return;}setIdle(true);
  }
  function wake(){setIdle(false);clearTimeout(timer);if(active()){deadline=performance.now()+10000;timer=setTimeout(settle,10000);}}
  function sync(){if(active()){if(identity&&identity.parentElement!==footer)footer.prepend(identity);if(dock.parentElement!==footer)footer.append(dock);wake();}else{if(identity&&identityHome&&identity.parentElement!==identityHome)identityHome.prepend(identity);if(dock.parentElement!==normal)normal.append(dock);clearTimeout(timer);setIdle(false);}}
  function activity(e){if(!active())return;const wasIdle=idle;wake();if(e.type==='pointerdown'){ignoreWakeClick=wasIdle;if(wasIdle){e.preventDefault();e.stopImmediatePropagation();}}}
  full.addEventListener('click',e=>{if(ignoreWakeClick){ignoreWakeClick=false;e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
  for(const event of ['pointerdown','pointermove','keydown','wheel','focusin'])full.addEventListener(event,activity,{capture:true,passive:false});
  full.addEventListener('close',()=>{clearTimeout(timer);setIdle(false);if(dock.parentElement!==normal)normal.append(dock);});
  new MutationObserver(sync).observe(full,{attributes:true,attributeFilter:['open']});
  // Class changes from the timer must not reset the timer itself.
  let lyricsMode=full.classList.contains('xp-show-lyrics');new MutationObserver(()=>{const next=full.classList.contains('xp-show-lyrics');if(next!==lyricsMode){lyricsMode=next;sync();}}).observe(full,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});window.addEventListener('au:trackchange',wake);sync();
 }
 document.addEventListener('au:experience-mounted',()=>queueMicrotask(mount));mount();
})();
