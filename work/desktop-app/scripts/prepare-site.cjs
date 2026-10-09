const fs=require('node:fs'),path=require('node:path');
const {adaptCopy}=require('./desktop-copy.cjs');
const source=path.resolve(__dirname,'../../github-sync-import'),destination=path.resolve(__dirname,'../site');
fs.mkdirSync(destination,{recursive:true});
const allowed=/^(index\.html|app-\d+v\d+\.js|(?:summary-rules|listening-clock|activity|blind-test|histories|metrics|statistics-engine|statistics-ui)-17v01\.js|local-18v00\.(?:js|css)|comfort-18v05\.(?:js|css)|immersion-18v05-2\.(?:js|css)|sharing-17v06\.js|catalog-audit-17v03\.js|native-light-17v04\.js|collection-\d+v\d+\.js|styles-\d+v\d+\.css|cover-\d{2}\.webp|pochette-animee-\d{2}\.mp4|favicon\.ico|favicon-32\.png|apple-touch-icon\.png|icon-(192|512)\.png|supabase-auth-client\.js|manifest\.webmanifest|offline\.html)$/;
for(const entry of fs.readdirSync(source))if(allowed.test(entry))fs.copyFileSync(path.join(source,entry),path.join(destination,entry));
const htmlPath=path.join(destination,'index.html');let html=fs.readFileSync(htmlPath,'utf8');const active=html.match(/src="\.\/(app-\d+v\d+\.js)"/);if(!active)throw Error('Script principal introuvable');
html=html.replace('<head>','<head><script>document.documentElement.dataset.auApp="desktop";</script>');
html=html.replace(/<aside id="desktopAnnouncement"[\s\S]*?<\/aside>/,'').replace('<script src="./release-download.js" defer></script>','');
html=html.replace(/<aside id="androidAnnouncement"[\s\S]*?<\/aside>/,'').replace('<script src="./android-download.js" defer></script>','');
html=adaptCopy(html).replace('<title>Avant l’usine — La collection</title>','<title>Avant l’usine</title>').replace('<span class="brand-mark" aria-hidden="true">AU</span>','<img class="brand-mark" src="./icon-512.png" alt="" style="object-fit:cover">');fs.writeFileSync(htmlPath,html);
html=html.replace('</body>','<script src="./desktop-settings.js" defer></script></body>');fs.writeFileSync(htmlPath,html);
fs.copyFileSync(path.join(__dirname,'desktop-settings.js'),path.join(destination,'desktop-settings.js'));
fs.copyFileSync(path.join(__dirname,'desktop-diagnostic-preload.cjs'),path.join(destination,'desktop-diagnostic-preload.cjs'));
const appPath=path.join(destination,active[1]);let code=fs.readFileSync(appPath,'utf8');
const start=code.indexOf(' const releases=['),end=code.indexOf(' for(const [title,date,intro,changes]of releases)',start);if(!html.includes('histories-17v01.js')&&(start<0||end<0))throw Error('Patch Notes introuvables');
const notes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../patch-notes.json'),'utf8'));
if(!notes.length||!notes.at(-1)[0].startsWith('13V09'))throw Error('Historique Windows invalide');
const hp=path.join(destination,'histories-17v01.js'),prefix='window.AU_PLATFORM_HISTORIES=';const histories=JSON.parse(fs.readFileSync(hp,'utf8').slice(prefix.length).trim().replace(/;$/,''));histories['desktop-pc']=notes;fs.writeFileSync(hp,prefix+JSON.stringify(histories)+';');
// Maintain Windows notes independently; never inherit Web-only releases.
if(!html.includes('histories-17v01.js'))code=code.slice(0,start)+' const releases='+JSON.stringify(notes)+';\n'+code.slice(end);
code=code.replaceAll("new URL('./',location.href).href","'https://zephiroxdev.github.io/avant-usine/'");code=adaptCopy(code);
code=code.replace("const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;","const standalone=true;").replace("Ajoute Avant l’usine à ton écran d’accueil pour retrouver le lecteur comme une application.","Avant l’usine est installée sur ton ordinateur. Bonne écoute !");fs.writeFileSync(appPath,code);
for(const file of ['icon-512.png','icon-192.png','apple-touch-icon.png','favicon-32.png'])fs.copyFileSync(path.join(__dirname,'../build',file),path.join(destination,file));
fs.copyFileSync(path.join(__dirname,'../build/icon.ico'),path.join(destination,'favicon.ico'));
const offline=path.join(destination,'offline.html');fs.writeFileSync(offline,adaptCopy(fs.readFileSync(offline,'utf8')));
for(const file of fs.readdirSync(destination)){if(/^app-\d+v\d+\.js$/.test(file)&&file!==active[1])fs.unlinkSync(path.join(destination,file));if(/^styles-\d+v\d+\.css$/.test(file)&&!html.includes(file))fs.unlinkSync(path.join(destination,file));}
const comfortPath=path.join(destination,'comfort-18v05.js');fs.appendFileSync(comfortPath,"\nwindow.AU_UPDATE_DIAGNOSTIC.configure({platform:'desktop',current:'"+require('../release.json').desktopVersion+"'});\n");
console.log('Interface locale et historique Windows préparés : '+fs.readdirSync(destination).length+' fichiers.');
