// Site 26 livré « à plat » : le protocole avantusine://local reconstitue les dossiers,
// et le paquet préparé reste accepté par le validateur des lanceurs déjà installés.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createWindow}=require('../product.cjs');

async function serveFrom(root,loadResult=()=>Promise.resolve()){
 let serve;
 class Window{constructor(){this.webContents={setWindowOpenHandler(){},on(){}};}setIcon(){}on(){}once(){}loadURL(){return loadResult();}}
 const electron={BrowserWindow:Window,Menu:{setApplicationMenu(){}},ipcMain:{removeHandler(){},handle(){}},app:{getVersion:()=>require('../package.json').version,getPath:()=>path.join(root,'userdata')},protocol:{unhandle(){},handle(_s,fn){serve=fn;}},net:{fetch:async url=>new Response('servi:'+url)},shell:{openExternal(){}},session:{defaultSession:{setPermissionRequestHandler(){}}}};
 await createWindow({electron,root,onReady(){}});
 return serve;
}

// 0.11.0 : la redirection de index.html vers v26/ interrompt le premier chargement (ERR_ABORTED, -3) ;
// le lanceur prenait ce rejet pour une panne et affichait « Impossible d'ouvrir l'appli ».
test('la redirection vers la v26 ne fait plus échouer l’ouverture de la fenêtre',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'au-site26-'));fs.writeFileSync(path.join(root,'index.html'),'x');
 const aborted=Object.assign(new Error("ERR_ABORTED (-3) loading 'avantusine://local/'"),{code:'ERR_ABORTED',errno:-3});
 await assert.doesNotReject(serveFrom(root,()=>Promise.reject(aborted)));
 const broken=Object.assign(new Error('ERR_FILE_NOT_FOUND (-6)'),{code:'ERR_FILE_NOT_FOUND',errno:-6});
 await assert.rejects(serveFrom(root,()=>Promise.reject(broken)),/ERR_FILE_NOT_FOUND/);
});

test('les adresses de la v26 retrouvent leurs fichiers à plat',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'au-site26-'));
 for(const name of ['index.html','v26__index.html','v26__js__core__dom.js','v26__css__app.css','cover-01.webp'])fs.writeFileSync(path.join(root,name),name);
 const serve=await serveFrom(root);
 const ok=async(url,file)=>{const r=await serve({url});assert.equal(r.status,200,url);assert.ok((await r.text()).endsWith(file),url+' → '+file);};
 await ok('avantusine://local/','index.html');
 await ok('avantusine://local/v26/','v26__index.html');
 await ok('avantusine://local/v26/index.html','v26__index.html');
 await ok('avantusine://local/v26/js/core/dom.js?v=202611162020','v26__js__core__dom.js');
 await ok('avantusine://local/v26/css/app.css','v26__css__app.css');
 await ok('avantusine://local/cover-01.webp','cover-01.webp');
 for(const bad of ['avantusine://local/v26/js/core/absent.js','avantusine://local/%2e%2e%2fpackage.json','avantusine://local/v26/..%2f..%2fpackage.json','avantusine://evil/v26/'])assert.equal((await serve({url:bad})).status,404,bad);
});

test('le site préparé contient la v26 à plat et redirige vers elle',()=>{
 const site=path.resolve(__dirname,'../site');
 if(!fs.existsSync(path.join(site,'v26__index.html')))return; // site pas encore préparé (pnpm run prepare:site)
 const names=fs.readdirSync(site);
 assert.ok(names.every(n=>/^[a-zA-Z0-9_.-]+$/.test(n)),'aucun dossier ni caractère refusé par le lanceur');
 assert.ok(names.includes('v26__js__main.js')&&names.includes('v26__js__core__local.js')&&names.includes('ancien.html'));
 assert.match(fs.readFileSync(path.join(site,'v26__index.html'),'utf8'),/dataset\.auApp="desktop"/);
 assert.match(fs.readFileSync(path.join(site,'index.html'),'utf8'),/v26\//);
});
