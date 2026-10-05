const prefix='https://github.com/zephiroxDev/avant-usine/releases/download/';
function newer(candidate,current){
 const parse=value=>/^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
 const a=parse(candidate),b=parse(current);if(!a||!b)return false;
 for(let i=1;i<=3;i++){if(Number(a[i])!==Number(b[i]))return Number(a[i])>Number(b[i]);}return false;
}
function findUpdate(releases,current){
 if(!Array.isArray(releases))return null;
 return releases.filter(r=>!r.draft&&newer(r.tag_name,current)).sort((a,b)=>newer(a.tag_name,b.tag_name)?-1:1).map(r=>{
  const version=r.tag_name.slice(1),name=`Avant-Usine-Installation-${version}.exe`;
  const asset=r.assets?.find(a=>a.name===name&&a.state==='uploaded'&&a.browser_download_url===`${prefix}${r.tag_name}/${name}`);
  return asset?{version,url:asset.browser_download_url}:null;
 }).find(Boolean)||null;
}
async function checkForUpdates({net,dialog,shell,window,current}){
 try{
  const response=await net.fetch('https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=30',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)return;
  const update=findUpdate(await response.json(),current);if(!update||window.isDestroyed())return;
  const choice=await dialog.showMessageBox(window,{type:'info',title:'Avant l’Usine — Mise à jour',message:'Une mise à jour est disponible',detail:`Version ${update.version}\nTa version : ${current}\n\nTélécharge le nouvel installateur pour mettre à jour l’appli. Ton compte et tes préférences seront conservés.`,buttons:['Télécharger','Plus tard'],defaultId:0,cancelId:1,noLink:true});
  if(choice.response===0)await shell.openExternal(update.url);
 }catch{/* Sans connexion ou en cas d’erreur GitHub, l’écoute reste disponible. */}
}
module.exports={newer,findUpdate,checkForUpdates};
