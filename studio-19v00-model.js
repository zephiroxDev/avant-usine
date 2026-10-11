/* Atelier 19V00: data operations are independent of playback, UI and accounts. */
(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>globalThis.crypto?.randomUUID?.()||'au-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const size=text=>Array.from(text).length;
const words=text=>{const out=[];let offset=0;for(const token of text.match(/\S+\s*|\s+/gu)||[]){out.push({text:token,offset,length:size(token)});offset+=size(token);}return out;};
const round=x=>Math.round(x*1000)/1000;
function create({lines=[],title='',trackKey='',duration=null,sourceHash='',local=false,curves=[],times=[],ends=[]}={}){
 return {format:'avant-usine-studio',version:1,id:uid(),title,trackKey,sourceHash,local,duration,position:0,rate:1,archived:false,updatedAt:new Date().toISOString(),tracks:[{id:'main',name:'Voix principale',kind:'main'}],phrases:lines.map((text,i)=>({id:uid(),track:'main',text,start:Number.isFinite(times[i])?times[i]:curves[i]?.[0]?.[1]??null,end:Number.isFinite(ends[i])?ends[i]:curves[i]?.at(-1)?.[1]??null,points:clone(curves[i]||[]),locked:false,status:'todo'}))};
}
function fromSync(data,options={}){
 const p=create({...options,lines:data.lines||[],curves:data.curves||[],times:data.times||[],ends:data.line_ends||[],duration:data.duration});
 if(Array.isArray(data.tracks)&&data.tracks.length&&Array.isArray(data.line_tracks)){p.tracks=clone(data.tracks);p.phrases.forEach((l,i)=>{l.track=data.line_tracks[i]||p.tracks[0].id;});}
 p.phrases.forEach((l,i)=>{if(l.end===null&&Number.isFinite(l.start)){const next=data.times?.slice(i+1).find(t=>Number.isFinite(t)&&t>l.start);l.end=next??(Number.isFinite(data.end_time)?data.end_time:null);}if(l.start!==null&&l.end!==null)l.status='review';});
 return validateProject(p);
}
function validateProject(p){
 if(!p||p.format!=='avant-usine-studio'||p.version!==1||!Array.isArray(p.tracks)||!Array.isArray(p.phrases)||p.tracks.length<1||p.tracks.length>32||p.phrases.length>600)throw Error('Projet illisible ou trop volumineux.');
 const tracks=new Set(),ids=new Set();for(const t of p.tracks){if(typeof t.id!=='string'||tracks.has(t.id)||typeof t.name!=='string'||t.name.length>100)throw Error('Piste invalide.');tracks.add(t.id);}
 for(const l of p.phrases){if(typeof l.id!=='string'||ids.has(l.id)||!tracks.has(l.track)||typeof l.text!=='string'||!l.text.trim()||size(l.text)>2000||!['todo','review','done'].includes(l.status)||typeof l.locked!=='boolean'||!Array.isArray(l.points)||l.points.length>2000)throw Error('Phrase invalide.');ids.add(l.id);for(const v of [l.start,l.end])if(v!==null&&(!Number.isFinite(v)||v<0||v>21600))throw Error('Repère invalide.');for(const point of l.points)if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw Error('Repère de mot invalide.');}
 return p;
}
function issues(p,mode='highlight'){
 const result=[];if(!Number.isFinite(p.duration)||p.duration<=0||p.duration>21600)result.push({message:'La durée du morceau n’est pas disponible.'});
 if(!p.phrases.length)result.push({message:'Ajoute au moins une phrase.'});
 for(const l of p.phrases){const add=message=>result.push({id:l.id,message});if(!Number.isFinite(l.start)||!Number.isFinite(l.end))add('Début ou fin manquant.');else if(l.start<0||l.end<=l.start||l.end>p.duration)add('La phrase dépasse le morceau ou sa fin précède son début.');
  if(mode==='highlight'){let x=-1,t=-1;const n=size(l.text);if(l.points.length<2||l.points[0]?.[0]!==0||l.points.at(-1)?.[0]!==n)add('Les repères du surlignage sont incomplets.');for(const a of l.points){if(a[0]<=x||a[0]>n||a[1]<=t||a[1]<l.start||a[1]>l.end){add('Les repères de cette phrase doivent avancer dans le texte et le temps.');break;}x=a[0];t=a[1];}}
 }
 return result;
}
function flatten(p,mode='highlight'){
 const errors=issues(p,mode);if(errors.length)throw Error(errors[0].message);
 const ordered=p.phrases.map((l,i)=>({...l,order:i})).sort((a,b)=>a.start-b.start||a.order-b.order);
 return {version:'2.0',sync_mode:mode,duration:p.duration,lines:ordered.map(l=>l.text),times:ordered.map(l=>l.start),line_ends:ordered.map(l=>l.end),line_tracks:ordered.map(l=>l.track),tracks:clone(p.tracks),curves:mode==='highlight'?ordered.map(l=>clone(l.points)):null,line_groups:ordered.map((_,i)=>i),block_times:mode==='blocks'?ordered.map(l=>l.start):null,end_time:Math.max(...ordered.map(l=>l.end)),studio:clone(p)};
}
function lrc(p){
 const data=flatten(p,'blocks'),stamp=t=>{const ticks=Math.round(t*100),m=Math.floor(ticks/6000),s=Math.floor(ticks%6000/100),c=ticks%100;return '['+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(c).padStart(2,'0')+']';};
 return {text:data.lines.map((line,i)=>stamp(data.times[i])+line).join('\n')+'\n',warning:'Le LRC conserve les débuts des phrases. Les pistes, fins précises, repères des mots et chevauchements détaillés nécessitent le JSON.'};
}
function model(initial,onchange=()=>{}){
 let p=clone(validateProject(initial)),undo=[],redo=[];
 const get=id=>{const l=p.phrases.find(x=>x.id===id);if(!l)throw Error('Phrase introuvable.');return l;};
 const editable=id=>{const l=get(id);if(l.locked)throw Error('Cette phrase est verrouillée.');return l;};
 function commit(fn){const old=clone(p);try{fn();validateProject(p);}catch(e){p=old;throw e;}undo.push(old);if(undo.length>100)undo.shift();redo=[];emit();}
 function emit(){p.updatedAt=new Date().toISOString();onchange(clone(p));}
 function shift(l,delta){for(const key of ['start','end'])if(Number.isFinite(l[key]))l[key]=round(l[key]+delta);l.points=l.points.map(([x,t])=>[x,round(t+delta)]);if((l.start??0)<0||Number.isFinite(p.duration)&&(l.end??0)>p.duration)throw Error('Le décalage dépasse le morceau.');}
 const api={get project(){return clone(p);},get canUndo(){return undo.length>0;},get canRedo(){return redo.length>0;},
  undo(){if(!undo.length)return;redo.push(clone(p));p=undo.pop();emit();},redo(){if(!redo.length)return;undo.push(clone(p));p=redo.pop();emit();},
  track(name,kind='custom'){let id;commit(()=>{id=uid();p.tracks.push({id,name:name.trim()||'Autre voix',kind});});return id;},
  add(text,track=p.tracks[0].id){let id;commit(()=>{id=uid();p.phrases.push({id,track,text:text.trim(),start:null,end:null,points:[],locked:false,status:'todo'});});return id;},
  remove(ids){commit(()=>{ids.forEach(editable);p.phrases=p.phrases.filter(l=>!ids.includes(l.id));});},
  update(id,patch){commit(()=>{const l=editable(id),textChanged='text'in patch&&patch.text!==l.text;const allowed=['text','track','status'];for(const key of allowed)if(key in patch)l[key]=patch[key];if(textChanged){l.points=[];l.status='review';}});},
  lock(id,value){commit(()=>{get(id).locked=!!value;});},
  timing(id,start,end){commit(()=>{const l=editable(id);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||Number.isFinite(p.duration)&&end>p.duration)throw Error('Début et fin invalides.');const old=l.start;l.start=round(start);l.end=round(end);if(l.points.length){const span=l.points.at(-1)[1]-l.points[0][1];l.points=l.points.map(([x,t])=>[x,round(start+(t-old)/span*(end-start))]);}});},
  begin(id,time){commit(()=>{const l=editable(id);if(!Number.isFinite(time)||time<0||Number.isFinite(p.duration)&&time>=p.duration)throw Error('Début hors du morceau.');l.start=round(time);l.end=null;l.points=[];l.status='review';});},
  finish(id,time){commit(()=>{const l=editable(id);if(!Number.isFinite(l.start)||!Number.isFinite(time)||time<=l.start||Number.isFinite(p.duration)&&time>p.duration)throw Error('La fin doit suivre le début de cette phrase.');l.end=round(time);l.points=[[0,l.start],...l.points.filter(([x,t])=>x>0&&x<size(l.text)&&t>l.start&&t<l.end),[size(l.text),l.end]];l.status='review';});},
  point(id,offset,time){commit(()=>{const l=editable(id);if(!Number.isFinite(time)||time<0||offset<0||offset>size(l.text)||Number.isFinite(p.duration)&&time>p.duration)throw Error('Repère hors du morceau.');const kept=l.points.filter(a=>a[0]<offset);if(kept.length&&time<=kept.at(-1)[1])throw Error('Ce mot doit suivre le précédent.');l.points=[...kept,[offset,round(time)]];if(offset===0)l.start=round(time);if(offset===size(l.text))l.end=round(time);l.status='review';});},
  points(id,next){commit(()=>{const l=editable(id);l.points=clone(next);l.start=next[0]?.[1]??null;l.end=next.at(-1)?.[1]??null;const errors=issues({...p,phrases:[l]});if(errors.length)throw Error(errors[0].message);l.status='review';});},
  shift(ids,delta){if(!Number.isFinite(delta))throw Error('Décalage invalide.');commit(()=>ids.forEach(id=>shift(editable(id),delta)));},
  duplicate(ids,delta){let added=[];commit(()=>{for(const id of ids){const copy=clone(get(id));copy.id=uid();copy.locked=false;copy.status='review';shift(copy,delta);p.phrases.push(copy);added.push(copy.id);}});return added;},
  split(id,offset){let added;commit(()=>{const l=editable(id),chars=Array.from(l.text);if(!Number.isInteger(offset)||offset<1||offset>=chars.length||!chars.slice(0,offset).join('').trim()||!chars.slice(offset).join('').trim())throw Error('Choisis une séparation entre deux mots.');let time=null;for(let i=1;i<l.points.length;i++){const a=l.points[i-1],b=l.points[i];if(a[0]<=offset&&b[0]>=offset)time=round(a[1]+(b[1]-a[1])*(offset-a[0])/(b[0]-a[0]));}const right={...clone(l),id:uid(),text:chars.slice(offset).join(''),start:time,status:'review',points:time===null?[]:[[0,time],...l.points.filter(a=>a[0]>offset).map(([x,t])=>[x-offset,t])]};l.text=chars.slice(0,offset).join('');l.end=time;l.status='review';l.points=time===null?[]:[...l.points.filter(a=>a[0]<offset),[offset,time]];p.phrases.splice(p.phrases.indexOf(l)+1,0,right);added=right.id;});return added;},
  merge(first,second){commit(()=>{const a=editable(first),b=editable(second);if(first===second||a.track!==b.track)throw Error('Choisis deux phrases distinctes de la même piste.');if(Number.isFinite(a.end)&&Number.isFinite(b.start)&&b.start<a.end)throw Error('Ces phrases se chevauchent : conserve-les séparées.');a.text+=' '+b.text;a.end=b.end;a.points=[];a.status='review';p.phrases=p.phrases.filter(l=>l.id!==second);});},
  session({position,rate,duration}={}){if(Number.isFinite(position))p.position=position;if([.5,.75,1,2].includes(rate))p.rate=rate;if(Number.isFinite(duration)&&duration>0)p.duration=duration;emit();},
  rename(title){commit(()=>{p.title=title.trim().slice(0,200);});},archive(value){commit(()=>{p.archived=!!value;});},
  export(mode){return flatten(p,mode);},issues(mode){return issues(p,mode);}
 };
 return api;
}
const api={create,fromSync,model,words,size,validateProject,issues,flatten,lrc};
root.AU_STUDIO_MODEL_19=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
