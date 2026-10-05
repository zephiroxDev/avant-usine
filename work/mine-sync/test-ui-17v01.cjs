const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const web=path.resolve(__dirname,'../github-sync-import');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.listeners=new Map();this.dataset={};this.attrs={};this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.paused=true;this.currentTime=0;this.volume=0;this.muted=true;this.style={setProperty(){}};this.ownText='';}
 set textContent(s){this.ownText=String(s);this.children=[];}get textContent(){return this.ownText+this.children.map(c=>c.textContent).join('');}
 append(...children){for(const c of children){const node=typeof c==='string'?Object.assign(new Element('#text'),{ownText:c}):c;this.children.push(node);node.parent=this;if(this.tagName==='select'&&!this.value)this.value=node.value;}}
 prepend(...c){this.children.unshift(...c);}replaceChildren(...c){this.children=[];this.ownText='';this.append(...c);}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 addEventListener(k,fn){if(!this.listeners.has(k))this.listeners.set(k,[]);this.listeners.get(k).push(fn);}
 async fire(type){for(const fn of this.listeners.get(type)||[])await fn({type,currentTarget:this,target:this,preventDefault(){}});}
 async click(){await this.fire('click');}focus(){}scrollIntoView(){}load(){}pause(){this.paused=true;}async play(){this.paused=false;}
 get selectedOptions(){return this.children.filter(c=>c.value===this.value);}get isConnected(){return true;}querySelector(){return null;}closest(){return null;}
 all(){return [this,...this.children.flatMap(c=>c.all())];}
}
function harness(){const main=new Element('main'),nav=new Element('nav'),account=new Element('section'),body=new Element('body'),nodes=[];let time=1000;
 const document={hidden:false,body,createElement(tag){const n=new Element(tag);nodes.push(n);return n;},createTextNode(s){const n=new Element('#text');n.textContent=s;return n;},querySelector(s){return s==='main'?main:s==='.nav'?nav:s==='#accountMember'?account:null;}};
 const win=new Element('window');win.dispatchEvent=e=>{for(const fn of win.listeners.get(e.type)||[])fn(e);};
 const context={window:win,document,console,Intl,Date,Math,Map,Set,Number,String,Object,Array,JSON,RegExp,Promise,crypto:require('node:crypto').webcrypto,performance:{now:()=>time},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},AbortController,CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}}};vm.createContext(context);
 context.globalThis=win;
 return {context,win,main,nav,account,nodes,advance(n){time+=n;},load(file){vm.runInContext(fs.readFileSync(path.join(web,file),'utf8'),context,{filename:file});},navigate(route){for(const p of main.children)p.hidden=p.id!==route;win.dispatchEvent({type:'au:routechange',detail:{route}});}};
}
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
(async()=>{
 const h=harness();for(const f of ['summary-rules-17v01.js','statistics-engine-17v01.js','metrics-17v01.js','statistics-ui-17v01.js'])h.load(f);
 let user={id:'creator'};const rules=h.win.AU_SUMMARY_RULES;const facts={start:rules.parisMidnight(2026),end:new Date().toISOString(),trackingSince:rules.parisMidnight(2026),listening:[],events:[],messages:[],contributions:[],playlists:[],trophies:[],trophyCollection:[]};
 let failRPC=false;const rpc=async(name,{p}={})=>failRPC?{data:null,error:{message:'Hors ligne'}}:({data:name==='au_stats_view_17v01'?facts:name==='au_summary_access_17v01'&&p.action==='mine'?{summaries:[{id:'annual',year:2026,kind:'annual'}]}:name==='au_summary_access_17v01'&&p.action==='read'?{snapshot:facts}:{plans:[],trophies:[]},error:null});
 const api=h.win.AU_INIT_STATISTICS({getClient:()=>({rpc}),getUser:()=>user,navigate:h.navigate,openAccount(){},getSongLabel:k=>'Morceau '+k});
 await h.nav.children.find(n=>n.textContent==='Statistiques').click();await settle();
 const page=h.main.children.find(n=>n.id==='statistiques');assert.equal(page.all().filter(n=>n.dataset.metric).length,276);assert.equal(page.all().filter(n=>n.tagName==='summary').length,19);assert(page.textContent.includes('0 (indisponible)'));
 await page.all().find(n=>n.tagName==='button'&&n.textContent==='Ouvrir le résumé').click();
 assert.equal(page.all().find(n=>n.tagName==='button'&&n.textContent==='Public et définitif').disabled,true);assert(page.textContent.includes(rules.newYearMessage));
 user=null;api.changed();await settle();assert.equal(page.all().filter(n=>n.dataset.metric).length,0,'Private data cleared on logout');
 user={id:'creator'};failRPC=true;api.changed();await settle();const offlineCards=page.all().filter(n=>n.dataset.metric);assert.equal(offlineCards.length,276);assert(offlineCards.every(n=>n.textContent.includes('0 (indisponible)')),'Network failure keeps every metric available and marks every value unavailable');
 const b=harness();b.load('blind-test-17v01.js');const records=[],mainAudio=new Element('audio');const songs=[{key:'1:1',title:'Petit Test',volume:1,volumeLabel:'Volume 01',src:'one.mp3'},{key:'1:2',title:'Deuxième',volume:1,volumeLabel:'Volume 01',src:'two.mp3'}];
 b.win.AU_INIT_BLIND_TEST({getSongs:()=>songs,navigate:b.navigate,mainAudio,record:e=>records.push(e),getHistory:async()=>({rounds:4,correct:2,bestScore:1,fastestMs:4000})});
 const blind=b.main.children[0];const button=text=>blind.all().find(n=>n.tagName==='button'&&n.textContent===text);
 await b.nav.children[0].click();await button('Tout sélectionner').click();await button('Commencer').click();
 for(let i=0;i<2;i++){await button('Écouter l’extrait').click();b.advance(2000);const sample=b.nodes.find(n=>n.tagName==='audio'),answer=b.nodes.find(n=>n.tagName==='input'&&n.attrs['aria-label']==='Titre du morceau');answer.value=songs.find(s=>s.src===sample.src).title.toUpperCase();await b.nodes.find(n=>n.tagName==='form').fire('submit');await button(i===1?'Voir le bilan':'Morceau suivant').click();}
 assert.equal(records.filter(e=>e.kind==='blind_round').length,2);assert.equal(new Set(records.filter(e=>e.kind==='blind_round').map(e=>e.details.trackKey)).size,2);assert.equal(records.find(e=>e.kind==='blind_game').details.score,2);assert(blind.textContent.includes('Nouveau record !'));assert(blind.textContent.includes('50.0 points'));assert.equal(mainAudio.paused,true);
 console.log('PASS rendered 276 metrics/19 categories, private 2026 choice, annual reset message, account isolation, Blind Test unique rounds, answers, records and progression.');
})().catch(e=>{console.error(e);process.exitCode=1;});
