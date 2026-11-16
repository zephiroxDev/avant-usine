/* Isolated iPhone preparation; no paused platform build or public release. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../experience-integration'),dest=path.join(root,'site'),release=require('../release.json');
if(!['creator-testing','stable'].includes(release.channel))throw Error('Unknown release channel');
require('../../experience-integration/prepare-editor-preview.cjs');
fs.mkdirSync(dest,{recursive:true});
for(const name of fs.readdirSync(source))if(!name.startsWith('test-')&&!name.startsWith('preview-v21')&&name!=='editor-test.html'&&(/\.(?:html|css|js|mjs|webp|mp4|png|ico)$/.test(name)||['archive-downloads.json','promo-manifest.json','mediabunny-LICENSE.txt','mediabunny-mp3-encoder-LICENSE.txt','mediabunny-mp3-encoder-SOURCE.txt'].includes(name)))fs.copyFileSync(path.join(source,name),path.join(dest,name));
const {adaptCopy}=require('../../desktop-app/scripts/desktop-copy.cjs');
let html=fs.readFileSync(path.join(dest,'index.html'),'utf8');
html=html.replace('<head>','<head><script>document.documentElement.dataset.auApp="ios";'+(release.channel==='creator-testing'?'document.documentElement.dataset.auBeta="true";document.documentElement.dataset.auBetaLabel='+JSON.stringify('BÊTA '+release.releaseId+' · '+release.buildNumber)+';':'')+'</script>');
html=html.replace(/<aside id="desktopAnnouncement"[\s\S]*?<\/aside>/,'').replace('<script src="./release-download.js" defer></script>','');
html=adaptCopy(html).replaceAll('sur ton ordinateur','sur ton appareil').replace('<link rel="stylesheet" href="./experience.css">','').replace('<link rel="stylesheet" href="./listening-beta.css">','').replace('<link rel="stylesheet" href="./renewal-beta.css">','').replace('<link rel="stylesheet" href="./release-22.css">','').replace('<link rel="stylesheet" href="./composition-22-2.css">','').replace('<link rel="stylesheet" href="./interface-23-1.css">','').replace('<link rel="stylesheet" href="./lyrics-writer-24.css">','').replace('<link rel="stylesheet" href="./fonts-25.css">','').replace('<link rel="stylesheet" href="./design-25.css">','');
html=html.replace('</head>','<link rel="stylesheet" href="./ios.css"><link rel="stylesheet" href="./experience.css"><link rel="stylesheet" href="./listening-beta.css"><link rel="stylesheet" href="./renewal-beta.css"><link rel="stylesheet" href="./release-22.css"><link rel="stylesheet" href="./composition-22-2.css"><link rel="stylesheet" href="./interface-23-1.css"><link rel="stylesheet" href="./lyrics-writer-24.css"><link rel="stylesheet" href="./fonts-25.css"><link rel="stylesheet" href="./design-25.css"></head>');
html=html.replace('</body>','<script src="./ios.js" defer></script><script src="./ios-lyrics-audio.js" defer></script><script src="./ios-lyrics.js" defer></script></body>');
fs.writeFileSync(path.join(dest,'index.html'),html);
for(const [from,to]of [['ios.js','ios.js'],['ios.css','ios.css'],['lyrics-audio.js','ios-lyrics-audio.js'],['lyrics-island.js','ios-lyrics.js']])fs.writeFileSync(path.join(dest,to),fs.readFileSync(path.join(root,'web',from),'utf8').replaceAll('__IOS_VERSION__',release.version));
const main=html.match(/src="\.\/(app-\d+v\d+\.js)"/)[1],file=path.join(dest,main);
let code=adaptCopy(fs.readFileSync(file,'utf8')).replaceAll('sur ton ordinateur','sur ton appareil');
code=code.replace("new URL('./',location.href).href","'https://zephiroxdev.github.io/avant-usine/'");
code=code.replace("return {key,title:t?.title||'',audio,data:nativeLyricCache.get(key)||null};","return {key,title:t?.title||'',audio,audioEdit:t?.audio_edit,data:nativeLyricCache.get(key)||null};");
code=code.replace("root.dataset.theme=t==='light'?'light':'dark';","root.dataset.theme='dark';");
code=code.replace("$('accountHeading').parentElement.after(themeButton);","$('accountHeading').parentElement.after(themeButton);themeButton.disabled=true;themeButton.hidden=true;");
code=code.replace(/if\('serviceWorker' in navigator[^\n]+navigator\.serviceWorker\.register[^\n]+/g,'');
code=code.replace("const names={'web-pc':'Site PC','desktop-pc':'Application PC','web-mobile':'Site mobile','android':'Application Android','ios':'Application iOS','ps4':'Application PS4'};","const names={'ios':'Application iOS','android':'Application Android','desktop-pc':'Application PC','ps4':'Application PS4','web-mobile':'Site mobile','web-pc':'Site PC'};");
code=code.replace('for(const [title,text]of [',"for(const [title,text]of [\n['Mises à jour iPhone et iPad','L’application télécharge les IPA vérifiés. Un outil de signature compatible reste nécessaire pour installer une nouvelle version.'],");
fs.writeFileSync(file,code);
const activity=path.join(dest,'activity-17v01.js');fs.writeFileSync(activity,fs.readFileSync(activity,'utf8').replace("  window.addEventListener('pagehide'","  window.addEventListener('au:native-listening',event=>{const d=event.detail,song=getTrack();if(!accountId||!song||d?.key!==song.key)return;for(const segment of d.segments||[]){if(!(segment.seconds>0&&segment.seconds<=35))continue;if(!sessionId)sessionId=crypto.randomUUID();lastActivity=Date.now();emit('listening',{trackKey:song.key,volume:song.volume,playbackId:playback?.playbackId,duration:d.duration,seconds:segment.seconds,startPosition:segment.startPosition,endPosition:segment.endPosition,sessionId});}flush();});\n  window.addEventListener('pagehide'"));
const comfort=path.join(dest,'comfort-18v05.js');fs.writeFileSync(comfort,fs.readFileSync(comfort,'utf8').replace('setInterval(elapsed,1000);',"window.addEventListener('au:native-sleep',finish);setInterval(elapsed,1000);"));
const history=path.join(dest,'histories-17v01.js'),prefix='window.AU_PLATFORM_HISTORIES=';const histories=JSON.parse(fs.readFileSync(history,'utf8').slice(prefix.length).trim().replace(/;$/,''));histories.ios=require('../patch-notes.json');fs.writeFileSync(history,prefix+JSON.stringify(histories)+';');
console.log('Prepared isolated iPhone beta '+release.version+' ('+release.buildNumber+'); no Windows/Android build.');

// Site 26 (décision d'Iloan, 16 novembre 2026) : l'appli iPhone/iPad ouvre la v26 en mode « musiques importées uniquement »
// (le site bloque le reste grâce à data-au-app="ios"). L'ancien site reste dans le paquet, avec ios.js (mises à jour de l'appli),
// et sa page d'accueil redirige tout de suite vers la v26.
{
  const v26=path.resolve(root,'../../v26'),out=path.join(dest,'v26');
  fs.rmSync(out,{recursive:true,force:true});fs.cpSync(v26,out,{recursive:true});
  fs.writeFileSync(path.join(dest,'ios-26.css'),fs.readFileSync(path.join(root,'web/ios-26.css'),'utf8'));
  const page=path.join(out,'index.html');let v=fs.readFileSync(page,'utf8');
  if(!v.includes('<head>')||!v.includes('</head>')||!v.includes('</body>'))throw Error('Page de la v26 incomplète');
  v=v.replace('<head>','<head><script>document.documentElement.dataset.auApp="ios";</script>')
     .replace('</head>','<link rel="stylesheet" href="../ios-26.css"></head>')
     // Modules partagés avec l'ancien site (stockage des musiques, sauvegarde) puis le service de mise à jour de l'appli.
     .replace('</body>','<script src="../local-storage-18v07.js" defer></script><script src="../local-18v00.js" defer></script><script src="../backup-18v06.js" defer></script><script src="../ios.js" defer></script></body>');
  fs.writeFileSync(page,v);
  const entry=path.join(dest,'index.html');let old=fs.readFileSync(entry,'utf8');
  old=old.replace('<head>','<head><script>location.replace("./v26/index.html"+location.hash);</script>');
  fs.writeFileSync(entry,old);
  console.log('Site 26 ajouté à l’appli iPhone (musiques importées uniquement).');
}
