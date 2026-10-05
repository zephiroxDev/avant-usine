const path=require('node:path');
function resolveLocalAsset(url,root){
 let parsed;try{parsed=new URL(url);}catch{return null;}
 if(parsed.protocol!=='avantusine:'||parsed.hostname!=='local'||parsed.username||parsed.password||parsed.port)return null;
 let name;try{name=decodeURIComponent(parsed.pathname);}catch{return null;}
 if(name.includes('\\')||name.includes('\0'))return null;
 const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 const relative=path.relative(root,target);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))return null;
 return target;
}
module.exports={resolveLocalAsset};
