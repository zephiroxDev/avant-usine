/* 24.0 — Versions de test.
   Creator tab: only the 6-digit access code (never displayed back).
   Public: test builds are listed like public versions, marked « Version de test »,
   without notes. Downloading asks for the code, checked by the server; without
   the right code the only choice is Annuler. The file link is a 5-minute ticket
   minted after validation. */
(()=>{'use strict';
const FN='https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds';
const KEY='sb_publishable_hR4vWksXYg3TUofHVQMtLQ_q5JIHXdX';
let adapter=null,entry=null,creatorDialog=null,builds=[],loaded=null;
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const isCreator=()=>!!adapter?.getUser?.()&&adapter.isCreator?.()&&document.documentElement.dataset.accountRole==='creator';
const app=()=>document.documentElement.dataset.auApp||'web';
const label={ios:'iPhone et iPad',windows:'Windows',android:'Android'};
async function call(body,token){const r=await fetch(FN,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});let data=null;try{data=await r.json();}catch{}if(!r.ok)throw Error(typeof data?.error==='string'&&!/_/.test(data.error)?data.error:'Le service des versions de test est indisponible. Réessaie.');return data;}
async function session(){const c=adapter?.getClient?.();const {data}=await c.auth.getSession();return data?.session?.access_token;}

/* ---------- Creator: code only ---------- */
function openCreator(){
 if(!isCreator())return;
 if(!creatorDialog){
  creatorDialog=E('dialog',null,'au-dialog au24-beta-code');creatorDialog.dataset.auAccess='creator';creatorDialog.setAttribute('aria-labelledby','au24-code-title');
  const head=E('header',null,'au24-beta-head'),h=E('h2','Versions de test'),close=E('button','×','au-icon au24-rules-close');h.id='au24-code-title';close.type='button';close.setAttribute('aria-label','Fermer');close.onclick=()=>creatorDialog.close();head.append(h,close);
  const state=E('p','Chargement…','au-note au24-code-state');state.setAttribute('role','status');
  const form=E('form',null,'au24-code-form'),l=E('label','Code d’accès à 6 chiffres','major-field'),input=E('input');input.inputMode='numeric';input.autocomplete='off';input.pattern='[0-9]{6}';input.maxLength=6;input.required=true;input.placeholder='••••••';input.className='au24-code-input';l.append(input);
  const save=E('button','Enregistrer le code','button');save.type='submit';form.append(l,save);
  const help=E('p','Toute personne qui possède ce code peut télécharger les versions de test. Changer le code désactive immédiatement l’ancien. Pour ta sécurité, le code n’est jamais réaffiché.','au-note');
  form.onsubmit=async e=>{e.preventDefault();const code=input.value.trim();if(!/^[0-9]{6}$/.test(code)){state.textContent='Le code doit contenir exactement 6 chiffres.';return;}save.disabled=true;try{const r=await call({action:'set_code',code},await session());input.value='';state.textContent='Code enregistré le '+new Date(r.updated_at).toLocaleString('fr-FR')+'. L’ancien code ne fonctionne plus.';}catch(err){state.textContent=err.message;}finally{save.disabled=false;}};
  input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6);});
  creatorDialog.append(head,state,form,help);document.body.append(creatorDialog);creatorDialog._state=state;
 }
 document.getElementById('accountDialog')?.close();creatorDialog.showModal();
 const state=creatorDialog._state;state.textContent='Chargement…';
 session().then(t=>call({action:'code_status'},t)).then(r=>{state.textContent=r.configured?'Un code est actif depuis le '+new Date(r.updated_at).toLocaleString('fr-FR')+'.':'Aucun code défini : personne ne peut télécharger les versions de test.';}).catch(e=>{state.textContent=e.message;});
}

/* ---------- Public list ---------- */
function load(force=false){if(!loaded||force)loaded=call({action:'public_list'}).then(r=>{builds=Array.isArray(r?.builds)?r.builds:[];return builds;}).catch(()=>{builds=[];return builds;});return loaded;}
function card(b){
 const c=E('article',null,'au24-beta-card');
 const top=E('div',null,'au24-beta-top');top.append(E('span','Version de test','au24-beta-badge'),E('span',label[b.platform]||b.platform,'au24-beta-platform'));
 const h=E('h3',(label[b.platform]||b.platform)+' '+b.version);
 const meta=E('p','Build '+b.build_number+' · '+Math.max(1,Math.round(b.bytes/1048576))+' Mo · '+new Date(b.created_at).toLocaleDateString('fr-FR'),'au-note');
 const btn=E('button','Télécharger · code requis','button secondary');btn.type='button';const note=E('p',null,'au-note au24-beta-note');note.setAttribute('role','status');
 btn.onclick=()=>askCode(b,note,c);
 c.append(top,h,meta,btn,note);return c;
}
async function render(host){
 const list=await load();host.replaceChildren();if(!list.length){host.hidden=true;return;}host.hidden=false;
 const head=E('div',null,'au24-beta-section-head');head.append(E('h2','Versions de test'),E('p','Des versions en avant-première, avant leur sortie officielle. Leur contenu reste secret jusqu’à leur publication. Le téléchargement demande un code donné par le créateur.','au-note'));
 const grid=E('div',null,'au24-beta-grid');for(const b of list)grid.append(card(b));host.append(head,grid);
}
function mount(){
 for(const [anchor,where,id] of [[document.querySelector('#telechargements .faq'),'before','au24-beta-downloads'],[document.querySelector('#desktopAnnouncement .au-app-platforms'),'after','au24-beta-apps']]){
  if(!anchor||document.getElementById(id))continue;const host=E('section',null,'au24-beta-section');host.id=id;host.hidden=true;anchor[where](host);render(host);
 }
}

/* ---------- Code prompt ---------- */
function askCode(b,note,cardNode){
 const d=E('dialog',null,'au-dialog au24-code-ask');d.setAttribute('aria-labelledby','au24-ask-title');
 const h=E('h2','Code d’accès');h.id='au24-ask-title';
 const p=E('p','Cette version de test de '+(label[b.platform]||b.platform)+' '+b.version+' est protégée. Saisis le code à 6 chiffres donné par le créateur.','au-note');
 const form=E('form',null,'au24-ask-form'),input=E('input',null,'au24-code-input');input.inputMode='numeric';input.autocomplete='one-time-code';input.maxLength=6;input.pattern='[0-9]{6}';input.required=true;input.setAttribute('aria-label','Code à 6 chiffres');input.placeholder='••••••';
 const err=E('p',null,'au24-ask-error');err.setAttribute('role','alert');
 const row=E('div',null,'actions au24-ask-actions'),cancel=E('button','Annuler','button secondary'),ok=E('button','Valider','button');cancel.type='button';ok.type='submit';row.append(cancel,ok);
 form.append(input,err,row);d.append(h,p,form);document.body.append(d);
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,6);err.textContent='';});
 cancel.onclick=()=>d.close();d.addEventListener('close',()=>d.remove(),{once:true});
 form.onsubmit=async e=>{e.preventDefault();const code=input.value;if(!/^[0-9]{6}$/.test(code)){err.textContent='Le code contient 6 chiffres.';return;}ok.disabled=true;err.textContent='';
  try{const r=await call({action:'unlock',id:b.id,code});d.close();await download(b,r.url,note,cardNode);}
  catch(x){err.textContent=x.message;input.select();}finally{ok.disabled=false;}};
 d.showModal();input.focus();
}
const fileName=b=>'Avant-Usine-'+(b.platform==='ios'?'iOS':b.platform==='windows'?'Windows':b.platform)+'-'+b.version+'-test-'+b.build_number+'.'+(b.platform==='ios'?'ipa':'exe');
async function download(b,raw,note,cardNode){
 const url=new URL(raw);if(url.origin+url.pathname!==FN)throw Error('Lien de test invalide.');
 const native=window.Capacitor?.Plugins?.IOSUpdates;
 if(b.platform==='ios'&&native?.download){
  const listener=await native.addListener?.('progress',p=>{note.textContent='Téléchargement : '+Math.min(100,Math.round(p.bytes/b.bytes*100))+' %';});
  try{const file=await native.download({url:url.href,sha256:b.sha256,size:Number(b.bytes),name:fileName(b)});const open=E('button','Ouvrir dans mon outil de signature','button secondary');open.type='button';open.onclick=async()=>{try{await native.openIn({uri:file.uri});}catch{note.textContent='Ouverture impossible. Réessaie depuis le fichier téléchargé.';}};cardNode.append(open);note.textContent='Version de test téléchargée et vérifiée, rangée dans Mises à jour › Tests.';}
  catch(e){note.textContent=e.message||'Téléchargement interrompu.';}finally{await listener?.remove?.();}
  return;
 }
 note.textContent='Téléchargement en cours…';
 try{const response=await fetch(url.href,{cache:'no-store'});if(!response.ok)throw Error(response.status===403?'Ce lien a expiré : recommence avec le code.':'Téléchargement interrompu.');const bytes=await response.arrayBuffer();if(bytes.byteLength!==Number(b.bytes))throw Error('Fichier incomplet. Réessaie.');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');if(digest!==b.sha256)throw Error('Empreinte incorrecte : le fichier n’est pas proposé.');
  const a=E('a'),blob=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));a.href=blob;a.download=fileName(b);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(blob),60000);
  note.textContent=app()==='desktop'?'Téléchargée et vérifiée, rangée dans Avant l’usine › updates › tests.':'Téléchargée et vérifiée.';}
 catch(e){note.textContent=e.message;}
}

window.AU_BETA_20={configure(next){adapter=next;if(entry)return;entry=E('button','Versions de test','button au-admin-entry');entry.type='button';entry.dataset.auAccess='creator';entry.hidden=true;entry.onclick=openCreator;document.getElementById('accountMember')?.append(entry);const refresh=()=>{entry.hidden=!isCreator();if(!isCreator())creatorDialog?.close();};new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-creator','data-account-role']});window.addEventListener('au:role-changed',refresh);refresh();}};
window.AU_BETA_24={load,mount,openCreator};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
