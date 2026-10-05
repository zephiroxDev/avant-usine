from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[1];workspace=root.parents[1]
app=workspace/'outputs/windows-update-smoke-project';app.mkdir(exist_ok=True)
profile=workspace/'outputs/windows-update-smoke-profile';profile.mkdir(exist_ok=True)
assets=workspace/'outputs/application-windows-0.2.0/update-assets'
(app/'package.json').write_text(json.dumps({'name':'avant-usine-update-test','version':'0.2.0','description':'Simulation locale de mise à jour','author':'zephiroxDev','main':'test.cjs','build':{'appId':'dev.zephirox.avantusine.test','productName':'Avant l’Usine — test','electronVersion':'44.5.1','files':['test.cjs','package.json'],'directories':{'output':str(workspace/'outputs/windows-update-smoke-packaged')},'win':{'icon':str(root/'build/icon.ico'),'signExecutable':False}}}),encoding='utf-8')
code="""const electron=require('electron'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
electron.app.setPath('userData',PROFILE);
const original=electron.net.fetch.bind(electron.net);
const manifest=JSON.parse(fs.readFileSync(path.join(ASSETS,'Avant-Usine-Mise-a-jour-0.2.0.json'),'utf8'));
manifest.version='0.2.1';for(const f of manifest.files)f.url=f.url.replace('/v0.2.0/','/v0.2.1/');
const bytes=Buffer.from(JSON.stringify(manifest));
electron.net.fetch=async function(url,options){
 if(String(url).startsWith('https://api.github.com/repos/zephiroxDev/avant-usine/releases'))return Response.json([{tag_name:'v0.2.1',assets:[{name:'Avant-Usine-Mise-a-jour-0.2.1.json',state:'uploaded',digest:'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex'),browser_download_url:'https://github.com/zephiroxDev/avant-usine/releases/download/v0.2.1/Avant-Usine-Mise-a-jour-0.2.1.json'}]}]);
 if(String(url).endsWith('/Avant-Usine-Mise-a-jour-0.2.1.json'))return new Response(bytes);
 if(String(url).startsWith('https://github.com/zephiroxDev/avant-usine/releases/download/v0.2.1/au-'))return new Response(fs.readFileSync(path.join(ASSETS,path.basename(url))));
 return original(url,options);
};
require(BOOTSTRAP);
""".replace('PROFILE',json.dumps(str(profile))).replace('ASSETS',json.dumps(str(assets))).replace('BOOTSTRAP',json.dumps(str(root/'bootstrap.cjs')))
(app/'test.cjs').write_text(code,encoding='utf-8')
print('Test isolé préparé : simulation locale 0.2.0 vers 0.2.1, aucun compte réel utilisé.')
