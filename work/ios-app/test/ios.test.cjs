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
 const elements=[],storage=new Map(),timers=[],events={};let now=Date.now();
 class Clock extends Date{static now(){return now;}}
 const element=tag=>({tag,children:[],disabled:false,append(...x){this.children.push(...x);},remove(){this.removed=true;},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){},close(){}});
 const account=element('actions'),accountDialog=element('dialog');
 const document={documentElement:{dataset:{}},createElement:element,addEventListener(){},querySelector(s){return s==='#accountMember .actions'?account:s==='#accountDialog'?accountDialog:null;},body:{append(x){elements.push(x);}}};
 const win={AU_IOS_TEST:{},addEventListener(){},Capacitor:{Plugins:{IOSUpdates:{addListener:async()=>({remove:async()=>{}}),download:async()=>({uri:'file:///ipa'}),openIn:async()=>({opened:true})},Share:{share:async()=>{}}}}};
 const releases=[{assets:[{name:'Avant-Usine-iOS-1.1.0-non-signe.ipa',digest:'sha256:'+'a'.repeat(64),size:42,browser_download_url:'https://github.com/zephiroxDev/avant-usine/releases/download/ios-v1.1.0/Avant-Usine-iOS-1.1.0-non-signe.ipa'}]}];
 win.Capacitor.Plugins.IOSUpdates.checkReleases=async()=>({json:JSON.stringify(releases)});
 win.Capacitor.Plugins.IOSUpdates.addListener=async(name,fn)=>{events[name]=fn;return {remove:async()=>{}};};
 const sandbox={window:win,document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>{throw Error('Web request must not be used');},setTimeout:(fn,ms)=>timers.push(ms),setInterval(){},Date:Clock,console};
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/ios.js'),'utf8'),sandbox);
 return {...win.AU_IOS_TEST.exports,elements,storage,win,account,events,releases,advance(ms){now+=ms;}};
}
test('Only newest published iOS package selected, numeric versions',()=>{
 const c=context();assert.equal(c.compare('1.10.0','1.9.0'),1);
 assert.equal(c.current,require('../release.json').version);
 assert.equal(c.choose([{draft:true,assets:[{name:'Avant-Usine-iOS-9.0.0-non-signe.ipa'}]},{assets:[{name:'Avant-Usine-Android-9.0.0.apk'}]}],'1.0.0'),undefined);
});
test('Skipped version suppressed; a newer real version is proposed',async()=>{
 const c=context();c.storage.set('au-ios-skip','1.1.0');await c.check();assert.equal(c.elements.length,0);
 c.advance(60001);c.storage.set('au-ios-skip','1.0.1');await c.check();assert.equal(c.elements.length,1);
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
test('Account force update bypasses skipped version and postponed reminder',async()=>{
 const c=context();c.storage.set('au-ios-skip','1.1.0');c.storage.set('au-ios-remind',String(Date.now()+86400000));
 const button=c.account.children.find(x=>x.textContent==='Forcer une mise à jour');assert.ok(button);
 await button.onclick();assert.equal(c.elements[0].children[0].textContent,'Mise à jour iOS 1.1.0');assert.equal(button.disabled,false);
});

test('Native search errors visible and manual retry can recover',async()=>{
 const c=context();c.win.Capacitor.Plugins.IOSUpdates.checkReleases=async()=>{throw Error('HTTP 403');};
 await c.check();assert.ok(c.elements.some(x=>x.textContent?.includes('HTTP 403')));
 c.win.Capacitor.Plugins.IOSUpdates.checkReleases=async()=>({json:JSON.stringify(c.releases)});
 await c.check(true);assert.ok(c.elements.some(x=>x.children?.[0]?.textContent==='Mise à jour iOS 1.1.0'));
});

test('Native app resume triggers a fresh update check',async()=>{
 const c=context();await c.events.resume();assert.equal(c.elements[0].children[0].textContent,'Mise à jour iOS 1.1.0');
});

test('iOS presentation isolated, site histories last, day-night disabled',()=>{
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 const main=html.match(/src="\.\/(app-\d+v\d+\.js)"/)[1];
 const code=fs.readFileSync(path.join(root,'site',main),'utf8');
 assert.ok(code.includes("const names={'ios':'Application iOS','android':'Application Android','desktop-pc':'Application PC','web-mobile':'Site mobile','web-pc':'Site PC'};"));
 assert.ok(code.includes('themeButton.disabled=true;themeButton.hidden=true;'));
 assert.ok(!code.includes("root.dataset.theme=t==='light'?'light':'dark';"));
 const css=fs.readFileSync(path.join(root,'site/ios.css'),'utf8');assert.ok(css.includes('-webkit-backdrop-filter'));assert.ok(css.includes('data-reduce-transparency=true'));
 const common=fs.readFileSync(path.resolve(root,'../github-sync-import',main),'utf8');
 assert.ok(common.includes("root.dataset.theme=t==='light'?'light':'dark';"));assert.ok(!common.includes('themeButton.disabled=true'));
});

test('Native transparency preference reaches the interface',async()=>{
 const c=context();c.events.accessibility({reduceTransparency:true,increaseContrast:true});
 const code=fs.readFileSync(path.join(root,'native/IOSUpdates.swift'),'utf8');assert.ok(code.includes('UIAccessibility.isReduceTransparencyEnabled'));
});

