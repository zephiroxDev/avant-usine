(function(){
'use strict';
let config={},handlers={},dialog=null,body=null,notice=null;
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=E('button',text,'button secondary');b.type='button';b.onclick=()=>Promise.resolve().then(fn).catch(e=>{if(notice)notice.textContent=e.message;});return b;};
const owner=()=>config.getUser?.()?.id||'device';
const prefix=()=> 'au-project-19:'+owner()+':';
function localList(){const list=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix()))try{const item=JSON.parse(localStorage.getItem(key));window.AU_STUDIO_MODEL_19.validateProject(item.project);list.push(item);}catch{}}return list;}
function localSave(item){localStorage.setItem(prefix()+item.project.id,JSON.stringify(item));}
async function save(project,revision=null,expectedOwner=owner()){
 const who=owner(),item={project,revision,pending:true};if(who!==expectedOwner){localStorage.setItem('au-project-19:'+expectedOwner+':'+project.id,JSON.stringify(item));throw Error('Le compte a changé : ce brouillon reste lié à son propriétaire sur cet appareil.');}localSave(item);
 const client=config.getClient?.();if(who==='device'||!client)return {revision,pending:true,device:true};
 const {data,error}=await client.rpc('au_projects_19',{p_action:'save',p:{id:project.id,revision,project}});
 if(owner()!==who)throw Error('Le compte a changé. Le brouillon reste sur cet appareil pour son propriétaire.');
 if(error)throw Error(error.message||'Le brouillon est enregistré sur cet appareil, mais pas encore synchronisé.');
 item.revision=data.revision;item.pending=false;localSave(item);return item;
}
async function list(){
 const who=owner(),local=localList(),client=config.getClient?.();if(who==='device'||!client)return local;
 const {data,error}=await client.from('au_projects_19').select('id,project,revision,updated_at').order('updated_at',{ascending:false});
 if(owner()!==who)throw Error('Le compte a changé.');
 if(error)throw Error('La liste du compte est indisponible. Tes brouillons sur cet appareil restent accessibles.');
 const remoteIds=new Set((data||[]).map(r=>r.id)),map=new Map(local.filter(x=>x.pending||remoteIds.has(x.project.id)).map(x=>[x.project.id,x]));for(const cached of local)if(!cached.pending&&!remoteIds.has(cached.project.id))localStorage.removeItem(prefix()+cached.project.id);for(const row of data||[]){const cached=map.get(row.id);if(!cached?.pending){const item={project:row.project,revision:row.revision,pending:false};localSave(item);map.set(row.id,item);}else if(cached.revision!==row.revision)cached.conflict={project:row.project,revision:row.revision,pending:false};}
 return [...map.values()].sort((a,b)=>b.project.updatedAt.localeCompare(a.project.updatedAt));
}
async function remove(item){
 const who=owner(),client=config.getClient?.();if(who!=='device'&&client){const {error}=await client.rpc('au_projects_19',{p_action:'delete',p:{id:item.project.id,revision:item.revision}});if(error)throw Error(error.message);if(owner()!==who)throw Error('Le compte a changé.');}
 localStorage.removeItem(prefix()+item.project.id);
}
function ensure(){if(dialog)return;dialog=E('dialog',null,'au-dialog major-dialog au-projects-19');const head=E('div',null,'major-dialog-head');head.append(E('h2','Mes projets en cours'),button('Fermer',()=>dialog.close()));body=E('div',null,'major-dialog-body');notice=E('p',null,'au-note');notice.setAttribute('role','status');dialog.append(head,body,notice);document.body.append(dialog);}
async function open(){window.AU_MAINTENANCE_19?.assert('projects');ensure();body.replaceChildren(E('p','Chargement des projets…'));notice.textContent='';if(!dialog.open)dialog.showModal();let items;try{items=await list();}catch(e){notice.textContent=e.message;items=localList();}if(!dialog.open)return;render(items,false);}
function render(items,archived){
 body.replaceChildren();const tabs=E('div',null,'actions');tabs.append(button(archived?'Voir les projets en cours':'Voir les archives',()=>render(items,!archived)));body.append(tabs);
 const visible=items.filter(x=>!!x.project.archived===archived);if(!visible.length)body.append(E('p',archived?'Aucun projet archivé.':'Tes ateliers commencés apparaîtront ici automatiquement.'));
 for(const item of visible){const p=item.project,card=E('article',null,'major-card');const done=p.phrases.filter(x=>x.status==='done').length;card.append(E('h3',p.title||'Projet sans titre'),E('p',done+' / '+p.phrases.length+' phrases terminées · '+new Date(p.updatedAt).toLocaleString('fr-FR')),E('p',p.local?'Audio local : sa disponibilité dépend de cet appareil.':'Morceau du catalogue'));
 for(const track of p.tracks){const lines=p.phrases.filter(l=>l.track===track.id);card.append(E('p',track.name+' : '+lines.filter(l=>l.status==='done').length+'/'+lines.length+' terminées, '+lines.filter(l=>l.status==='review').length+' à revoir','au-note'));}
 if(item.pending)card.append(E('p','Brouillon conservé sur cet appareil ; synchronisation du compte en attente.','au-note'));
 if(item.conflict){card.append(E('p','Une autre version existe sur ton compte. Choisis celle à conserver.'));card.append(button('Reprendre la version du compte',()=>{localSave(item.conflict);return open();}),button('Conserver celle de cet appareil',async()=>{await save(p,item.conflict.revision);await open();}));}
 const actions=E('div',null,'actions');actions.append(button('Reprendre',async()=>{window.AU_MAINTENANCE_19?.assert('sync_studio');const fn=handlers[p.local?'local':'catalog'];if(!fn)throw Error('Cet atelier n’est pas disponible ici.');dialog.close();await fn(item);}),button('Renommer',()=>rename(item)),button(p.archived?'Désarchiver':'Archiver',async()=>{await save({...p,archived:!p.archived,updatedAt:new Date().toISOString()},item.revision);await open();}),button('Supprimer',async()=>{if(!confirm('Supprimer ce projet ? Les paroles publiées et les fichiers audio seront conservés.'))return;await remove(item);await open();}));card.append(actions);body.append(card);
 }
}
function rename(item){const d=E('dialog',null,'au-dialog'),label=E('label','Nom du projet'),input=E('input');input.value=item.project.title;input.maxLength=200;label.append(input);d.append(label,button('Enregistrer',async()=>{await save({...item.project,title:input.value.trim(),updatedAt:new Date().toISOString()},item.revision);d.close();d.remove();await open();}),button('Annuler',()=>{d.close();d.remove();}));document.body.append(d);d.showModal();input.focus();}
function configure(next){config=next;const parent=document.getElementById('accountMember');if(parent&&!document.getElementById('projects19Entry')){const b=button('Mes projets en cours',open);b.id='projects19Entry';parent.append(b);}window.addEventListener('au:account-changed',()=>{dialog?.close();body?.replaceChildren();});}
window.AU_PROJECTS_19={configure,save,list,localList,owner,changed(){dialog?.close();body?.replaceChildren();},register:(kind,fn)=>{handlers[kind]=fn;},open};
})();
