window.updates.state(state=>{
 document.getElementById('version').textContent=`Version ${state.version} · Ta version : ${state.current}`;
 document.getElementById('skip').textContent=`Ignorer la version ${state.version}`;document.getElementById('skip').title="La version suivante te sera proposée.";
 document.getElementById('status').textContent=state.message||'Tes paramètres et tes données seront conservés.';
 const progress=document.getElementById('progress');progress.hidden=!state.busy;progress.value=state.percent||0;
 document.querySelectorAll('button').forEach(b=>b.disabled=!!state.busy);
});
document.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>window.updates.choose(button.dataset.choice)));
