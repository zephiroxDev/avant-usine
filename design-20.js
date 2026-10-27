/* Product composition and real native range decoration. No account/role changes. */
(()=>{'use strict';
const root=document.documentElement,painted=new WeakMap();let context=null,coverKey=null;
function volume(input){
 if(painted.has(input))return;painted.set(input,true);
 const wrap=document.createElement('span'),canvas=document.createElement('canvas'),out=document.createElement('output');wrap.className='au20-volume';canvas.setAttribute('aria-hidden','true');out.setAttribute('aria-hidden','true');input.before(wrap);wrap.append(canvas,input,out);
 let bend=0,lift=0,frame=0,last=0,active=false;
 function draw(){frame=0;if(!input.isConnected)return;const box=wrap.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),min=Number(input.min)||0,max=Number(input.max)||1,v=Math.max(0,Math.min(1,(Number(input.value)-min)/(max-min)));out.textContent=Math.round(v*100)+' %';if(!box.width)return;canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);const g=canvas.getContext('2d');g.scale(dpr,dpr);const w=box.width,h=box.height,x=13+v*(w-55),y=h*.55;
  const style=getComputedStyle(root),ink=style.getPropertyValue('--ink').trim()||'#eee',accent=style.getPropertyValue('--au20-cover-accent').trim()||'#be82b5';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,target=active&&!reduced?1:0;lift+=(target-lift)*.22;const height=3+lift*16,stretch=bend*(.15+lift*.85);
  g.fillStyle='rgba(128,116,131,.22)';g.beginPath();g.roundRect(5,y-8,w-10,16,9);g.fill();g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=3+lift*9;g.shadowOffsetY=2+lift*6;
  const gradient=g.createLinearGradient(0,y-20,w,y+9);gradient.addColorStop(0,'#e9dce6');gradient.addColorStop(.36,accent);gradient.addColorStop(.67,accent);gradient.addColorStop(1,'#4c354b');g.fillStyle=gradient;
  g.beginPath();g.moveTo(6,y+5);g.bezierCurveTo(16,y-height-stretch,Math.max(18,x-30),y-height-5-stretch,x,y-5);g.bezierCurveTo(x+12,y+3,x+5,y+12,x-9,y+9);g.bezierCurveTo(Math.max(12,x-40),y+6-height*.5-stretch,13,y+5-height*.6,6,y+5);g.closePath();g.fill();g.restore();
  const fold=g.createLinearGradient(x-14,0,x+8,0);fold.addColorStop(0,'rgba(0,0,0,0)');fold.addColorStop(.55,'rgba(0,0,0,.28)');fold.addColorStop(1,'rgba(255,255,255,.5)');g.fillStyle=fold;g.beginPath();g.moveTo(x-9,y-8);g.bezierCurveTo(x+8,y-8,x+13,y+9,x-9,y+9);g.bezierCurveTo(x-2,y+5,x-2,y-4,x-9,y-8);g.fill();
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1;g.beginPath();g.moveTo(8,y+1);g.bezierCurveTo(19,y-height+2-stretch,Math.max(20,x-28),y-height-2-stretch,x,y-5);g.stroke();out.textContent=Math.round(v*100)+' %';out.style.color=ink;
  if(Math.abs(target-lift)>.003||Math.abs(bend)>.15){bend*=.8;frame=requestAnimationFrame(draw);}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 input.addEventListener('input',()=>{const now=Number(input.value);bend=Math.max(-7,Math.min(12,(now-last)*130));last=now;schedule();});
 input.addEventListener('pointerdown',()=>{active=true;last=Number(input.value);schedule();});const up=()=>{active=false;schedule();};input.addEventListener('pointerup',up);input.addEventListener('pointercancel',up);input.addEventListener('change',up);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('blur',up);
 new ResizeObserver(schedule).observe(wrap);document.getElementById('audio')?.addEventListener('volumechange',schedule);window.addEventListener('au:trackchange',schedule);window.addEventListener('au:design-color',schedule);new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-theme']});schedule();
}
function tidyLyrics(){
 const text=document.querySelector('.au20-text-column');if(!text)return;
 const settings=document.querySelector('[data-xp-lyrics-settings]');
 let options=settings?.querySelector('.au20-lyric-options')||text.querySelector(':scope > .au20-lyric-options');if(!options){options=document.createElement('details');options.className='au20-lyric-options';const title=document.createElement('summary');title.textContent='Options des paroles';options.append(title);(settings||text).append(options);}
 for(const node of text.querySelectorAll('.lyrics-selection-help,.sync-toolbar,.sync-player > button:not(.au-lyrics-return),.sync-player > .au-lyrics-toolbar'))if(!options.contains(node))options.append(node);
 if(options.parentElement===text&&text.lastElementChild!==options)text.append(options);
}
function composition(){
 const card=document.querySelector('#paroles .lyrics-card');if(!card||card.dataset.au20Mounted)return;card.dataset.au20Mounted='true';card.classList.add('au20-listening');
 const art=document.createElement('section'),picture=document.createElement('div'),artist=document.createElement('p'),text=document.createElement('section');art.className='au20-art-column';art.setAttribute('aria-label','Morceau en lecture');picture.className='au20-player-art';artist.className='au20-track-artist';text.className='au20-text-column';
 for(const node of [...card.childNodes])text.append(node);const title=text.querySelector('#lyricsTitle');art.append(picture);if(title)art.append(title);art.append(artist);card.append(art,text);tidyLyrics();
}
function tidyDock(){
 const dock=document.querySelector('.dock-status');if(!dock)return;let menu=dock.querySelector(':scope > .au20-dock-menu');
 const buttons=[...dock.querySelectorAll(':scope > button')].filter(button=>!['openLyrics','retry'].includes(button.id)&&!button.classList.contains('au-mobile-player-close'));
 // The current experience already exposes these controls in its listening settings.
 // Do not leave a second, empty disclosure after the controls have been moved.
 if(!buttons.length&&!menu?.querySelector('button')){menu?.remove();return;}
 if(!menu){menu=document.createElement('details');menu.className='au20-dock-menu';const summary=document.createElement('summary');summary.textContent='Options d’écoute';menu.append(summary);dock.append(menu);}
 for(const button of buttons)menu.append(button);
}
async function update(){
 if(!context)return;composition();const v=context.getVolume(),t=context.track(),key=v?.number+':'+t?.number;const picture=document.querySelector('.au20-player-art'),artist=document.querySelector('.au20-track-artist');if(artist)artist.textContent=(t?.artist||'JuL')+' · '+(v?.title||'');
 if(picture&&v&&coverKey!==v){coverKey=v;picture.replaceChildren(context.canvasFor(v,900));await context.applyCoverAtmosphere(document.querySelector('.au20-listening'),v);const accent=getComputedStyle(document.querySelector('.au20-listening')).getPropertyValue('--lyrics-accent').trim();if(accent){root.style.setProperty('--au20-cover-accent',accent);window.dispatchEvent(new Event('au:design-color'));}}
}
function mount(next){context=next;composition();update();}
function scan(){for(const input of document.querySelectorAll('#volume,input[aria-label="Volume sonore"]'))volume(input);}
window.AU_DESIGN_20={mount,update};window.addEventListener('au:design-ready',e=>mount(e.detail));window.addEventListener('au:trackchange',update);window.addEventListener('au:lyrics-render',()=>queueMicrotask(update));scan();tidyDock();if(window.AU_DESIGN_CONTEXT_20)mount(window.AU_DESIGN_CONTEXT_20);
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();tidyLyrics();tidyDock();});}).observe(document.body,{childList:true,subtree:true});
})();
