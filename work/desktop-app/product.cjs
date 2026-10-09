const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
exports.createWindow=async({electron,root,onReady})=>{
 const {BrowserWindow,Menu,protocol,net,shell,session,ipcMain,app}=electron;
 function external(raw){try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password)shell.openExternal(url.href);}catch{}}
 try{protocol.unhandle('avantusine');}catch{}protocol.handle('avantusine',request=>{
  const url=new URL(request.url);if(url.hostname!=='local'||url.username||url.password)return new Response('Introuvable',{status:404});
  let name;try{name=decodeURIComponent(url.pathname);}catch{return new Response('Introuvable',{status:404});}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(path.resolve(root)+path.sep)||name.includes('\\')||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Introuvable',{status:404});return net.fetch(pathToFileURL(file).href);
 });
 Menu.setApplicationMenu(null);const window=new BrowserWindow({title:'Avant l’usine',width:1280,height:860,minWidth:800,minHeight:600,backgroundColor:'#121212',icon:path.join(root,'icon-512.png'),autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(root,'desktop-diagnostic-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 ipcMain.removeHandler('au-product-diagnostic');ipcMain.handle('au-product-diagnostic',async event=>{
  if(event.sender!==window.webContents)throw Error('Accès refusé');
  let state={};try{state=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'updates/state.json'),'utf8'));}catch{}
  const current=state.current||app.getVersion();
  try{const response=await net.fetch('https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);const releases=await response.json();const versions=releases.filter(r=>!r.draft&&!r.prerelease&&/^v\d+\.\d+\.\d+$/.test(r.tag_name)&&(r.assets||[]).some(a=>a.name==='Avant-Usine-Mise-a-jour-'+r.tag_name.slice(1)+'.json')).map(r=>r.tag_name.slice(1)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));return {current,latest:versions.at(-1)||current,skipped:state.skipped||null,remindAfter:state.remindAfter||0,error:null,state:state.skipped?'Une version a été ignorée.':state.remindAfter>Date.now()?'La proposition de mise à jour est reportée.':'Recherche terminée.'};}catch(error){return {current,error:error.message||String(error),skipped:state.skipped||null,remindAfter:state.remindAfter||0};}
 });window.on('closed',()=>ipcMain.removeHandler('au-product-diagnostic'));
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window.webContents&&['fullscreen','clipboard-sanitized-write'].includes(permission)));
 window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 window.webContents.on('will-navigate',(event,value)=>{const url=new URL(typeof value==='string'?value:value.url);if(url.protocol!=='avantusine:'||url.hostname!=='local'){event.preventDefault();external(url.href);}});
 window.on('page-title-updated',event=>event.preventDefault());window.once('ready-to-show',()=>{window.show();setImmediate(()=>onReady(window));});
 await window.loadURL('avantusine://local/');return window;
};
