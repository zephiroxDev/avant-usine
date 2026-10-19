from pathlib import Path
import json,hashlib,urllib.request,sys
from PIL import Image
r=Path(__file__).resolve().parents[1];root=r.parents[1];web=root/'work/github-sync-import'
r.joinpath('vendor').mkdir(parents=True,exist_ok=True);r.joinpath('sce_sys/about').mkdir(parents=True,exist_ok=True)
deps=json.loads((r/'dependencies.json').read_text(encoding='utf-8'))
for item in deps:
 p=r/item['path'];p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():
  with urllib.request.urlopen(item['url'],timeout=90) as response:p.write_bytes(response.read())
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 if item.get('sha256'):assert item['sha256']==digest,item['path']
 else:item['sha256']=digest
(r/'dependencies.json').write_text(json.dumps(deps,indent=2)+'\n',encoding='utf-8')
s=(web/'collection-13v08.js').read_text(encoding='utf-8');catalog=json.JSONDecoder().raw_decode(s[s.index('[',s.index('const COLLECTION')):])[0]
tracks=[];volumes=[]
for album in catalog:
 first=len(tracks)
 for t in album['tracks']:
  src=t.get('src','')
  if not src.startswith('https://archive.org/download/') or not src.lower().split('?')[0].endswith('.mp3'):continue
  tracks.append((len(volumes),str(t.get('title','Sans titre')),src))
 volumes.append((album.get('title','Volume '+str(album['number'])),first,len(tracks)-first))
q=lambda s:json.dumps(s,ensure_ascii=True)
header='#pragma once\nstruct Track {int volume; const char* title; const char* url;};\nstruct Volume {const char* title;int first;int count;};\nstatic const Track tracks[]={\n'+',\n'.join('{'+str(v)+','+q(t)+','+q(u)+'}' for v,t,u in tracks)+'\n};\nstatic const Volume volumes[]={\n'+',\n'.join('{'+q(t)+','+str(first)+','+str(count)+'}' for t,first,count in volumes)+'\n};\n'
(r/'src/catalog.h').write_text(header,encoding='utf-8')
with Image.open(root/'work/desktop-app/build/icon-512.png') as im:im.convert('RGBA').save(r/'sce_sys/icon0.png')
(r/'catalog-metadata.json').write_text(json.dumps({'volumes':len(volumes),'tracks':len(tracks),'snapshotOnly':True,'audioBundled':False},indent=2))
print('Native PS4 sources prepared: '+str(len(tracks))+' tracks, '+str(len(volumes))+' volumes; no browser.')
