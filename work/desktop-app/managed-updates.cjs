const path=require('node:path');const {API,published,asset,compare}=require('./release-api.cjs');const {validateManifest,hash}=require('./version-store.cjs');
const REMINDER=4*60*60*1000;
async function bytesFrom(response,limit,progress=()=>{}){if(!response.ok)throw Error('Téléchargement indisponible');const chunks=[];let size=0;const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Fichier trop volumineux');chunks.push(Buffer.from(value));progress(size);}}finally{reader.releaseLock();}return Buffer.concat(chunks);}
function startUpdates({electron,window,store,current}){
 const {net,BrowserWindow,ipcMain,app}=electron;let busy=false,panel=null;
 async function check(){
  if(busy||window.isDestroyed())return;const state=store.read();if(Date.now()<state.remindAfter)return;busy=true;
  try{
   const response=await net.fetch(API,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});if(!response.ok)return;
   let release,manifestAsset;for(const item of published(await response.json())){const v=item.tag_name.slice(1);if(compare(v,current)<=0||state.skipped&&compare(v,state.skipped)<=0)continue;const found=asset(item,`Avant-Usine-Mise-a-jour-${v}.json`);if(found&&/^sha256:[a-f0-9]{64}$/.test(found.digest||'')){release=item;manifestAsset=found;break;}}
   if(!release)return;const version=release.tag_name.slice(1);
   const raw=await bytesFrom(await net.fetch(manifestAsset.browser_download_url,{signal:AbortSignal.timeout(20000)}),1024*1024);if(hash(raw)!==manifestAsset.digest.slice(7))throw Error('Manifest non vérifié');
   const manifest=validateManifest(JSON.parse(raw.toString('utf8')),version);
   panel=new BrowserWindow({parent:window,modal:false,width:590,height:560,resizable:false,show:false,title:'Avant l’Usine — Mise à jour',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'update-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
   panel.setMenu(null);panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-navigate',event=>event.preventDefault());
   const send=(extra={})=>{if(panel&&!panel.isDestroyed())panel.webContents.send('au-update-state',{version,current,...extra});};
   let installing=false,chosen=false;
   ipcMain.handle('au-update-choice',async(event,choice)=>{
    if(!panel||event.sender!==panel.webContents||installing)return;
    if(choice==='later'||choice==='skip'){chosen=true;const fresh=store.read();store.write({...fresh,remindAfter:choice==='later'?Date.now()+REMINDER:0,skipped:choice==='skip'?version:fresh.skipped});panel.close();return;}
    if(choice!=='install')return;installing=true;send({busy:true,message:'Téléchargement des fichiers nécessaires…'});
    try{
     await store.stage(manifest,async(file,progress)=>bytesFrom(await net.fetch(file.url,{signal:AbortSignal.timeout(120000)}),file.bytes,progress),value=>send({busy:true,percent:Math.round(value.done/value.total*100),message:'Téléchargement et vérification des fichiers…'}));
     send({busy:true,percent:100,message:'Vérification terminée. L’appli va redémarrer…'});store.activate(version);
     app.relaunch(process.env.PORTABLE_EXECUTABLE_FILE?{execPath:process.env.PORTABLE_EXECUTABLE_FILE}:{});app.exit(0);
    }catch{installing=false;send({message:'La mise à jour n’a pas été appliquée. L’ancienne version fonctionne toujours. Tu peux réessayer.',busy:false});}
   });
   panel.on('close',event=>{if(installing)event.preventDefault();else if(!chosen){const fresh=store.read();store.write({...fresh,remindAfter:Date.now()+REMINDER});}});
   panel.on('closed',()=>{ipcMain.removeHandler('au-update-choice');panel=null;busy=false;});
   panel.webContents.once('did-finish-load',()=>send());panel.once('ready-to-show',()=>panel.show());await panel.loadFile(path.join(__dirname,'update.html'));
  }catch{if(panel&&!panel.isDestroyed())panel.close();}finally{if(!panel)busy=false;}
 }
 check();const timer=setInterval(check,10*60*1000);timer.unref();window.on('closed',()=>clearInterval(timer));return {check};
}
module.exports={startUpdates,bytesFrom,REMINDER};
