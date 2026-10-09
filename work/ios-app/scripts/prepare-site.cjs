const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'site'),android=path.resolve(root,'../android-app');
cp.execFileSync(process.execPath,[path.join(android,'scripts/prepare-site.cjs')],{stdio:'inherit'});
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const file of fs.readdirSync(path.join(android,'site'))){
  if(['android.js','android.css','android-logo.png'].includes(file))continue;
  fs.copyFileSync(path.join(android,'site',file),path.join(dest,file));
}
let html=fs.readFileSync(path.join(dest,'index.html'),'utf8');
html=html.replace('./android-logo.png','./icon-512.png').replace('./android.css','./ios.css').replace('./android.js','./ios.js');
fs.writeFileSync(path.join(dest,'index.html'),html);
for(const file of ['icon-512.png','icon-192.png','apple-touch-icon.png','favicon-32.png'])
  fs.copyFileSync(path.resolve(root,'../desktop-app/build',file),path.join(dest,file));
const release=require('../release.json');
for(const file of ['ios.js','ios.css'])fs.writeFileSync(path.join(dest,file),fs.readFileSync(path.join(root,'web',file),'utf8').replace('__IOS_VERSION__',release.version));
const prefix='window.AU_PLATFORM_HISTORIES=',historyFile='histories-17v01.js';
const history=JSON.parse(fs.readFileSync(path.resolve(root,'../github-sync-import',historyFile),'utf8').slice(prefix.length).trim().replace(/;$/,''));
history.ios=require('../patch-notes.json');fs.writeFileSync(path.join(dest,historyFile),prefix+JSON.stringify(history)+';');
const main=html.match(/src="\.\/(app-\d+v\d+\.js)"/)[1];
let code=fs.readFileSync(path.join(dest,main),'utf8');
const platformNames="const names={'web-pc':'Site PC','desktop-pc':'Application PC','web-mobile':'Site mobile','android':'Application Android','ios':'Application iOS'};";
if(!code.includes(platformNames))throw Error('Sélecteur des plateformes introuvable');
code=code.replace(platformNames,"const names={'ios':'Application iOS','android':'Application Android','desktop-pc':'Application PC','web-mobile':'Site mobile','web-pc':'Site PC'};");
code=code.replace("root.dataset.theme=t==='light'?'light':'dark';","root.dataset.theme='dark';");
const themePlacement="$('accountHeading').parentElement.after(themeButton);";
if(!code.includes(themePlacement))throw Error('Bouton de thème introuvable');
code=code.replace(themePlacement,themePlacement+"themeButton.disabled=true;themeButton.hidden=true;");
const needle='for(const [title,text]of [';
if(!code.includes(needle))throw Error('Section Infos introuvable');
code=code.replace(needle,needle+"\n['Mises à jour iPhone et iPad','L’application télécharge les nouveaux IPA et vérifie leur empreinte. Ouvrir dans un outil de signature utilise le menu natif iOS ; un certificat et un profil valides sont nécessaires pour signer puis installer. Garder le même identifiant et une signature compatible pour conserver les données.'],");
code=code.replace(needle,needle+"\n['Interface verre iOS','Sur iPhone et iPad, les commandes, panneaux et cartes utilisent un verre translucide. L’apparence dédiée remplace le bouton jour/sombre. Réduire la transparence et augmenter le contraste dans les réglages iOS renforcent les surfaces ; les effets réduits restent disponibles. Les historiques des applications apparaissent avant ceux du site.'],");
fs.writeFileSync(path.join(dest,main),code);
console.log('Interface iOS '+release.version+' préparée.');
