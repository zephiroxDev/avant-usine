const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');const {createWindow}=require('../product.cjs');
test('interface locale isolée, navigation externe et titre protégés',async()=>{
 let options,loaded,handler,serve;const hooks={},opened=[];
 class Window{constructor(config){options=config;this.webContents={setWindowOpenHandler(fn){handler=fn;},on(name,fn){hooks[name]=fn;}};}on(name,fn){hooks[name]=fn;}once(){}loadURL(url){loaded=url;return Promise.resolve();}}
 const electron={BrowserWindow:Window,Menu:{setApplicationMenu(){}},protocol:{unhandle(){},handle(_scheme,fn){serve=fn;}},net:{fetch:async()=>new Response('ok')},shell:{openExternal:url=>opened.push(url)},session:{defaultSession:{setPermissionRequestHandler(){}}}};
 await createWindow({electron,root:path.resolve(__dirname,'../site'),onReady(){}});assert.equal(loaded,'avantusine://local/');assert.equal(options.webPreferences.nodeIntegration,false);assert.equal(options.webPreferences.contextIsolation,true);assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.webSecurity,true);
 let prevented=false;hooks['will-navigate']({preventDefault(){prevented=true;}},'avantusine://local/#collection');assert(!prevented);hooks['will-navigate']({preventDefault(){prevented=true;}},'https://example.com/');assert(prevented);assert.deepEqual(opened,['https://example.com/']);assert.equal(handler({url:'javascript:alert(1)'}).action,'deny');assert.equal(opened.length,1);
 assert.equal((await serve({url:'avantusine://local/%2e%2e%2fpackage.json'})).status,404);assert.equal((await serve({url:'avantusine://evil/index.html'})).status,404);assert.equal((await serve({url:'avantusine://local/'})).status,200);
});
