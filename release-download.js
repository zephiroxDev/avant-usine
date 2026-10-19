(()=>{
 const api='https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100';
 const releasesPage='https://github.com/zephiroxDev/avant-usine/releases';
 function compare(a,b){const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v),x=parse(a),y=parse(b);if(!x||!y)return null;for(let i=1;i<=3;i++){const d=Number(x[i])-Number(y[i]);if(d)return Math.sign(d);}return 0;}
 function latest(rows){if(!Array.isArray(rows))return null;for(const release of rows.filter(r=>!r.draft&&compare(r.tag_name,'0.0.0')!==null).sort((a,b)=>compare(b.tag_name,a.tag_name))){const version=release.tag_name.replace(/^v/,''),name=`Avant-Usine-Installation-${version}.exe`,url=`https://github.com/zephiroxDev/avant-usine/releases/download/${release.tag_name}/${name}`,file=release.assets?.find(a=>a.name===name&&a.state==='uploaded'&&a.browser_download_url===url);if(file)return {version,url,details:`${releasesPage}/tag/${release.tag_name}`};}return null;}

 function latestMobile(rows,platform){
  if(!Array.isArray(rows)||!['android','ios'].includes(platform))return null;
  const pattern=platform==='android'?/^Avant-Usine-Android-(\d+\.\d+\.\d+)\.apk$/:/^Avant-Usine-iOS-(\d+\.\d+\.\d+)-non-signe\.ipa$/;
  const candidates=rows.filter(r=>!r.draft).flatMap(r=>(r.assets||[]).map(a=>({a,r,m:pattern.exec(a.name)}))).filter(x=>x.m&&x.a.state==='uploaded').sort((a,b)=>compare(b.m[1],a.m[1]));
  for(const item of candidates){try{const url=new URL(item.a.browser_download_url);if(url.protocol==='https:'&&url.host==='github.com'&&url.pathname.startsWith('/zephiroxDev/avant-usine/releases/download/'))return {version:item.m[1],url:url.href,details:releasesPage+'/tag/'+encodeURIComponent(item.r.tag_name)};}catch{}}
  return null;
 }

 function latestPS4(rows){
  if(!Array.isArray(rows))return null;
  const candidates=rows.filter(r=>!r.draft).map(r=>({r,m:/^ps4-v(\d+\.\d+\.\d+)(?:-test(\d+))?$/.exec(r.tag_name)})).filter(x=>x.m).sort((a,b)=>compare(b.m[1],a.m[1])||((b.m[2]?Number(b.m[2]):Number.MAX_SAFE_INTEGER)-(a.m[2]?Number(a.m[2]):Number.MAX_SAFE_INTEGER)));
  for(const {r,m} of candidates){const version=r.tag_name.slice(5),name='Avant-Usine-PS4-'+version+'.pkg',expected='https://github.com/zephiroxDev/avant-usine/releases/download/'+r.tag_name+'/'+name;
   const file=r.assets?.find(a=>a.name===name&&a.state==='uploaded'&&a.browser_download_url===expected);
   if(file)return {version,url:expected,details:releasesPage+'/tag/'+encodeURIComponent(r.tag_name),experimental:!!m[2]};
  }return null;
 }
 if(typeof module!=='undefined')module.exports={latest,latestMobile,latestPS4,compare};
 if(typeof document==='undefined')return;
 const button=document.getElementById('desktopDownload'),details=document.getElementById('desktopDownloadVersion');if(!button)return;

 let current=null,inflight=null;const currentMobile={};
 async function refresh(){if(inflight)return inflight;inflight=(async()=>{
  const response=await fetch(api,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000),cache:'no-store'});if(!response.ok)throw Error('GitHub indisponible');
  const rows=await response.json(),item=latest(rows);
  if(item){current=item;button.href=item.url;if(details){details.href=item.details;details.textContent='Version '+item.version+' · Windows 64 bits · Portable ↗';}}
  for(const platform of ['android','ios']){const found=latestMobile(rows,platform),link=document.getElementById(platform+'Download'),label=document.getElementById(platform+'DownloadVersion');if(!found||!link)continue;currentMobile[platform]=found;link.href=found.url;if(label){label.href=found.details;label.textContent='Version '+found.version+' · '+(platform==='ios'?'IPA à signer':'APK')+' · Détails ↗';}}
  const consoleRelease=latestPS4(rows);
  if(consoleRelease){currentMobile.ps4=consoleRelease;let link=document.getElementById('ps4Download');
   if(!link){const panels=button.closest('.au-app-platforms');if(panels){const section=document.createElement('section');section.className='au-app-platform';section.setAttribute('aria-labelledby','ps4AppTitle');
    const title=document.createElement('h3');title.id='ps4AppTitle';title.textContent='PS4 · Prototype expérimental';
    const description=document.createElement('p');description.textContent='PKG natif sans navigateur : catalogue, lecture MP3 et import USB. Fonctions limitées ; essai sur console nécessaire. PS5 non validée.';
    link=document.createElement('a');link.id='ps4Download';link.className='button';link.textContent='Télécharger le prototype PS4';
    link.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(link.getAttribute('aria-busy')==='true')return;link.setAttribute('aria-busy','true');try{await refresh();location.assign(currentMobile.ps4?.url||releasesPage);}catch{location.assign(currentMobile.ps4?.url||releasesPage);}finally{link.removeAttribute('aria-busy');}});
    const more=document.createElement('a');more.id='ps4DownloadVersion';more.className='text-button';more.target='_blank';more.rel='noopener noreferrer';
    section.append(title,description,link,more);panels.append(section);}}
   if(link){link.href=consoleRelease.url;const label=document.getElementById('ps4DownloadVersion');if(label){label.href=consoleRelease.details;label.textContent='Version '+consoleRelease.version+' · Limites et commandes ↗';}}
  }
  return item;
 })().finally(()=>inflight=null);return inflight;}

 refresh().catch(()=>{});
 button.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(button.getAttribute('aria-busy')==='true')return;button.setAttribute('aria-busy','true');const label=button.textContent;button.textContent='Recherche de la dernière version…';try{const item=await refresh();location.assign(item.url);}catch{location.assign(current?.url||releasesPage);}finally{button.textContent=label;button.removeAttribute('aria-busy');}});
 for(const platform of ['android','ios']){const link=document.getElementById(platform+'Download');link?.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(link.getAttribute('aria-busy')==='true')return;link.setAttribute('aria-busy','true');const label=link.textContent;link.textContent='Recherche de la dernière version…';try{await refresh();location.assign(currentMobile[platform]?.url||releasesPage);}catch{location.assign(currentMobile[platform]?.url||releasesPage);}finally{link.textContent=label;link.removeAttribute('aria-busy');}});}

})();

