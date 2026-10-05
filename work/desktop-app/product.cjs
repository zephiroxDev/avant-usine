const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
exports.createWindow=async({electron,root,onReady})=>{
 const {BrowserWindow,Menu,protocol,net,shell,session}=electron;
 function external(raw){try{const url=new URL(raw);if(url.protocol==='https:'&&!url.username&&!url.password)shell.openExternal(url.href);}catch{}}
 try{protocol.unhandle('avantusine');}catch{}protocol.handle('avantusine',request=>{
  const url=new URL(request.url);if(url.hostname!=='local'||url.username||url.password)return new Response('Introuvable',{status:404});
  let name;try{name=decodeURIComponent(url.pathname);}catch{return new Response('Introuvable',{status:404});}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(path.resolve(root)+path.sep)||name.includes('\\')||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Introuvable',{status:404});return net.fetch(pathToFileURL(file).href);
 });
 Menu.setApplicationMenu(null);const window=new BrowserWindow({title:'Avant l’usine',width:1280,height:860,minWidth:800,minHeight:600,backgroundColor:'#121212',icon:path.join(root,'icon-512.png'),autoHideMenuBar:true,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window.webContents&&['fullscreen','clipboard-sanitized-write'].includes(permission)));
 window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
 window.webContents.on('will-navigate',(event,value)=>{const url=new URL(typeof value==='string'?value:value.url);if(url.protocol!=='avantusine:'||url.hostname!=='local'){event.preventDefault();external(url.href);}});
 window.on('page-title-updated',event=>event.preventDefault());window.once('ready-to-show',()=>{window.show();setImmediate(()=>onReady(window));});
 await window.loadURL('avantusine://local/');return window;
};
