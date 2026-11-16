require('../../mine-sync/check-promo.cjs')(require('../release.json').releaseId,require('node:path').resolve(__dirname,'../../experience-integration'));
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../../github-sync-import'),dest=path.resolve(__dirname,'../site');
const {adaptCopy}=require('../../desktop-app/scripts/desktop-copy.cjs');
fs.mkdirSync(dest,{recursive:true});
const allowed=/^(beta-20v00-2\.js|design-20\.(?:css|js)|audio-edits-19v06\.js|sync-slider-19v03\.js|neon-industrial\.css|interface-layout\.js|maintenance-19v01\.js|studio-19v00(?:-model)?\.(?:js|css)|projects-19v00\.js|promo-18v08\.(?:js|css)|promo-manifest\.json|promo-[a-z0-9-]+\.png|index\.html|app-\d+v\d+\.js|(?:summary-rules|listening-clock|activity|blind-test|histories|metrics|statistics-engine|statistics-ui)-17v01\.js|local-18v00\.(?:js|css)|local-storage-18v07\.js|mobile-player-18v07\.(?:js|css)|backup-18v06\.js|backup-18v06\.js|comfort-18v05\.(?:js|css)|immersion-18v05-2\.(?:js|css)|sharing-17v06\.js|catalog-audit-17v03\.js|native-light-17v04\.js|collection-\d+v\d+\.js|styles-\d+v\d+\.css|cover-\d{2}\.webp|pochette-animee-\d{2}\.mp4|favicon\.ico|favicon-32\.png|apple-touch-icon\.png|icon-(192|512)\.png|supabase-auth-client\.js)$/;
for(const name of fs.readdirSync(source))if(allowed.test(name))fs.copyFileSync(path.join(source,name),path.join(dest,name));
let html=fs.readFileSync(path.join(dest,'index.html'),'utf8');
html=html.replace('<head>','<head><script>document.documentElement.dataset.auApp="android";</script>');
html=html.replace(/<aside id="desktopAnnouncement"[\s\S]*?<\/aside>/,'').replace('<script src="./release-download.js" defer></script>','').replace('<title>Avant l’usine — La collection</title>','<title>Avant l’usine</title>').replace('<span class="brand-mark" aria-hidden="true">AU</span>','<img class="brand-mark" src="./android-logo.png" alt="" style="object-fit:cover">');
html=html.replace(/<aside id="androidAnnouncement"[\s\S]*?<\/aside>/,'').replace('<script src="./android-download.js" defer></script>','');
html=adaptCopy(html).replaceAll('sur ton ordinateur','sur ton appareil');
html=html.replace('</head>','<link rel="stylesheet" href="./android.css"></head>').replace('</body>','<script src="./android.js" defer></script></body>');
fs.writeFileSync(path.join(dest,'index.html'),html);
const main=html.match(/src="\.\/(app-\d+v\d+\.js)"/)[1];let code=fs.readFileSync(path.join(dest,main),'utf8');
code=adaptCopy(code).replaceAll('sur ton ordinateur','sur ton appareil').replaceAll("new URL('./',location.href).href","'https://zephiroxdev.github.io/avant-usine/'").replace("if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});",'').replace("const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;","const standalone=true;");
code=code.replace("const names={'web-pc':'Site PC','desktop-pc':'Application PC','web-mobile':'Site mobile'};","const names={'web-pc':'Site PC','desktop-pc':'Application PC','web-mobile':'Site mobile','android':'Application Android','ios':'Application iOS'};");
if(!code.includes('if(!history.length)'))code=code.replace("for(const [title,date,intro,changes]of history)","if(!history.length)list.append(element('p','','Aucune version publiée pour cette plateforme.'));for(const [title,date,intro,changes]of history)");code=code.replace('for(const [title,text]of [',"for(const [title,text]of [\n['Mise à jour depuis le compte','Le bouton Forcer une mise à jour lance une recherche immédiate et propose la dernière version même après un report ou un saut de version.'],");fs.writeFileSync(path.join(dest,main),code);
const notes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../patch-notes.json'),'utf8'));
const hp=path.join(dest,'histories-17v01.js'),prefix='window.AU_PLATFORM_HISTORIES=';const h=JSON.parse(fs.readFileSync(hp,'utf8').slice(prefix.length).trim().replace(/;$/,''));h.android=notes;h.ios??=[];fs.writeFileSync(hp,prefix+JSON.stringify(h)+';');
for(const name of ['icon-512.png','icon-192.png','favicon-32.png','apple-touch-icon.png','favicon.ico'])fs.copyFileSync(path.resolve(__dirname,'../assets/generated',name),path.join(dest,name));
fs.copyFileSync(path.resolve(__dirname,'../assets/logo.png'),path.join(dest,'android-logo.png'));
for(const name of ['android.js','android.css'])fs.copyFileSync(path.resolve(__dirname,'../web',name),path.join(dest,name));
console.log('Interface mobile Android préparée : '+fs.readdirSync(dest).length+' fichiers.');

// Site 26 (décision d'Iloan, 16 novembre 2026) : l'appli Android rouvre en mode « musiques importées uniquement »
// (le site bloque le reste grâce à data-au-app="android"). L'ancien site reste dans le paquet avec android.js
// (mises à jour et export de l'appli) ; sa page d'accueil redirige tout de suite vers la v26.
{
  const v26=path.resolve(__dirname,'../../../v26'),out=path.join(dest,'v26');
  fs.rmSync(out,{recursive:true,force:true});fs.cpSync(v26,out,{recursive:true});
  // Affiche de la version (Gestion promo) et modules partagés utilisés par la v26.
  const shared=path.resolve(__dirname,'../../experience-integration');
  for(const name of ['promo-manifest.json','promo-26v00-public.png'])fs.copyFileSync(path.join(shared,name),path.join(dest,name));
  fs.copyFileSync(path.resolve(__dirname,'../web/android-26.css'),path.join(dest,'android-26.css'));
  const page=path.join(out,'index.html');let v=fs.readFileSync(page,'utf8');
  if(!v.includes('<head>')||!v.includes('</head>')||!v.includes('</body>'))throw Error('Page de la v26 incomplète');
  v=v.replace('<head>','<head><script>document.documentElement.dataset.auApp="android";</script>')
     .replace('</head>','<link rel="stylesheet" href="../android-26.css"></head>')
     .replace('</body>','<script src="../local-storage-18v07.js" defer></script><script src="../local-18v00.js" defer></script><script src="../backup-18v06.js" defer></script><script src="../android.js" defer></script></body>');
  fs.writeFileSync(page,v);
  const entry=path.join(dest,'index.html');let old=fs.readFileSync(entry,'utf8');
  old=old.replace('<head>','<head><script>location.replace("./v26/index.html"+location.hash);</script>');
  fs.writeFileSync(entry,old);
  console.log('Site 26 ajouté à l’appli Android (musiques importées uniquement).');
}
