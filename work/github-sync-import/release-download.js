(()=>{
 const api='https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100';
 const releasesPage='https://github.com/zephiroxDev/avant-usine/releases';
 function compare(a,b){const parse=v=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v),x=parse(a),y=parse(b);if(!x||!y)return null;for(let i=1;i<=3;i++){const d=Number(x[i])-Number(y[i]);if(d)return Math.sign(d);}return 0;}
 function latest(rows){if(!Array.isArray(rows))return null;for(const release of rows.filter(r=>!r.draft&&compare(r.tag_name,'0.0.0')!==null).sort((a,b)=>compare(b.tag_name,a.tag_name))){const version=release.tag_name.replace(/^v/,''),name=`Avant-Usine-Installation-${version}.exe`,url=`https://github.com/zephiroxDev/avant-usine/releases/download/${release.tag_name}/${name}`,file=release.assets?.find(a=>a.name===name&&a.state==='uploaded'&&a.browser_download_url===url);if(file)return {version,url,details:`${releasesPage}/tag/${release.tag_name}`};}return null;}
 if(typeof module!=='undefined')module.exports={latest,compare};
 if(typeof document==='undefined')return;
 const button=document.getElementById('desktopDownload'),details=document.getElementById('desktopDownloadVersion');if(!button)return;
 let current=null,inflight=null;
 async function refresh(){if(inflight)return inflight;inflight=(async()=>{const response=await fetch(api,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000),cache:'no-store'});if(!response.ok)throw Error('GitHub indisponible');const item=latest(await response.json());if(!item)throw Error('Aucun installateur disponible');current=item;button.href=item.url;if(details){details.href=item.details;details.textContent=`Version ${item.version} · Windows 64 bits · Détails et version portable ↗`;}return item;})().finally(()=>inflight=null);return inflight;}
 refresh().catch(()=>{});
 button.addEventListener('click',async event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();if(button.getAttribute('aria-busy')==='true')return;button.setAttribute('aria-busy','true');const label=button.textContent;button.textContent='Recherche de la dernière version…';try{const item=await refresh();location.assign(item.url);}catch{location.assign(current?.url||releasesPage);}finally{button.textContent=label;button.removeAttribute('aria-busy');}});
})();
