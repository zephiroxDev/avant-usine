const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('Packaged iOS references and isolated history',()=>{
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 for(const match of html.matchAll(/(?:src|href)="\.\/([^"#?]+)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,'site',match[1])),match[1]);
 assert.ok(html.includes('./ios.js'));assert.ok(!html.includes('android.js'));
 const h=fs.readFileSync(path.join(root,'site/histories-17v01.js'),'utf8');
 assert.ok(h.includes(require('../patch-notes.json')[0][0]));
 const main=html.match(/src="\.\/(app-\d+v\d+\.js)"/)[1];
 const code=fs.readFileSync(path.join(root,'site',main),'utf8');
 assert.ok(!code.includes("navigator.serviceWorker.register"));assert.ok(code.includes('Mises à jour iPhone et iPad'));
});
function context(){
 const elements=[],storage=new Map(),timers=[];
 const element=tag=>({tag,children:[],disabled:false,append(...x){this.children.push(...x);},remove(){this.removed=true;},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){},close(){}});
 const document={documentElement:{dataset:{}},createElement:element,addEventListener(){},querySelector(){return null;},body:{append(x){elements.push(x);}}};
 const win={AU_IOS_TEST:{},addEventListener(){},Capacitor:{Plugins:{IOSUpdates:{addListener:async()=>({remove:async()=>{}}),download:async()=>({uri:'file:///ipa'}),openIn:async()=>({opened:true})},Share:{share:async()=>{}}}}};
 const releases=[{assets:[{name:'Avant-Usine-iOS-1.1.0-non-signe.ipa',digest:'sha256:'+'a'.repeat(64),size:42,browser_download_url:'https://github.com/zephiroxDev/avant-usine/releases/download/ios-v1.1.0/Avant-Usine-iOS-1.1.0-non-signe.ipa'}]}];
 const sandbox={window:win,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({ok:true,json:async()=>releases}),setTimeout:(fn,ms)=>timers.push(ms),setInterval(){},Date,console};
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/ios.js'),'utf8'),sandbox);
 return {...win.AU_IOS_TEST.exports,elements,storage,win};
}
test('Only newest published iOS package selected, numeric versions',()=>{
 const c=context();assert.equal(c.compare('1.10.0','1.9.0'),1);
 assert.equal(c.current,require('../release.json').version);
 assert.equal(c.choose([{draft:true,assets:[{name:'Avant-Usine-iOS-9.0.0-non-signe.ipa'}]},{assets:[{name:'Avant-Usine-Android-9.0.0.apk'}]}],'1.0.0'),undefined);
});
test('Skipped version suppressed; a newer real version is proposed',async()=>{
 const c=context();c.storage.set('au-ios-skip','1.1.0');await c.check();assert.equal(c.elements.length,0);
 c.storage.set('au-ios-skip','1.0.1');await c.check();assert.equal(c.elements.length,1);
 assert.ok(c.elements[0].children.some(x=>x.textContent==='Sauter la version 1.1.0 et me le rappeler lors de la version qui sera déployée après la 1.1.0'));
});
test('Later postpones; verified download provides ESign action',async()=>{
 const c=context();await c.check();const modal=c.elements[0];
 const later=modal.children.find(x=>x.textContent==='Plus tard');later.onclick();assert.ok(Number(c.storage.get('au-ios-remind'))>Date.now());
 const d=context();await d.check();await d.elements[0].children.find(x=>x.textContent==='Télécharger la mise à jour').onclick();
 assert.ok(d.elements[0].children.some(x=>x.textContent==='Ouvrir dans un outil de signature'));
});
test('Failed download never offers installation; ESign failure shows manual fallback',async()=>{
 const c=context();c.win.Capacitor.Plugins.IOSUpdates.download=async()=>{throw Error('hash incorrect');};
 await c.check();await c.elements[0].children.find(x=>x.textContent==='Télécharger la mise à jour').onclick();
 assert.ok(!c.elements[0].children.some(x=>x.textContent==='Ouvrir dans un outil de signature'));
 assert.ok(c.elements[0].children.some(x=>x.textContent?.includes('L’installation actuelle est conservée')));
 const d=context();d.win.Capacitor.Plugins.IOSUpdates.openIn=async()=>{throw Error('absent');};
 await d.check();await d.elements[0].children.find(x=>x.textContent==='Télécharger la mise à jour').onclick();
 assert.ok(!d.elements[0].children.some(x=>x.textContent?.includes('Ouvre ton outil de signature et importe')));
 await d.elements[0].children.find(x=>x.textContent==='Ouvrir dans un outil de signature').onclick();
 assert.ok(d.elements[0].children.some(x=>x.textContent?.includes('Ouvre ton outil de signature et importe')));
});
