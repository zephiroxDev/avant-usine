(()=>{'use strict';
document.documentElement.dataset.platform='ios';
const plugins=window.Capacitor?.Plugins||{},native=plugins.IOSUpdates,files=plugins.Filesystem,share=plugins.Share;
const current='__IOS_VERSION__',prefix='au-ios-',day=86400000;
const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;};
const choose=(releases,version,skip)=>releases.filter(r=>!r.draft).flatMap(r=>(r.assets||[]).map(a=>({a,match:a.name.match(/^Avant-Usine-iOS-(\d+\.\d+\.\d+)-non-signe\.ipa$/)}))).filter(x=>x.match&&compare(x.match[1],version)>0).sort((a,b)=>compare(b.match[1],a.match[1]))[0];
const notify=text=>{const n=document.createElement('div');n.className='au-ios-status';n.setAttribute('role','status');n.textContent=text;document.body.append(n);setTimeout(()=>n.remove(),7000);};
// Exports are copied to cache and shared through iOS. User source files are never removed.
document.addEventListener('click',async event=>{
 const a=event.target.closest?.('a[download]');if(!a||!files||!share||!a.href.startsWith('blob:'))return;
 event.preventDefault();event.stopImmediatePropagation();
 let path;try{
  const response=await fetch(a.href);const blob=await response.blob();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  path='export-'+Date.now()+'-'+(a.download||'export.zip').replace(/[^a-zA-Z0-9._-]/g,'_');
  const result=await files.writeFile({path,directory:'CACHE',data});
  await share.share({title:a.download||'Export Avant l’usine',files:[result.uri]});
 }catch(error){notify('Export : '+(error.message||error));}
 finally{if(path)await files.deleteFile({path,directory:'CACHE'}).catch(()=>{});}
},true);
let checking=false,offered=false,lastCheck=0,reportedFailure=false;window.AU_UPDATE_DIAGNOSTIC?.configure({platform:'ios',current,search:()=>check(true,true)});
async function check(force=false,diagnose=false){
 if(!native){const error='Le service de mise à jour iOS est absent de cette installation. Télécharge puis signe la dernière IPA depuis le site pour réparer cette installation.';window.AU_UPDATE_DIAGNOSTIC?.record({error});if(force)notify(error);return;}
 if(checking||offered||(!force&&(Date.now()<Number(localStorage.getItem(prefix+'remind')||0)||Date.now()-lastCheck<60000)))return;
 checking=true;try{
  let releases;
  if(typeof native.checkReleases==='function')releases=JSON.parse((await native.checkReleases()).json);
  else{
   const response=await fetch('https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100',{cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw Error('Vérification des mises à jour indisponible (HTTP '+response.status+').');
   releases=await response.json();
  }
  if(!Array.isArray(releases))throw Error('Réponse de mise à jour invalide.');
  lastCheck=Date.now();reportedFailure=false;
  const latest=choose(releases,current);window.AU_UPDATE_DIAGNOSTIC?.record({latest:latest?.match[1]||current,error:null,state:latest?'Nouvelle version disponible.':'Application à jour.'});if(diagnose)return;
  if(!latest){if(force)notify('L’application iOS est à jour.');return;}
  const version=latest.match[1];
  if(!force&&localStorage.getItem(prefix+'skip')===version){if(force)notify('La version '+version+' est ignorée. La suivante sera proposée.');return;}
  const sha=latest.a.digest?.replace(/^sha256:/,'');
  if(!/^[a-f0-9]{64}$/i.test(sha||'')||!Number.isSafeInteger(latest.a.size)||latest.a.size<=0)throw Error('Le paquet ne dispose pas des informations de vérification nécessaires.');
  offered=true;
  const modal=document.createElement('dialog');modal.className='au-ios-update';
  const heading=document.createElement('h2');heading.textContent='Mise à jour iOS '+version;
  const text=document.createElement('p');text.textContent='Télécharge le nouvel IPA, puis signe-le dans l’outil de ton choix avec un certificat et un profil valides avant de l’installer. Garde le même identifiant et une signature compatible pour conserver tes données.';
  modal.append(heading,text);
  const button=(label,action)=>{const b=document.createElement('button');b.className='button';b.textContent=label;b.onclick=action;modal.append(b);return b;};
  const close=()=>{modal.close();modal.remove();offered=false;};
  const later=button('Plus tard',()=>{localStorage.setItem(prefix+'remind',String(Date.now()+day));close();});
  const skip=button('Sauter la version '+version+' et me le rappeler lors de la version qui sera déployée après la '+version,()=>{localStorage.setItem(prefix+'skip',version);close();});
  const download=button('Télécharger la mise à jour',async()=>{
   download.disabled=true;later.disabled=true;skip.disabled=true;
   const progress=document.createElement('progress');progress.max=100;modal.append(progress);
   let listener;
   try{
    listener=await native.addListener('progress',p=>{if(p.total>0){progress.value=p.bytes/p.total*100;text.textContent='Téléchargement : '+Math.round(progress.value)+' %';}else{progress.removeAttribute('value');text.textContent='Téléchargement : '+Math.round(p.bytes/1048576)+' Mo';}});
    const result=await native.download({url:latest.a.browser_download_url,sha256:sha,size:latest.a.size,name:latest.a.name});
    text.textContent='IPA téléchargé et vérifié. Appuie sur « Ouvrir dans un outil de signature », puis sélectionne ton outil de signature si iOS propose plusieurs applications.';
    download.remove();
    button('Ouvrir dans un outil de signature',async()=>{try{const opened=await native.openIn({uri:result.uri});if(!opened.opened)text.textContent='Ouverture annulée. Tu peux réessayer avec « Ouvrir dans un outil de signature ».';}catch(error){text.textContent='Ouverture impossible : '+(error.message||error)+'. Ouvre ton outil de signature et importe le fichier depuis Fichiers > Avant l’usine > MisesAJour.';}});
   }catch(error){text.textContent='Téléchargement interrompu : '+(error.message||error)+'. L’installation actuelle est conservée.';download.disabled=false;}
   finally{await listener?.remove();progress.remove();later.disabled=false;skip.disabled=false;}
  });
  modal.addEventListener('cancel',e=>{if(download.disabled){e.preventDefault();return;}localStorage.setItem(prefix+'remind',String(Date.now()+day));});
  modal.addEventListener('close',()=>{offered=false;modal.remove();});
  document.body.append(modal);modal.showModal();
 }catch(error){window.AU_UPDATE_DIAGNOSTIC?.record({error:error.message||String(error)});lastCheck=Date.now();if(force||!reportedFailure)notify((error.message||String(error))+' Réessaie depuis Compte → Forcer une mise à jour.');reportedFailure=true;}finally{checking=false;}
}
const b=document.createElement('button');b.className='text-button';b.textContent='Vérifier les mises à jour iOS';b.onclick=()=>check(true);document.querySelector('.footer')?.append(b);
setTimeout(()=>check(),10000);setInterval(()=>check(),6*60*60*1000);window.addEventListener('focus',()=>check());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
native?.addListener('resume',()=>check()).catch(()=>{});
const applyAccessibility=value=>{document.documentElement.dataset.reduceTransparency=String(!!value.reduceTransparency);document.documentElement.dataset.increaseContrast=String(!!value.increaseContrast);};
if(typeof native?.accessibility==='function')native.accessibility().then(applyAccessibility).catch(()=>{});
native?.addListener('accessibility',applyAccessibility).catch(()=>{});
if(window.AU_IOS_TEST)window.AU_IOS_TEST.exports={compare,choose,check,current};
const accountUpdate=document.createElement('button');accountUpdate.type='button';accountUpdate.className='button secondary';accountUpdate.id='forceAppUpdate';accountUpdate.textContent='Forcer une mise à jour';accountUpdate.onclick=async()=>{accountUpdate.disabled=true;document.querySelector('#accountDialog')?.close();try{await check(true);}finally{accountUpdate.disabled=false;}};document.querySelector('#accountMember .actions')?.append(accountUpdate);

})();
