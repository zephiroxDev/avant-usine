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

// 25.2 : curseurs (progression, volume, effets…) au doigt. Une fois attrapé, le curseur suit le doigt
// jusqu'au relâchement, même hors de la barre, et la page ne défile pas pendant ce temps.
(()=>{let active=null,id=null;
const apply=(input,x)=>{const r=input.getBoundingClientRect(),min=+input.min||0,max=input.max===''?100:+input.max,step=input.step==='any'?0:(+input.step||1),pad=Math.min(10,r.width/4);
 let ratio=(x-r.left-pad)/Math.max(1,r.width-2*pad);ratio=Math.max(0,Math.min(1,ratio));if(getComputedStyle(input).direction==='rtl')ratio=1-ratio;
 let v=min+ratio*(max-min);if(step){v=min+Math.round((v-min)/step)*step;const d=(String(step).split('.')[1]||'').length;v=+v.toFixed(d);}v=Math.max(min,Math.min(max,v));
 if(String(v)===input.value)return;input.value=String(v);input.dispatchEvent(new Event('input',{bubbles:true}));};
const find=e=>[...e.changedTouches].find(t=>t.identifier===id);
document.addEventListener('touchstart',e=>{if(active||e.touches.length>1)return;const input=e.target?.closest?.('input[type=range]');if(!input||input.disabled||document.documentElement.dataset.design!=='25')return;
 e.preventDefault();active=input;id=e.changedTouches[0].identifier;document.documentElement.classList.add('au25-dragging');try{input.focus({preventScroll:true});}catch{}apply(input,e.changedTouches[0].clientX);},{passive:false,capture:true});
document.addEventListener('touchmove',e=>{if(!active)return;const t=find(e);if(!t)return;e.preventDefault();apply(active,t.clientX);},{passive:false,capture:true});
const end=e=>{if(!active||!find(e))return;const input=active;active=null;id=null;document.documentElement.classList.remove('au25-dragging');input.dispatchEvent(new Event('change',{bubbles:true}));};
document.addEventListener('touchend',end,{capture:true});document.addEventListener('touchcancel',end,{capture:true});
document.addEventListener('gesturestart',e=>{if(active)e.preventDefault();},{passive:false});})();
/* 25.2 — Corrections d'usage : message bref, liens rangés dans l'ancien pied de page, bouton
   Précédent du navigateur, raccourcis clavier, messages techniques remplacés. */
(()=>{'use strict';
const root=document.documentElement,$=id=>document.getElementById(id);
if(root.dataset.design!=='25')return;
const app=()=>root.dataset.auApp||'';
/* Message bref, en bas de l'écran. */
let toast=null,toastTimer=0;
window.AU_SAY_25=text=>{if(!toast){toast=document.createElement('div');toast.className='au25-toast';toast.setAttribute('role','status');}
 ([...document.querySelectorAll('dialog[open]')].at(-1)||document.body).append(toast);toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2600);};
/* Les boutons que les applications ajoutent à l'ancien pied de page (rouage Windows, mises à jour iOS,
   « À propos ») rejoignent le pied de page visible. */
function adopt(){const next=document.querySelector('.au222-footer');if(!next)return;
 for(const n of document.querySelectorAll('.footer > button:not([data-go]):not([data-au25-adopted])')){n.dataset.au25Adopted='1';n.classList.add('au222-text');n.classList.remove('text-button');
  if(n.classList.contains('desktop-settings-open')){n.textContent='Personnaliser l’application';n.classList.remove('desktop-settings-open');n.removeAttribute('title');}
  next.insertBefore(n,next.querySelector('.au222-visit-count'));}}
function watchFooter(){adopt();const old=document.querySelector('.footer');if(old)new MutationObserver(adopt).observe(old,{childList:true});}
/* Bouton Précédent du navigateur : revient à la page d'avant, ou ferme la fenêtre ouverte. */
const restorable=new Set(['accueil','collection','ecoute','telechargements','bibliotheque','decouvrir','communaute','historique','repertoire','infos','blindtest','statistiques','recherche','compte','reglages','playlists','textes-expliques','confidentialite','soutenir']);
let fromHistory=false,current=null;
function historySetup(){const api=window.AU_EXPERIENCE;if(!api)return;
 const wanted=decodeURIComponent(location.hash.slice(1));current=api.route?.()||'accueil';
 try{history.replaceState({au25:current},'',location.pathname+location.search+(current==='accueil'?'':'#'+current));}catch{}
 window.addEventListener('au:routechange',e=>{const r=e.detail?.route;if(!r||r===current)return;current=r;if(fromHistory)return;
  try{history.pushState({au25:r},'',location.pathname+location.search+(r==='accueil'?'':'#'+r));}catch{}});
 window.addEventListener('popstate',e=>{const open=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(open&&!open.matches('[data-au25-locked]')){let closed=false;const cancel=new Event('cancel',{cancelable:true});open.dispatchEvent(cancel);if(!cancel.defaultPrevented){open.close();closed=true;}
   try{history.pushState({au25:current},'',location.pathname+location.search+(current==='accueil'?'':'#'+current));}catch{}if(closed||true)return;}
  const r=e.state?.au25||decodeURIComponent(location.hash.slice(1))||'accueil';if(!restorable.has(r)&&r!==current)return;
  fromHistory=true;try{(window.AU_COMPOSITION_22_2?.navigate||api.navigate)(r);}finally{fromHistory=false;current=api.route?.()||r;}});
 if(restorable.has(wanted)&&wanted!==current&&wanted!=='accueil'){fromHistory=true;try{(window.AU_COMPOSITION_22_2?.navigate||api.navigate)(wanted);}finally{fromHistory=false;current=api.route?.()||wanted;}
  try{history.replaceState({au25:current},'',location.pathname+location.search+'#'+current);}catch{}}}
/* Raccourcis clavier de lecture (hors champs de saisie, hors Atelier et Blind Test). */
function keys(e){if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
 const t=e.target,audio=$('audio');if(!audio||!audio.getAttribute('src'))return;
 if(t?.closest?.('input,textarea,select,[contenteditable=""],[contenteditable="true"],.au-studio-19,.studio19,#blindtest,[role=slider]'))return;
 if(document.querySelector('dialog[open] .au-studio-19,dialog[open].au-studio-19'))return;if(root.dataset.xpRoute==='blindtest'&&!document.querySelector('dialog[open]'))return;
 const player=!!document.querySelector('dialog.xp-full-player[open]'),otherDialog=[...document.querySelectorAll('dialog[open]')].some(d=>!d.matches('.xp-full-player'));if(otherDialog)return;
 const volume=d=>{const v=Math.max(0,Math.min(1,Math.round((audio.volume+d)*20)/20));audio.muted=false;const input=$('volume');if(input){input.value=String(v);input.dispatchEvent(new Event('input',{bubbles:true}));}else audio.volume=v;window.AU_SAY_25('Volume : '+Math.round(v*100)+' %');};
 if(e.code==='Space'){if(t?.closest?.('button,a,summary,[role=button],[tabindex]:not([tabindex="-1"]):not(body):not(dialog):not(h1)'))return;e.preventDefault();$('play')?.click();}
 else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){if(t?.closest?.('[role=tablist],[role=radiogroup],[role=listbox],[role=menu]'))return;if(!Number.isFinite(audio.duration))return;e.preventDefault();audio.currentTime=Math.max(0,Math.min(audio.duration-0.2,audio.currentTime+(e.key==='ArrowRight'?5:-5)));}
 else if((e.key==='ArrowUp'||e.key==='ArrowDown')&&(player||e.shiftKey)){e.preventDefault();volume(e.key==='ArrowUp'?0.05:-0.05);}
 else if(e.key==='m'||e.key==='M'){if(e.repeat)return;audio.muted=!audio.muted;window.AU_SAY_25(audio.muted?'Son coupé.':'Son rétabli.');}}
/* Un message technique (en anglais) ne doit jamais s'afficher tel quel. */
const technical=/Cannot read propert|is not iterable|is not a function|is not defined|Failed to fetch|Load failed|NetworkError|undefined is not|null is not|Unexpected token|JSON\.parse|of undefined|of null/;
const friendly='Impossible de charger pour le moment. Vérifie ta connexion puis réessaie.';
function soften(node){if(node.nodeType===3){if(node.data.length<400&&technical.test(node.data))node.data=friendly;return;}
 if(node.nodeType!==1||node.matches?.('script,style,textarea,input,pre,code,.sync-blocks,.lyrics'))return;
 const text=node.textContent;if(!text||text.length>600||!technical.test(text))return;
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))if(technical.test(n.data))n.data=friendly;}
function watchErrors(){new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')soften(m.target);else for(const n of m.addedNodes)soften(n);}}).observe(document.body,{childList:true,subtree:true,characterData:true});}
/* Éditeur du site : réservé aux grands écrans (PC et application Windows). */
function editorGate(){const phone=()=>app()==='ios'||app()==='android'||matchMedia('(max-width:900px)').matches;
 const apply=()=>{for(const b of document.querySelectorAll('button'))if(b.textContent.trim()==='Éditeur du site'&&!b.closest('.site-editor,[class*=au25-ed]'))b.hidden=phone();};
 apply();window.addEventListener('au:routechange',()=>setTimeout(apply,200));window.addEventListener('au:role-changed',()=>setTimeout(apply,400));setTimeout(apply,3000);addEventListener('resize',apply);}
function start(){watchFooter();historySetup();watchErrors();editorGate();document.addEventListener('keydown',keys);}
let started=false;const boot=()=>{if(started||!window.AU_COMPOSITION_22_2||!document.querySelector('.au222-footer'))return;started=true;start();};
document.addEventListener('au:experience-mounted',()=>setTimeout(boot,0));window.addEventListener('load',()=>{boot();setTimeout(boot,800);setTimeout(boot,2500);});
})();
