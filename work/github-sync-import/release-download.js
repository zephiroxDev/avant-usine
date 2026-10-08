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

 if(typeof module!=='undefined')module.exports={latest,latestMobile,compare};
 if(typeof document==='undefined')return;
 const button=document.getElementById('desktopDownload'),details=document.getElementById('desktopDownloadVersion');if(!button)return;

 let current=null,inflight=null;const currentMobile={};
 async function refresh(){if(inflight)return inflight;inflight=(async()=>{
  const response=await fetch(api,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000),cache:'no-store'});if(!response.ok)throw Error('GitHub indisponible');
  const rows=await response.json(),item=latest(rows);
  if(item){current=item;button.href=item.url;if(details){details.href=item.details;details.textContent='Version '+item.version+' · Windows 64 bits · Portable ↗';}}
  for(const platform of ['android','ios']){const found=latestMobile(rows,platform),link=document.getElementById(platform+'Download'),label=document.getElementById(platform+'DownloadVersion');if(!found||!link)continue;currentMobile[platform]=found;link.href=found.url;if(label){label.href=found.details;label.textContent='Version '+found.version+' · '+(platform==='ios'?'IPA à signer':'APK')+' · Détails ↗';}}
  return item;
 })().finally(()=>inflight=null);return inflight;}

 refresh().catch(()=>{});
 button.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(button.getAttribute('aria-busy')==='true')return;button.setAttribute('aria-busy','true');const label=button.textContent;button.textContent='Recherche de la dernière version…';try{const item=await refresh();location.assign(item.url);}catch{location.assign(current?.url||releasesPage);}finally{button.textContent=label;button.removeAttribute('aria-busy');}});
 for(const platform of ['android','ios']){const link=document.getElementById(platform+'Download');link?.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(link.getAttribute('aria-busy')==='true')return;link.setAttribute('aria-busy','true');const label=link.textContent;link.textContent='Recherche de la dernière version…';try{await refresh();location.assign(currentMobile[platform]?.url||releasesPage);}catch{location.assign(currentMobile[platform]?.url||releasesPage);}finally{link.textContent=label;link.removeAttribute('aria-busy');}});}

})();
