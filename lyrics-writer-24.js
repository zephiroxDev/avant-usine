/* 24.0 — Lyrics writing companion: built-in player, spelling suggestions
   (never automatic) and the thank-you panel after a contribution. */
(()=>{'use strict';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const fmt=s=>{if(!Number.isFinite(s)||s<0)s=0;const m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+String(r).padStart(2,'0');};
const RATES=[.25,.5,.75,1,1.5,2];

/* ---------- Lexique Avant l'usine ----------
   Words that must never be reported: rap slang, verlan, Marseille expressions,
   onomatopoeias and names. The published lyrics of the catalogue are added at
   runtime, so every word Jul already uses on the site is accepted too. */
const BASE=`
wesh wsh wallah wallahi zarma starfoullah starfoulah hamdoulah hamdoullah inchallah inshallah mashallah bismillah sheitan haram halal hess hass zbeul zbel
frérot frero frérot frérots frelot frelots frelonne poto potos gadji gadjo gadjos daron darons daronne daronnes reuf reufs reus reum reums renoi renois rebeu rebeus beur beurs babtou babtous kainf
meuf meufs keum keums ouf relou relous chelou chelous zarbi zarbis vénère vener véner téma tema ken kène pécho pecho chanmé chanmax ouam ouame iench chienne teubé teubés tebé cimer ceum cefran
keuf keufs schmitt schmitts bleus baqueux bac condé condés poulets stup stups shtar shtars zonzon placard ballon gnouf mitard parlu parloir hebs hebsi ratpi
bédo bedo bédos pilon pilons beuh beuz shit teush teuchi tarpé tarpés oinj oinjs joint spliff zetla zetlas pochon pochons barrette savonnette plaquette kil kilo kilos kilogs bicrave bicraver bicravé charbon charbonner charbonneur charbonneurs guetteur guetteurs choufs chouf choufeur nourrice nourrices terrain terrains four fours pochav
oseille oseilles biff biffs bif thune thunes maille mailles moula moulaga lovés lové liasses liasse pépètes pépettes balles bâton bâtons plaque plaques brique briques patate patates sous flouze fric caillasse
gova govas caisse caisses tchop tcho bécane bécanes tmax t-max bigo bigos binks bloc blocs hall halls tess tèss tieks tiek cité cités quartier quartiers zoo zone
bendo bando gamos gamo
mif miff mifa famille fami gros grosse ma gueule mon reuf mon gars gars gadji
la mama mamma mama papa daronne
faya fayah nwar noir rhey
ient ientch yeuv yeuz yeux zieuter zyeuter zieute zyeute bader badé bédave bedave marave maraver maravé chourave chourer chouraver poucave poucaver poucave balance balances crari crarri
bail bails bails dar daronne daronnes dar dare
saucisson cagoule cagoules kalash kalach kalashnikov kala glock glocks calibre calibres fusca fuscas pétard pétards gun guns
tah tahia hrague harraga harrag zehef zehma zahma zaama zarma
binks
flex flexer flexe flexé swag swaggé drip dripé shooter shooté shooter
ouais ouai ouaiss nan nann bah ben beh hein heu euh hmm hum mmh ah oh eh yo yeah yeh ouh ouhh hé han
skrr skrt skrrt brr brrr pah pa-pa paw prr rrah rrrah woo wouh wouhou oula olala ohlala oh-la-la
jul juju julito l'ovni ovni ovnis d'or platine dp dpdp
marseille marseillais marseillaise marseillaises massilia mars la plaine noailles
cagole cagoles cagolette fada fadas fadoli dégun degun dégun peuchère peuchere pitchoun pitchoune pitchounes pitchouns minot minots minotte minottes estrasse estrasses
chourmo boucan boucanier fangoule fangouler gari garis tarpin tarpinbien mia mias moco mocos tchatcher tchatche tchatcheur tchatcheurs tchatchent
emboucaner emboucané escagasser escagassé engatser engatsé engatse gatse gâtse gâtsé
une dinguerie dinguerie dingueries dinguo dingo dingos
bigo bigos binious viens on s'arrache arrache bigo
zap zapper zappé tise tiser tisé pillave pillaver
bléca bléc blé
yatta yatte yaou yaouh
gadjo gadji gadjis
sapé sapes saper sapée sapés fringues fringué fringuée
nike nikes air max tn tns requin requins
bleh bluh bloh
aplus aplu askip askip jpp mdr ptdr tkt tqt jsp jsuis chui chuis jsais jveux jvais jfais jdis jpeux jpense jcrois jpense jte jme jles
y'a ya yavait y'avait y'en yen t'es t'as t'étais t'inquiète t'inquiètes j'suis j'sais j'veux j'vais j'fais j'dis j'peux j'te j'me j'les j'leur j'ai j'avais j'm'en j't'aime
c'est c'était c'qu'il c'que c'qui qu'est-ce qu'j'ai qu'tu qu'on
`;
const norm=w=>w.toLowerCase().normalize('NFC').replace(/[’']/g,"'").replace(/^['-]+|['-]+$/g,'');
const tokens=t=>(String(t||'').match(/[\p{L}\p{M}'’-]+/gu)||[]).map(norm).filter(Boolean);
let lexicon=null;
function personalKey(){return 'au-lexique-perso-24';}
function personal(){try{return new Set(JSON.parse(localStorage.getItem(personalKey())||'[]'));}catch{return new Set();}}
function keepWord(word){const set=personal();set.add(norm(word));try{localStorage.setItem(personalKey(),JSON.stringify([...set].slice(-2000)));}catch{}lexicon?.add(norm(word));}
function buildLexicon(){
 const set=new Set(tokens(BASE));
 try{for(const v of (typeof COLLECTION!=='undefined'?COLLECTION:[]))for(const t of (v.tracks||[])){for(const w of tokens(t.lyrics))set.add(w);for(const w of tokens(t.title))set.add(w);}}catch{}
 for(const w of personal())set.add(w);
 return set;
}
function known(word){if(!lexicon)lexicon=buildLexicon();const w=norm(word);if(lexicon.has(w))return true;
 // Elided forms (j'te, t'as, qu'on…) and hyphenated words are checked part by part.
 const parts=w.split(/['-]/).filter(Boolean);return parts.length>1&&parts.every(p=>p.length<2||lexicon.has(p));}

/* ---------- Spelling check (LanguageTool public API) ---------- */
const LT='https://api.languagetool.org/v2/check';
async function check(text){
 if(text.length>20000)throw Error('Le texte dépasse 20 000 caractères : vérifie-le en plusieurs fois.');
 const body=new URLSearchParams({text,language:'fr',level:'default'});
 let response;try{response=await fetch(LT,{method:'POST',body,signal:AbortSignal.timeout(20000)});}catch{throw Error('Le vérificateur d’orthographe est injoignable. Vérifie ta connexion puis réessaie.');}
 if(response.status===429)throw Error('Trop de vérifications d’un coup. Patiente une minute puis réessaie.');
 if(!response.ok)throw Error('Le vérificateur d’orthographe est momentanément indisponible.');
 const data=await response.json();
 return (data.matches||[]).filter(m=>m.rule?.issueType==='misspelling'||m.rule?.category?.id==='TYPOS').map(m=>({offset:m.offset,length:m.length,word:text.slice(m.offset,m.offset+m.length),suggestions:(m.replacements||[]).slice(0,4).map(r=>r.value),context:m.context})).filter(m=>m.word.trim()&&!known(m.word)&&m.suggestions.length);
}

/* ---------- Writer ---------- */
function mount({host,textarea,audio,ensureTrack,isCurrent}){
 const restoreRate=audio.playbackRate||1,restorePitch=audio.preservesPitch;
 try{audio.preservesPitch=true;}catch{}
 const player=E('section',null,'au24-writer-player');player.setAttribute('aria-label','Lecteur du morceau');
 const play=E('button','▶','au24-wp-play');play.type='button';play.setAttribute('aria-label','Lecture');
 const seek=E('input',null,'au24-wp-seek');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.setAttribute('aria-label','Position dans le morceau');
 const time=E('span','0:00 / 0:00','au24-wp-time');time.setAttribute('aria-live','off');
 const jumps=E('div',null,'au24-wp-jumps');
 for(const s of [-30,-10,-3,3,10,30]){const b=E('button',(s>0?'+':'−')+Math.abs(s)+' s','au24-wp-jump');b.type='button';b.setAttribute('aria-label',(s>0?'Avancer':'Reculer')+' de '+Math.abs(s)+' secondes');b.onclick=()=>move(s);jumps.append(b);}
 const speed=E('select',null,'au24-wp-speed');speed.setAttribute('aria-label','Vitesse de lecture');
 for(const r of RATES){const o=E('option','×'+String(r).replace('.',','));o.value=String(r);speed.append(o);}speed.value='1';
 const top=E('div',null,'au24-wp-row');top.append(play,seek,time);
 const bottom=E('div',null,'au24-wp-row au24-wp-tools');bottom.append(jumps,speed);
 player.append(top,bottom);
 const note=E('p',null,'au-note au24-wp-note');note.setAttribute('role','status');player.append(note);
 // Buttons must not steal the caret from the text: keep focus in the textarea.
 player.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
 (textarea.closest('label')||textarea).before(player);

 let seeking=false,frame=0,disposed=false;
 const ready=async()=>{if(!isCurrent()){await ensureTrack();}};
 async function toggle(){note.textContent='';try{if(audio.paused){await ready();await audio.play();}else audio.pause();}catch{note.textContent='Touche encore le bouton lecture pour autoriser le son.';}paint();}
 async function move(delta){note.textContent='';try{await ready();}catch{}const d=audio.duration;if(!Number.isFinite(d))return;audio.currentTime=Math.max(0,Math.min(d-.05,audio.currentTime+delta));paint();}
 function paint(){if(disposed)return;const d=audio.duration,t=audio.currentTime;const own=isCurrent();play.textContent=own&&!audio.paused?'❚❚':'▶';play.setAttribute('aria-label',own&&!audio.paused?'Pause':'Lecture');if(!seeking&&Number.isFinite(d)&&d>0&&own)seek.value=String(Math.round(t/d*1000));time.textContent=own?fmt(t)+' / '+fmt(d):'0:00 / '+(Number.isFinite(d)&&own?fmt(d):'—');}
 function loop(){paint();if(!audio.paused&&!disposed)frame=requestAnimationFrame(loop);}
 const wake=()=>{cancelAnimationFrame(frame);loop();};
 for(const ev of ['play','pause','loadedmetadata','seeked','ratechange','ended'])audio.addEventListener(ev,wake);
 play.onclick=toggle;
 seek.addEventListener('pointerdown',()=>{seeking=true;});
 seek.addEventListener('input',()=>{seeking=true;const d=audio.duration;if(Number.isFinite(d))time.textContent=fmt(seek.value/1000*d)+' / '+fmt(d);});
 seek.addEventListener('change',async()=>{try{await ready();}catch{}const d=audio.duration;if(Number.isFinite(d))audio.currentTime=seek.value/1000*d;seeking=false;paint();});
 speed.onchange=()=>{audio.playbackRate=Number(speed.value)||1;};
 // Keyboard shortcuts while writing, only with Alt so typing is never hijacked.
 const keys=e=>{if(!e.altKey||e.ctrlKey||e.metaKey)return;const map={k:()=>toggle(),j:()=>move(-3),l:()=>move(3),ArrowLeft:()=>move(-10),ArrowRight:()=>move(10)};const fn=map[e.key];if(fn){e.preventDefault();fn();}};
 textarea.addEventListener('keydown',keys);
 // Mobile keyboard: keep the player visible above the keyboard and away from the text.
 const vv=window.visualViewport;const fit=()=>{if(!vv)return;const covered=Math.max(0,innerHeight-vv.height-vv.offsetTop);player.style.setProperty('--au24-kb',covered+'px');player.classList.toggle('au24-wp-keyboard',covered>120);};
 vv?.addEventListener('resize',fit);vv?.addEventListener('scroll',fit);fit();paint();

 /* spelling */
 const spell=E('div',null,'au24-spell');const spellButton=E('button','Vérifier l’orthographe','button secondary');spellButton.type='button';
 const results=E('div',null,'au24-spell-results');results.setAttribute('aria-live','polite');spell.append(spellButton,results);
 textarea.closest('label')?.after(spell)||textarea.after(spell);
 let matches=[];
 function apply(m,value){const t=textarea.value;if(t.slice(m.offset,m.offset+m.length)!==m.word){m.stale=true;return false;}textarea.value=t.slice(0,m.offset)+value+t.slice(m.offset+m.length);const delta=value.length-m.length;for(const o of matches)if(o!==m&&o.offset>m.offset)o.offset+=delta;textarea.dispatchEvent(new Event('input',{bubbles:true}));return true;}
 function render(){results.replaceChildren();const open=matches.filter(m=>!m.done);
  if(!open.length){results.append(E('p',matches.length?'Toutes les propositions ont été traitées.':'Aucune faute détectée. Les mots d’argot, de verlan et les paroles déjà publiées ne sont jamais signalés.','au-note'));return;}
  const head=E('div',null,'au24-spell-head');head.append(E('p',open.length+' mot'+(open.length>1?'s':'')+' à vérifier. Rien n’est corrigé sans ton accord.','au-note'));
  const all=E('button','Tout accepter','button secondary');all.type='button';all.onclick=()=>{for(const m of [...open].sort((a,b)=>b.offset-a.offset)){if(apply(m,m.choice??m.suggestions[0]))m.done='accepted';}render();};head.append(all);results.append(head);
  const list=E('ul',null,'au24-spell-list');
  for(const m of open){const li=E('li',null,'au24-spell-item'+(m.stale?' au24-stale':''));
   const word=E('p',null,'au24-spell-word');word.append(E('del',m.word),document.createTextNode(' → '));
   const choices=E('span',null,'au24-spell-choices');m.choice??=m.suggestions[0];
   for(const s of m.suggestions){const c=E('button',s,'chip');c.type='button';c.setAttribute('aria-pressed',String(m.choice===s));c.onclick=()=>{m.choice=s;render();};choices.append(c);}
   word.append(choices);
   const ctx=E('p',null,'au24-spell-context');const c=m.context;if(c){ctx.append(document.createTextNode(c.text.slice(0,c.offset)),E('mark',c.text.slice(c.offset,c.offset+c.length)),document.createTextNode(c.text.slice(c.offset+c.length)));}
   const act=E('div',null,'au24-spell-actions');
   const yes=E('button','Accepter','button');yes.type='button';yes.onclick=()=>{if(apply(m,m.choice))m.done='accepted';else m.stale=true;render();};
   const no=E('button','Refuser','button secondary');no.type='button';no.onclick=()=>{m.done='refused';render();};
   const keep=E('button','Toujours garder « '+m.word+' »','button secondary');keep.type='button';keep.onclick=()=>{keepWord(m.word);for(const o of matches)if(norm(o.word)===norm(m.word))o.done='kept';render();};
   act.append(yes,no,keep);if(m.stale)li.append(E('p','Le texte a changé ici : relance la vérification.','au-note'));
   li.append(word,ctx,act);list.append(li);}
  results.append(list);}
 spellButton.onclick=async()=>{const text=textarea.value;if(!text.trim()){results.replaceChildren(E('p','Écris d’abord quelques lignes.','au-note'));return;}spellButton.disabled=true;results.replaceChildren(E('p','Vérification en cours…','au-note'));try{lexicon=buildLexicon();matches=await check(text);render();}catch(e){results.replaceChildren(E('p',e.message,'au-note'));}finally{spellButton.disabled=false;}};
 textarea.addEventListener('input',()=>{for(const m of matches)if(!m.done&&textarea.value.slice(m.offset,m.offset+m.length)!==m.word)m.stale=true;});

 return {dispose(){disposed=true;cancelAnimationFrame(frame);for(const ev of ['play','pause','loadedmetadata','seeked','ratechange','ended'])audio.removeEventListener(ev,wake);textarea.removeEventListener('keydown',keys);vv?.removeEventListener('resize',fit);vv?.removeEventListener('scroll',fit);if(isCurrent())audio.playbackRate=restoreRate;try{audio.preservesPitch=restorePitch;}catch{}player.remove();spell.remove();}};
}

/* ---------- Thank-you panel ---------- */
function thanks({title,onSync}){
 const d=E('dialog',null,'au-dialog au24-thanks');d.setAttribute('aria-labelledby','au24-thanks-title');
 const h=E('h2','Merci pour ta contribution !');h.id='au24-thanks-title';
 const p=E('p','Les paroles de « '+title+' » sont envoyées. Le créateur les vérifie avant publication.');
 const p2=E('p','Tu veux aller plus loin ? Synchronise-les maintenant dans l’Atelier : c’est facultatif, et ta synchronisation sera vérifiée en même temps que les paroles.','au-note');
 const row=E('div',null,'actions au24-thanks-actions');const go=E('button','Synchroniser maintenant','button');go.type='button';const later=E('button','Plus tard','button secondary');later.type='button';row.append(go,later);
 d.append(E('div','✦','au24-thanks-mark'),h,p,p2,row);document.body.append(d);
 later.onclick=()=>d.close();go.onclick=async()=>{d.close();try{await onSync();}catch(e){window.AU_TOAST?.(e.message);}};
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();go.focus();return d;
}

window.AU_LYRICS_WRITER_24={mount,thanks,check,known,keepWord};
})();
