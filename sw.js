/* Cache uniquement l’interface locale. Les MP3, paroles et contributions restent en ligne. */
const AU_CACHE='avant-usine-shell-v3-kofi-20260925';
const AU_BASE=new URL('./',self.location.href);
const AU_INDEX=new URL('./index.html',AU_BASE).href;
const AU_OFFLINE=new URL('./offline.html',AU_BASE).href;
const AU_ASSETS=['./index.html','./offline.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'].map(p=>new URL(p,AU_BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(AU_CACHE).then(cache=>cache.addAll(AU_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('avant-usine-shell-')&&key!==AU_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==AU_BASE.origin||!url.pathname.startsWith(AU_BASE.pathname))return;
 if(request.mode==='navigate'){
  const isHome=url.pathname===AU_BASE.pathname||url.pathname===new URL(AU_INDEX).pathname;
  event.respondWith(fetch(request).then(response=>{if(isHome&&response.ok){const clone=response.clone();event.waitUntil(caches.open(AU_CACHE).then(cache=>cache.put(AU_INDEX,clone)));}return response;}).catch(async()=>await caches.match(isHome?AU_INDEX:AU_OFFLINE)||new Response('Hors connexion. Rouvre Avant l’Usine quand Internet sera disponible.',{headers:{'Content-Type':'text/plain; charset=utf-8'}})));
  return;
 }
 if(AU_ASSETS.includes(url.href))event.respondWith(fetch(request).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(AU_CACHE).then(cache=>cache.put(request,clone)));}return response;}).catch(()=>caches.match(request)));
});
