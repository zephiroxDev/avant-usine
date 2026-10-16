from pathlib import Path
import json,urllib.request,hashlib
r=Path(__file__).resolve().parents[2];o=r/'outputs/20v00-2'
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Avant-usine-verification'}),timeout=60) as response:return response.read()
release=json.loads(get('https://api.github.com/repos/zephiroxDev/avant-usine/releases/tags/v0.6.2'));assert release['draft'] is False
manifest=json.loads(get('https://github.com/zephiroxDev/avant-usine/releases/download/v0.6.2/Avant-Usine-Mise-a-jour-0.6.2.json'));assert manifest['version']=='0.6.2'
assets={a['name']:a for a in release['assets']}
for item in manifest['files']:
 asset=assets[item['url'].split('/')[-1]];assert asset['size']==item['bytes'] and asset['digest']=='sha256:'+item['sha256'],item['path']
checks=[]
for name in ['app-17v01.js','beta-20v00-2.js','design-20.js','immersion-18v05-2.js','index.html']:
 item=next(f for f in manifest['files'] if f['path']=='site/'+name);data=get(item['url']);assert hashlib.sha256(data).hexdigest()==item['sha256'];assert data.replace(b'\r\n',b'\n')==(r/'work/desktop-app/site'/name).read_bytes().replace(b'\r\n',b'\n'),name;checks.append(name)
(o/'windows-verification.json').write_text(json.dumps({'version':'0.6.2','manifestFiles':len(manifest['files']),'assets':len(assets),'changedFilesChecked':checks},indent=2));(o/'windows-update-manifest.json').write_text(json.dumps(manifest,indent=2));print('WINDOWS 0.6.2 VERIFIED: '+str(len(manifest['files']))+' update assets and all five changed product files.')
