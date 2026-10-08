const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Account button overrides skip and reminder and offers normal Android installation',async()=>{
 const nodes=[],make=tag=>{const n={tag,children:[],append(...x){this.children.push(...x);},setAttribute(){},addEventListener(){},showModal(){},close(){},remove(){},removeAttribute(){}};nodes.push(n);return n;};
 const account=make('actions'),footer=make('footer'),accountDialog=make('dialog'),storage=new Map([['au-android-skip','0.1.3'],['au-android-remind',String(Date.now()+86400000)]]);
 const ctx={document:{documentElement:{dataset:{}},createElement:make,body:make('body'),addEventListener(){},querySelector:s=>s==='#accountMember .actions'?account:s==='#accountDialog'?accountDialog:s==='.footer'?footer:null},window:{addEventListener(){},Capacitor:{Plugins:{AndroidUpdates:{info:async()=>({version:'0.1.2'})}}}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Date,setTimeout(){},setInterval(){},fetch:async()=>({ok:true,json:async()=>[{assets:[{name:'Avant-Usine-Android-0.1.3.apk',digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/zephiroxDev/avant-usine/releases/download/android-v0.1.3/Avant-Usine-Android-0.1.3.apk'}]}]})};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../web/android.js'),'utf8'),ctx);
 const button=account.children.find(x=>x.textContent==='Forcer une mise à jour');assert.ok(button);await button.onclick();
 const modal=nodes.find(x=>x.tag==='dialog'&&x.children[0]?.textContent==='Mise à jour Android 0.1.3');assert.ok(modal);assert.ok(modal.children.some(x=>x.textContent==='Installer'));assert.equal(button.disabled,false);
});
