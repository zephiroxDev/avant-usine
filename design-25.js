/* 25.0 — Direction artistique « Lumière sodium » : active la couche design-25 et marque le
   morceau en cours d'un égaliseur. Aucune donnée n'est modifiée. */
(()=>{'use strict';
const root=document.documentElement;root.dataset.design='25';
const audio=()=>document.getElementById('audio');
function eq(){const n=document.createElement('span');n.className='au24-eq';n.setAttribute('aria-hidden','true');n.append(document.createElement('i'),document.createElement('i'),document.createElement('i'));return n;}
function mark(){
 const api=window.AU_EXPERIENCE,t=api?.track?.(),list=document.getElementById('tracklist');if(!list)return;
 for(const n of list.querySelectorAll('.au24-eq'))n.remove();
 for(const n of list.querySelectorAll('[data-au24-playing]')){n.removeAttribute('data-au24-playing');n.removeAttribute('data-playing');}
 if(!t)return;
 const rows=[...list.querySelectorAll('[data-track], li')];
 const row=rows.find(r=>{const s=r.querySelector('strong,h3,.track-title,button');return s&&s.textContent.trim().replace(/^\d+\s*/,'')===String(t.title).trim();});
 if(!row)return;row.dataset.au24Playing='true';row.dataset.playing='true';
 const label=row.querySelector('strong,h3,.track-title')||row;const e=eq();if(audio()?.paused)e.classList.add('au24-paused');label.prepend(e);
}
let queued=false;const later=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mark();});};
for(const ev of ['au:trackchange','au:routechange','au:experience-ready'])window.addEventListener(ev,later);
document.addEventListener('play',later,true);document.addEventListener('pause',later,true);
const own=n=>n.nodeType===1&&(n.classList.contains('au24-eq')||n.parentElement?.classList?.contains('au24-eq'));
new MutationObserver(m=>{if(m.some(r=>(r.target.id==='tracklist'||r.target.closest?.('#tracklist'))&&![...r.addedNodes,...r.removedNodes].every(own)))later();}).observe(document.body,{childList:true,subtree:true});
})();

// 25.1 : remplissage du curseur de volume (le ruban dessiné est remplacé).
(()=>{const paint=i=>{const min=+i.min||0,max=+i.max||100;i.style.setProperty('--au25-v',((+i.value-min)/(max-min||1)*100)+'%');};
 const scan=()=>document.querySelectorAll('.au20-volume input[type=range]').forEach(i=>{if(!i.dataset.au25v){i.dataset.au25v='1';i.addEventListener('input',()=>paint(i));}paint(i);});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();setInterval(scan,1500);})();

// 25.1 : icônes seules agrandies (✕, ↻…), « Actualiser » de Communauté en icône.
(()=>{const scan=()=>{
 document.querySelectorAll(':is(.major-dialog-head,.au-dialog-head,.xp-dialog-head,.au-art-header) > button,.xp-close,.au-art-close').forEach(b=>{const t=b.textContent.trim();b.classList.toggle('au25-glyph',t.length>0&&[...t].length<=2);});
 document.querySelectorAll('.au-gamepad-settings > button:not(.button)').forEach(b=>b.classList.add('button','secondary'));
 document.querySelectorAll('.dc-heading > button.dc-text-button').forEach(b=>{if(b.dataset.au25r)return;if(b.textContent.trim()!=='Actualiser')return;b.dataset.au25r='1';b.textContent='↻';b.setAttribute('aria-label','Actualiser');b.title='Actualiser';b.classList.add('au25-refresh');});
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();setInterval(scan,1000);})();

// 25.1.1 : Safari et l'appli iPhone n'ont pas droit au flou « filter » sur les paroles (barres noires).
(()=>{const ua=navigator.userAgent||'';const webkit=/AppleWebKit/.test(ua)&&!/Chrome|Chromium|CriOS|Edg|OPR|Android/.test(ua);if(webkit||document.documentElement.dataset.auApp==='ios'||window.Capacitor?.getPlatform?.()==='ios')document.documentElement.classList.add('au25-webkit');
const tidy=()=>document.querySelectorAll('details.xp-original-options').forEach(d=>{const visible=[...d.children].some(c=>c.tagName!=='SUMMARY'&&c.getClientRects().length&&c.getBoundingClientRect().height>4)||[...d.children].some(c=>c.tagName==='SUMMARY'&&c.getClientRects().length&&c.getBoundingClientRect().height>4);d.classList.toggle('au25-empty',!visible);});const safe=host=>{if(!host||host.querySelector(':scope > .au25-safe-top'))return;const b=document.createElement('div');b.className='au25-safe-top';b.setAttribute('aria-hidden','true');host.append(b);};
const guard=()=>{safe(document.body);document.querySelectorAll('dialog.au222-page-surface').forEach(safe);tidy();};setInterval(guard,800);if(document.body)guard();else document.addEventListener('DOMContentLoaded',guard);})();
