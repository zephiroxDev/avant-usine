(()=>{'use strict';
const root=document.documentElement,platform=root.dataset.auApp;
if(platform==='desktop')return;
const query=matchMedia('(max-width:700px), (max-width:1200px) and (pointer:coarse)'),native=platform==='android'||platform==='ios';
const dock=document.querySelector('.player-dock');if(!dock)return;
const key='au-mobile-player-hidden-until-18v07';let until=0,session=false,timer;
try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved)&&saved>Date.now()&&saved<=Date.now()+3600000)until=saved;else localStorage.removeItem(key);}catch{}
const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const close=make('button','×');close.type='button';close.className='control au-mobile-player-close';close.setAttribute('aria-label','Masquer temporairement le lecteur');close.title='Masquer temporairement le lecteur';dock.querySelector('.dock-status').append(close);
const restore=make('button','Réafficher le lecteur');restore.type='button';restore.className='text-button';restore.id='restoreMobilePlayer';document.querySelector('.footer')?.append(restore);
function paint(){clearTimeout(timer);const eligible=native||query.matches,hidden=eligible&&(session||until>Date.now());root.classList.toggle('au-mobile-player-hidden',hidden);close.hidden=!eligible;restore.hidden=!hidden;if(until>Date.now())timer=setTimeout(paint,Math.min(until-Date.now(),2147483647));else if(until){until=0;try{localStorage.removeItem(key);}catch{}}}
function show(){session=false;until=0;try{localStorage.removeItem(key);}catch{}paint();}restore.onclick=show;
close.onclick=()=>{
 const d=make('dialog'),h=make('h2','Masquer le lecteur'),p=make('p','La musique continue. Pendant combien de temps veux-tu masquer le lecteur ?');d.className='au-comfort-dialog au-mobile-player-dialog';d.setAttribute('aria-label','Durée de masquage du lecteur');
 const once=make('button','Jusqu’à la prochaine ouverture du site ou de l’application');once.className='button';once.onclick=()=>{session=true;until=0;try{localStorage.removeItem(key);}catch{}paint();d.close();};
 const label=make('label','Durée personnalisée, de 1 à 60 minutes'),input=make('input');input.type='number';input.min='1';input.max='60';input.step='1';input.value='5';input.required=true;label.append(input);
 const custom=make('button','Masquer pendant la durée choisie');custom.className='button';custom.onclick=()=>{if(!input.reportValidity())return;const minutes=Number(input.value);if(!Number.isInteger(minutes)||minutes<1||minutes>60)return;session=false;until=Date.now()+minutes*60000;try{localStorage.setItem(key,String(until));}catch{}paint();d.close();};
 const cancel=make('button','Annuler');cancel.className='button secondary';cancel.onclick=()=>d.close();d.append(h,p,once,label,custom,cancel);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
};
query.addEventListener('change',paint);window.addEventListener('focus',paint);window.addEventListener('pageshow',paint);document.addEventListener('visibilitychange',paint);paint();
})();
