/* A single slider records Unicode character positions against the audio clock. */
(function(){
'use strict';
function create({host,phrase,audio,status,onCapture,onAdvance}){
 const el=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
 const frame=el('div','studio19-slider-wrap'),bar=el('div','studio19-slider'),dots=el('div','studio19-slider-dots'),thumb=el('span','studio19-slider-thumb');
 bar.tabIndex=0;bar.setAttribute('role','slider');bar.setAttribute('aria-label','Progression de la phrase Highlight');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
 dots.setAttribute('aria-hidden','true');thumb.setAttribute('aria-hidden','true');bar.append(dots,thumb);frame.append(bar);host.append(frame);
 let line=null,chars=[],stroke=null,pointer=null,reset=false,disposed=false,position=0,anchorX=0,anchorPosition=0,sensitivity=5;
 try{const stored=Number(localStorage.getItem('au-highlight-sensitivity'));if(Number.isFinite(stored)&&stored>=1&&stored<=10)sensitivity=Math.round(stored);}catch{}
 const sensitivityLabel=el('label','studio19-sensitivity'),sensitivityInput=el('input',''),sensitivityValue=el('output','');sensitivityInput.type='range';sensitivityInput.min='1';sensitivityInput.max='10';sensitivityInput.step='1';sensitivityInput.value=sensitivity;sensitivityInput.setAttribute('aria-label','Sensibilité de la barre Highlight');sensitivityInput.title='1 : lente et précise · 10 : rapide';sensitivityLabel.append(document.createTextNode('Sensibilité '),sensitivityInput,sensitivityValue);frame.append(sensitivityLabel);
 const showSensitivity=()=>{sensitivityValue.value=sensitivity+' / 10';sensitivityInput.setAttribute('aria-valuetext',sensitivity+' sur 10');};showSensitivity();sensitivityInput.oninput=()=>{stop();sensitivity=Math.max(1,Math.min(10,Math.round(Number(sensitivityInput.value)||5)));try{localStorage.setItem('au-highlight-sensitivity',sensitivity);}catch{}showSensitivity();};
 const size=()=>Array.from(line?.text||'').length;
 // WebKit may expose a cached currentTime for a few frames: extrapolate it from
 // the wall clock while playing so the stroke never stalls on a frozen value.
 let clockMedia=-1,clockWall=0;
 const clock=()=>{const media=audio.currentTime,now=performance.now();if(media!==clockMedia){clockMedia=media;clockWall=now;return Math.round(media*1000)/1000;}const rate=audio.playbackRate||1,extra=Math.min(.5,(now-clockWall)/1000*rate);return Math.round((media+extra)*1000)/1000;};
 // A seek that WebKit never reports as finished must not block a playing track.
 const busy=()=>audio.seeking&&audio.readyState<3;
 // iOS app: the native audio relay may report paused while the WebView keeps
 // playing. The real clock moving is trusted over the paused flag.
 let advanceMedia=audio.currentTime,advanceWall=0;
 const watch=()=>{if(audio.currentTime!==advanceMedia){advanceMedia=audio.currentTime;advanceWall=performance.now();}};
 audio.addEventListener('timeupdate',watch);const watchTimer=setInterval(watch,120);
 const playing=()=>{watch();return !audio.paused||performance.now()-advanceWall<700;};
 const hint=el('p','studio19-slider-hint');hint.setAttribute('role','status');hint.hidden=true;frame.insertBefore(hint,sensitivityLabel);
 const say=text=>{status.textContent=text;hint.textContent=text;hint.hidden=!text;};
 function paint(value){position=Math.max(0,Math.min(1,value));bar.style.setProperty('--position',position);thumb.style.left='calc(20px + (100% - 40px) * '+position+')';bar.setAttribute('aria-valuenow',String(Math.round(position*100)));bar.setAttribute('aria-valuetext',Math.round(position*100)+' % de la phrase');const offset=position*size();chars.forEach((n,i)=>{const f=Math.max(0,Math.min(1,offset-i))*100+'%';n.style.setProperty('--fill',f);n.style.backgroundImage='linear-gradient(90deg,#c87bff '+f+',var(--text,#f6edff) '+f+')';});const width=phrase.clientWidth,offsetPx=position*Math.max(0,phrase.scrollWidth-width);phrase.scrollLeft=offsetPx;}
 function canRecord(){if(!line||line.locked){say(line?'Déverrouille cette phrase avant de la synchroniser.':'Cette voix est terminée.');return false;}if(window.AU_ISLAND_AUDIO_19?.active){window.AU_ISLAND_AUDIO_19.restore?.();say('La musique revient dans l’Atelier… recommence dans une seconde.');return false;}if(!playing()||busy()||!Number.isFinite(audio.currentTime)){say(busy()?'Chargement du morceau… attends une seconde puis recommence.':'Lance la musique avec « Écouter », puis fais glisser la barre au rythme du chant.');return false;}say('');return true;}
 function begin(){if(!canRecord())return false;const saved=line.end===null&&line.points?.length?line.points.map(p=>[...p]):null;stroke={id:line.id,points:saved||[[0,clock()]],length:size()};paint(stroke.points.at(-1)[0]/stroke.length);status.textContent='Enregistrement : fais avancer la barre au rythme du chant.';bar.dataset.recording='true';return true;}
 function save(complete=false){if(!stroke)return true;const record=stroke;stroke=null;bar.dataset.recording='false';try{onCapture(record.id,record.points,complete);return true;}catch(e){status.textContent=e.message;return false;} }
 function sample(value){if(!stroke||!playing()||busy())return;let x=Math.max(0,Math.min(stroke.length,value*stroke.length)),t=clock(),points=stroke.points,last=points.at(-1);if(x<=last[0]||t<=last[1]){paint(last[0]/stroke.length);return;}
  // An almost identical position preserves audible holds without duplicate offsets.
  if(x<stroke.length&&t-last[1]>.12&&x-last[0]>.001)points.push([last[0]+.0001,t-.001]);
  points.push([x,t]);if(points.length>1800)stroke.points=points.filter((_,i)=>i===0||i===points.length-1||i%2===0);paint(x/stroke.length);
  if(x>=stroke.length&&save(true)){reset=true;onAdvance();status.textContent=line?(audio.paused?'Phrase suivante prête. Reprends la musique pour continuer.':'Phrase suivante prête : ramène la barre au début, puis continue.'):'Cette voix est synchronisée. Vérifie son aperçu.';}
 }
 const pointerPosition=e=>{const r=bar.getBoundingClientRect(),pad=20;return Math.max(0,Math.min(1,(e.clientX-r.left-pad)/Math.max(1,r.width-2*pad)));};
 bar.style.touchAction='none';
 // iOS/WebKit: a touch that starts on the bar inside a scrollable dialog may be
 // taken over by native scrolling (pointercancel), which froze the bar in 23.1.
 // Touch input is therefore handled with non-passive touch events that refuse
 // scrolling; pointer events stay in charge of mouse and pen.
 let touchId=null;
 const touchOf=e=>[...e.changedTouches].find(t=>t.identifier===touchId);
 function touchStart(e){if(disposed||touchId!==null||e.touches.length>1)return;e.preventDefault();const t=e.changedTouches[0];if(!begin())return;touchId=t.identifier;reset=false;anchorX=t.clientX;anchorPosition=position;bar.focus({preventScroll:true});}
 function touchMove(e){if(touchId===null)return;const t=touchOf(e);if(!t)return;e.preventDefault();movePointer({pointerId:'touch',clientX:t.clientX,preventDefault(){}},true);}
 function touchEnd(e){if(touchId===null||!touchOf(e))return;e.preventDefault();touchId=null;stop();}
 bar.addEventListener('touchstart',touchStart,{passive:false});
 document.addEventListener('touchmove',touchMove,{passive:false,capture:true});
 document.addEventListener('touchend',touchEnd,{passive:false,capture:true});document.addEventListener('touchcancel',touchEnd,{passive:false,capture:true});
 bar.onpointerdown=e=>{if(e.pointerType==='touch'||e.button!==0||disposed||pointer!==null||touchId!==null)return;e.preventDefault();if(!begin())return;pointer=e.pointerId;reset=false;anchorX=e.clientX;anchorPosition=position;try{bar.setPointerCapture(pointer);}catch{}bar.focus({preventScroll:true});};
 function movePointer(e,fromTouch=false){if(disposed||(fromTouch?touchId===null:e.pointerId!==pointer))return;e.preventDefault();if(!playing()||busy()){stop();return;}if(reset){if(pointerPosition(e)>.03)return;reset=false;if(!begin())return;anchorX=e.clientX;anchorPosition=position;}const width=Math.max(1,bar.getBoundingClientRect().width-40);sample(anchorPosition+(e.clientX-anchorX)/width*(sensitivity/5));}
 function stop(){save(false);const id=pointer;pointer=null;touchId=null;reset=false;if(id!==null&&bar.hasPointerCapture(id))bar.releasePointerCapture(id);}
 function releasePointer(e){if(e.pointerId===pointer)stop();}
 // The active finger owns the gesture even outside the bar or after capture loss.
 document.addEventListener('pointermove',movePointer,{capture:true,passive:false});
 document.addEventListener('pointerup',releasePointer,true);document.addEventListener('pointercancel',releasePointer,true);
 const blur=()=>stop();window.addEventListener('blur',blur);
 bar.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)||disposed)return;e.preventDefault();if(e.key==='ArrowLeft'||e.key==='Home'){status.textContent='Pour corriger, reprends cette phrase ou utilise Annuler.';return;}if(!stroke&&!begin())return;sample(e.key==='End'?1:position+(sensitivity/5)/Math.max(1,size()));};
 const interrupt=()=>stop();audio.addEventListener('pause',interrupt);audio.addEventListener('seeking',interrupt);audio.addEventListener('ended',interrupt);
 return {element:frame,flush:stop,render(next){if(stroke&&stroke.id!==next?.id)save(false);line=next;frame.hidden=!next;bar.setAttribute('aria-disabled',String(!next||next.locked));phrase.replaceChildren();phrase.classList.add('studio19-glide-phrase');chars=[];if(!next){phrase.textContent='Cette voix est terminée. Vérifie l’aperçu ou reprends une phrase.';return;}const text=el('span','studio19-glide-text');Array.from(next.text).forEach(ch=>{const n=el('span','studio19-glide-char');n.textContent=ch;chars.push(n);text.append(n);});phrase.append(text);dots.replaceChildren();const total=size();let offset=0;for(const word of next.text.match(/\S+\s*|\s+/gu)||[]){const dot=el('span','studio19-slider-dot');dot.style.left=offset/total*100+'%';dots.append(dot);offset+=Array.from(word).length;}paint(stroke?stroke.points.at(-1)[0]/total:next.end===null&&next.points?.length?next.points.at(-1)[0]/total:0);},dispose(){stop();disposed=true;document.removeEventListener('pointermove',movePointer,true);document.removeEventListener('pointerup',releasePointer,true);document.removeEventListener('pointercancel',releasePointer,true);bar.removeEventListener('touchstart',touchStart);document.removeEventListener('touchmove',touchMove,true);document.removeEventListener('touchend',touchEnd,true);document.removeEventListener('touchcancel',touchEnd,true);window.removeEventListener('blur',blur);audio.removeEventListener('pause',interrupt);audio.removeEventListener('timeupdate',watch);clearInterval(watchTimer);audio.removeEventListener('seeking',interrupt);audio.removeEventListener('ended',interrupt);sensitivityInput.oninput=null;bar.onpointerdown=bar.onpointermove=bar.onpointerup=bar.onpointercancel=bar.onlostpointercapture=bar.onkeydown=null;frame.remove();}};
}
window.AU_SYNC_SLIDER_19V03={create};
})();

