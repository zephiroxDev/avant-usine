const {app,BrowserWindow,Menu,protocol,net,shell,session,dialog}=require('electron');
const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');const {resolveLocalAsset}=require('./local-path.cjs');
const {checkForUpdates}=require('./update-check.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'avantusine',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setAppUserModelId('dev.zephirox.avantusine');
let window;
function external(raw){try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password)shell.openExternal(url.href);}catch{}}
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(()=>{
  const root=path.join(__dirname,'site');
  protocol.handle('avantusine',request=>{const file=resolveLocalAsset(request.url,root);if(!file||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Ressource introuvable',{status:404});return net.fetch(pathToFileURL(file).href);});
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window?.webContents&&['fullscreen','clipboard-sanitized-write'].includes(permission)));
  window=new BrowserWindow({title:'Avant l’Usine',width:1280,height:860,minWidth:800,minHeight:600,backgroundColor:'#121212',icon:path.join(root,'icon-512.png'),autoHideMenuBar:true,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,value)=>{const url=typeof value==='string'?value:value.url;const target=new URL(url);if(target.protocol!=='avantusine:'||target.hostname!=='local'){event.preventDefault();external(url);}});
  window.on('page-title-updated',event=>event.preventDefault());
  window.once('ready-to-show',()=>{window.show();checkForUpdates({net,dialog,shell,window,current:app.getVersion()});});
  window.loadURL('avantusine://local/').catch(error=>dialog.showErrorBox('Avant l’Usine','Impossible d’ouvrir l’interface locale : '+error.message));
  app.on('activate',()=>{if(window)window.show();});
 }).catch(error=>dialog.showErrorBox('Avant l’Usine',error.message));
 app.on('window-all-closed',()=>app.quit());
}
