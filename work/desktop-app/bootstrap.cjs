const electron=require('electron'),{app,protocol,dialog}=electron;
const path=require('node:path'),fs=require('node:fs');
const {createStore,validateManifest,hash}=require('./version-store.cjs');
const {startUpdates}=require('./managed-updates.cjs');
const {compare}=require('./release-api.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'avantusine',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setAppUserModelId('dev.zephirox.avantusine');let window;
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(async()=>{
  // Launcher 0.9.0: public updates live in updates/publiques, test builds in
  // updates/tests. Files of earlier launchers are moved once, without loss:
  // nothing is overwritten and the old copy is only removed after a successful move.
  const updates=path.join(app.getPath('userData'),'updates'),publicDir=path.join(updates,'publiques');
  try{fs.mkdirSync(path.join(updates,'tests'),{recursive:true});if(!fs.existsSync(path.join(publicDir,'state.json'))){fs.mkdirSync(publicDir,{recursive:true});for(const name of ['state.json','versions']){const from=path.join(updates,name),to=path.join(publicDir,name);if(fs.existsSync(from)&&!fs.existsSync(to))fs.renameSync(from,to);}for(const name of fs.readdirSync(updates)){if(/^Avant-Usine-.*-test-\d+\.(exe|ipa|zip)$/.test(name))fs.renameSync(path.join(updates,name),path.join(updates,'tests',name));}}}catch{}
  const store=createStore(fs.existsSync(path.join(publicDir,'state.json'))||!fs.existsSync(path.join(updates,'state.json'))?publicDir:updates,__dirname,app.getVersion());let state=store.recover();
  async function launch(){
   const root=store.root(state.current);
   if(root!==__dirname){const manifest=validateManifest(JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')),state.current);for(const file of manifest.files){const bytes=fs.readFileSync(path.join(root,file.path));if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw Error('Version endommagée');}}
   let watchdog=setTimeout(()=>{if(store.read().pending){app.relaunch(process.env.PORTABLE_EXECUTABLE_FILE?{execPath:process.env.PORTABLE_EXECUTABLE_FILE}:{});app.exit(1);}},45000);watchdog.unref();
   window=await require(path.join(root,'product.cjs')).createWindow({electron,root:path.join(root,'site'),onReady:readyWindow=>{window=readyWindow;clearTimeout(watchdog);store.healthy(state.current);startUpdates({electron,window,store,current:state.current});}});
  }
  try{await launch();}catch(error){if(window&&!window.isDestroyed())window.destroy();const prior=state.previous;const fallback=prior&&compare(prior,app.getVersion())>=0&&fs.existsSync(path.join(store.root(prior),'product.cjs'))?prior:app.getVersion();store.write({...store.read(),current:fallback,pending:false,previous:null});state=store.read();try{await launch();}catch{dialog.showErrorBox('Avant l’usine','Impossible d’ouvrir l’appli. Le lanceur et tes données sont conservés.');app.quit();}}
 }).catch(error=>dialog.showErrorBox('Avant l’usine',error.message));
 app.on('activate',()=>{if(window&&!window.isDestroyed())window.show();});app.on('window-all-closed',()=>app.quit());
}
