const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {compare,REPO}=require('./release-api.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function validateManifest(manifest,version){
 if(manifest.version!==version||compare(version,'0.0.0')===null||manifest.format!==1||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>1000)throw Error('Manifest de mise à jour invalide.');
 let total=0;const seen=new Set();
 for(const file of manifest.files){
  if(typeof file.path!=='string'||!(/^(product\.cjs|site\/[a-zA-Z0-9_.-]+)$/.test(file.path))||file.path.includes('..')||seen.has(file.path)||!(/^[a-f0-9]{64}$/.test(file.sha256))||!Number.isSafeInteger(file.bytes)||file.bytes<1||file.bytes>32*1024*1024)throw Error('Fichier de mise à jour invalide.');
  seen.add(file.path);total+=file.bytes;
  const url=new URL(file.url);if(!url.href.startsWith(REPO)||url.username||url.password||url.search||url.hash||!/^v\d+\.\d+\.\d+\/au-[a-f0-9]{64}\.bin$/.test(url.href.slice(REPO.length)))throw Error('Adresse de mise à jour invalide.');
 }
 if(total>128*1024*1024||!seen.has('product.cjs')||!seen.has('site/index.html'))throw Error('Paquet incomplet.');
 return manifest;
}
function createStore(directory,baseRoot,baseVersion){
 fs.mkdirSync(directory,{recursive:true});const statePath=path.join(directory,'state.json');
 const defaults={current:baseVersion,previous:null,pending:false,skipped:null,remindAfter:0};
 function read(){try{const value={...defaults,...JSON.parse(fs.readFileSync(statePath,'utf8'))};if(compare(value.current,baseVersion)===null)throw Error();if(value.previous&&compare(value.previous,baseVersion)===null)value.previous=null;if(value.skipped&&compare(value.skipped,'0.0.0')===null)value.skipped=null;if(!Number.isFinite(value.remindAfter))value.remindAfter=0;return value;}catch{return {...defaults};}}
 function write(state){const tmp=statePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state));fs.renameSync(tmp,statePath);}
 function root(version){if(version===baseVersion)return baseRoot;if(compare(version,'0.0.0')===null)throw Error('Version invalide');return path.join(directory,'versions',version);}
 function recover(){let state=read();if(compare(state.current,baseVersion)<0||state.pending&&state.attempts>=1){state={...state,current:compare(state.current,baseVersion)<0?baseVersion:(state.previous||baseVersion),previous:null,pending:false,attempts:0};write(state);}else if(state.pending){state={...state,attempts:1};write(state);}if(!fs.existsSync(path.join(root(state.current),'product.cjs'))){state={...state,current:baseVersion,pending:false};write(state);}return state;}
 function activate(version){const state=read();if(compare(version,state.current)<=0)throw Error('Version obsolète');write({...state,current:version,previous:state.current,pending:true,attempts:0,skipped:null,remindAfter:0});}
 function healthy(version){const state=read();if(state.current===version&&state.pending)write({...state,pending:false});}
 async function stage(manifest,fetchFile,progress=()=>{}){
  validateManifest(manifest,manifest.version);const state=read();if(compare(manifest.version,state.current)<=0)throw Error('Version obsolète');
  const target=root(manifest.version),temporary=target+'.staging-'+crypto.randomUUID();if(fs.existsSync(target)){if(manifest.files.every(f=>{try{const b=fs.readFileSync(path.join(target,f.path));return b.length===f.bytes&&hash(b)===f.sha256;}catch{return false;}}))return target;fs.renameSync(target,target+'.invalid-'+Date.now());}
  fs.mkdirSync(temporary,{recursive:true});let done=0;const total=manifest.files.reduce((s,f)=>s+f.bytes,0),oldRoot=root(state.current);
  for(const file of manifest.files){
   const old=path.join(oldRoot,file.path);let bytes;
   try{const existing=fs.readFileSync(old);if(existing.length===file.bytes&&hash(existing)===file.sha256)bytes=existing;}catch{}
   if(!bytes)bytes=await fetchFile(file,received=>progress({done:done+received,total,path:file.path}));
   if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw Error('La vérification a échoué : '+file.path);
   const destination=path.join(temporary,file.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);done+=file.bytes;progress({done,total,path:file.path});
  }
  fs.writeFileSync(path.join(temporary,'manifest.json'),JSON.stringify(manifest));fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(temporary,target);return target;
 }
 return {read,write,root,recover,activate,healthy,stage};
}
module.exports={createStore,validateManifest,hash};
