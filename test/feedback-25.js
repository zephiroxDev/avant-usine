/* Avant l'usine — version de test 25.1 : outil « Remarque ».
   Toucher un élément, écrire ce qui ne va pas. Les remarques restent sur cet
   appareil (localStorage) ; « Tout copier » produit un texte à coller à Claude. */
(()=>{
 const KEY='au-test-remarques-251';
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return [];}};
 const save=list=>{try{localStorage.setItem(KEY,JSON.stringify(list));}catch{}};
 const css=`
 .au-fb-root{all:initial;font-family:'AU Text',-apple-system,system-ui,sans-serif}
 .au-fb-fab{position:fixed;z-index:2147483600;right:14px;bottom:calc(150px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;align-items:flex-end}
 .au-fb-btn{appearance:none;border:0;border-radius:8px;min-height:46px;padding:0 16px;font:700 15px/1 'AU Text',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px -10px #000}
 .au-fb-main{background:#ff5a36;color:#fff}
 .au-fb-list{background:#1e1a16;color:#f3eadb;border:1px solid #f3eadb33}
 .au-fb-banner{position:fixed;z-index:2147483601;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));background:#ff5a36;color:#fff;border-radius:8px;padding:12px 14px;font:600 14px/1.35 system-ui,sans-serif;display:flex;gap:10px;align-items:center;justify-content:space-between}
 .au-fb-banner button{background:#fff;color:#c2410c;border:0;border-radius:6px;min-height:40px;padding:0 14px;font-weight:700}
 .au-fb-hl{outline:3px solid #ff5a36!important;outline-offset:2px!important;background-color:#ff5a3622!important}
 .au-fb-sheet{position:fixed;z-index:2147483602;left:0;right:0;bottom:0;max-height:86vh;overflow:auto;background:#171411;color:#f3eadb;border-top:3px solid #ffb347;border-radius:12px 12px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px #000c}
 .au-fb-sheet h3{margin:0 0 10px;font:700 20px/1.1 'AU Display',system-ui,sans-serif;text-transform:uppercase;letter-spacing:.02em}
 .au-fb-sheet p{margin:0 0 10px;color:#a59a88;font-size:13px;line-height:1.4}
 .au-fb-sheet textarea{width:100%;min-height:110px;box-sizing:border-box;border-radius:6px;border:1px solid #f3eadb33;background:#0e0c0a;color:#f3eadb;padding:12px;font:16px/1.4 system-ui,sans-serif}
 .au-fb-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
 .au-fb-row button{flex:1 1 auto}
 .au-fb-ok{background:#ffb347;color:#120e0a}
 .au-fb-ghost{background:transparent;color:#f3eadb;border:1px solid #f3eadb33!important}
 .au-fb-item{border-top:1px solid #f3eadb1f;padding:10px 0;font-size:14px;line-height:1.4}
 .au-fb-item small{display:block;color:#a59a88;font-size:12px;margin-top:4px;word-break:break-word}
 .au-fb-item button{margin-top:6px;min-height:36px;background:transparent;color:#ff8f6b;border:1px solid #ff8f6b55;border-radius:6px;padding:0 10px}
 `;
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 const root=document.createElement('div');root.className='au-fb-root';document.body.append(root);
 const fab=document.createElement('div');fab.className='au-fb-fab';
 const main=document.createElement('button');main.className='au-fb-btn au-fb-main';main.type='button';
 const list=document.createElement('button');list.className='au-fb-btn au-fb-list';list.type='button';
 fab.append(list,main);root.append(fab);
 const refresh=()=>{const n=load().length;main.textContent='✎ Remarque';list.textContent='Mes remarques ('+n+')';list.hidden=!n;};
 refresh();
 const pageName=()=>{const cur=document.querySelector('.au222-subnav-button[aria-current=page],.au222-subnav-button[aria-selected=true],.au222-subnav-button.active');const top=[...document.querySelectorAll('dialog[open]')].at(-1);const h=(top||document).querySelector('h1,h2');return [cur?.textContent.trim(),top?(top.querySelector('h2')?.textContent.trim()||'fenêtre'):null,h?.textContent.trim()].filter(Boolean).join(' › ').slice(0,190);};
 const describe=el=>{const parts=[];let e=el;for(let i=0;e&&i<5&&e!==document.body;i++,e=e.parentElement){let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(typeof e.className==='string'&&e.className.trim())s+='.'+e.className.trim().split(/\s+/).slice(0,2).join('.');parts.unshift(s);}return parts.join(' > ').slice(0,590);};
 const textOf=el=>(el.getAttribute?.('aria-label')||el.innerText||el.value||el.alt||'').replace(/\s+/g,' ').trim().slice(0,200);
 let picking=false,banner=null,hl=null;
 const clearHl=()=>{hl?.classList.remove('au-fb-hl');hl=null;};
 const stopPick=()=>{picking=false;banner?.remove();banner=null;clearHl();document.removeEventListener('click',onPick,true);document.removeEventListener('pointerover',onOver,true);fab.hidden=false;};
 const onOver=e=>{if(root.contains(e.target))return;clearHl();hl=e.target;hl.classList.add('au-fb-hl');};
 const onPick=e=>{if(root.contains(e.target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const el=e.target;stopPick();sheet(el);};
 const startPick=()=>{picking=true;fab.hidden=true;banner=document.createElement('div');banner.className='au-fb-banner';banner.innerHTML='<span>Touche l’élément qui ne va pas.</span>';const c=document.createElement('button');c.type='button';c.textContent='Annuler';c.onclick=ev=>{ev.stopPropagation();stopPick();};banner.append(c);root.append(banner);document.addEventListener('click',onPick,true);document.addEventListener('pointerover',onOver,true);};
 const close=()=>root.querySelector('.au-fb-sheet')?.remove();
 const sheet=(el)=>{close();const s=document.createElement('div');s.className='au-fb-sheet';s.setAttribute('role','dialog');
  const what=el?textOf(el):'';s.innerHTML='<h3>Ta remarque</h3>';
  const p=document.createElement('p');p.textContent=el?('Élément : '+(what?('« '+what.slice(0,80)+' »'):describe(el).split(' > ').pop())+' · Page : '+pageName()):'Remarque générale · Page : '+pageName();s.append(p);
  const ta=document.createElement('textarea');ta.placeholder='Ex. : à enlever, bouton trop serré, ne réagit pas, texte coupé…';s.append(ta);
  const row=document.createElement('div');row.className='au-fb-row';
  const ok=document.createElement('button');ok.className='au-fb-btn au-fb-ok';ok.type='button';ok.textContent='Enregistrer';
  const gen=document.createElement('button');gen.className='au-fb-btn au-fb-ghost';gen.type='button';gen.textContent=el?'Remarque générale':'Toucher un élément';
  const no=document.createElement('button');no.className='au-fb-btn au-fb-ghost';no.type='button';no.textContent='Annuler';
  ok.onclick=()=>{const note=ta.value.trim();if(!note){ta.focus();ta.placeholder='Écris ta remarque avant d’enregistrer.';return;}const l=load();l.push({n:l.length+1,note,page:pageName(),el:what,path:el?describe(el):'',vp:innerWidth+'×'+innerHeight,at:new Date().toLocaleString('fr-FR')});save(l);close();refresh();toast('Remarque n°'+l.length+' enregistrée');};
  gen.onclick=()=>{close();if(el)sheet(null);else startPick();};no.onclick=close;
  row.append(ok,gen,no);s.append(row);root.append(s);setTimeout(()=>ta.focus(),50);};
 const toast=t=>{const d=document.createElement('div');d.className='au-fb-banner';d.style.background='#1e1a16';d.style.border='1px solid #ffb347';d.textContent=t;root.append(d);setTimeout(()=>d.remove(),1800);};
 const exportText=()=>{const l=load();return 'Remarques version de test 25.1 ('+l.length+')\n\n'+l.map(r=>r.n+'. '+r.note+'\n   Page : '+r.page+(r.el?'\n   Élément : '+r.el:'')+(r.path?'\n   Repère : '+r.path:'')+'\n   Écran : '+r.vp+' · '+r.at).join('\n\n');};
 const showList=()=>{close();const s=document.createElement('div');s.className='au-fb-sheet';s.innerHTML='<h3>Mes remarques</h3><p>Quand tu as fini : « Tout copier », puis colle le texte dans la conversation avec Claude.</p>';
  const row=document.createElement('div');row.className='au-fb-row';
  const cp=document.createElement('button');cp.className='au-fb-btn au-fb-ok';cp.type='button';cp.textContent='Tout copier';
  const x=document.createElement('button');x.className='au-fb-btn au-fb-ghost';x.type='button';x.textContent='Fermer';x.onclick=close;
  cp.onclick=async()=>{const t=exportText();try{await navigator.clipboard.writeText(t);cp.textContent='Copié ✓';}catch{const ta=document.createElement('textarea');ta.value=t;ta.style.minHeight='200px';s.append(ta);ta.focus();ta.select();cp.textContent='Sélectionne et copie le texte ci-dessous';}};
  row.append(cp,x);s.append(row);
  load().forEach((r,i)=>{const it=document.createElement('div');it.className='au-fb-item';it.textContent=r.n+'. '+r.note;const sm=document.createElement('small');sm.textContent=r.page+(r.el?' · « '+r.el.slice(0,60)+' »':'');it.append(sm);const del=document.createElement('button');del.type='button';del.textContent='Supprimer';del.onclick=()=>{const l=load();l.splice(i,1);l.forEach((q,k)=>q.n=k+1);save(l);refresh();showList();};it.append(del);s.append(it);});
  root.append(s);};
 main.onclick=startPick;list.onclick=showList;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picking)stopPick();},true);
})();
