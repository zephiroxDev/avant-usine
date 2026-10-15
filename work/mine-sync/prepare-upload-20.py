from pathlib import Path
import hashlib,json
r=Path(__file__).resolve().parents[2];out=r/'outputs/20-0';remote=json.loads((out/'remote-tree.json').read_text())['tree'];known={x['path']:x['sha'] for x in remote if x['type']=='blob'};candidates={}
def add(p,key):
 if p.is_file():candidates[key]=p
for platform in ['desktop','android','ios']:
 for suffix in ['release.json','package.json','package-lock.json','patch-notes.json','scripts/prepare-site.cjs','NOTES-20.0.md']:
  key=f'work/{platform}-app/{suffix}';add(r/key,key)
add(r/'work/ios-app/web/ios.css','work/ios-app/web/ios.css')
for name in ['worker.mjs','worker.test.mjs']:add(r/'work/promo-auto'/name,'work/promo-auto/'+name)
web=r/'work/github-sync-import'
for p in web.iterdir():
 if p.is_file() and (('work/github-sync-import/'+p.name) in known or p.name in ['design-20.css','design-20.js','audio-editor-20.js'] or p.name.startswith('promo-20-0')):
  add(p,'work/github-sync-import/'+p.name)
  if p.name!='promo-manifest.json' and (p.name in known or p.name in ['design-20.css','design-20.js'] or p.name.startswith('promo-20-0')):add(p,p.name)
for rel in ['work/desktop-app/NOTES-20.0.md','work/android-app/NOTES-0.3.0.md','work/ios-app/NOTES-20.0.md']:
 add(r/rel,rel)
for p in (r/'work/mine-sync').glob('*20*'):
 if p.suffix in ['.py','.cjs']:add(p,p.relative_to(r).as_posix())
changes=[]
for key,p in sorted(candidates.items()):
 data=p.read_bytes();sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 if known.get(key)==sha:continue
 normalized=data.replace(b'\r\n',b'\n');lfsha=hashlib.sha1(b'blob '+str(len(normalized)).encode()+b'\0'+normalized).hexdigest()
 if known.get(key)==lfsha:continue
 if any(x in key.lower() for x in ['signing.json','.jks','api-key','cron-token']):raise RuntimeError('Credential path rejected')
 try:content=data.decode('utf-8');encoding='utf-8'
 except UnicodeDecodeError:content=None;encoding='base64'
 changes.append({'path':key,'local':str(p),'bytes':len(data),'sha':sha,'encoding':encoding})
(out/'upload-plan.json').write_text(json.dumps(changes,indent=2),encoding='utf-8')
print(json.dumps([{'path':x['path'],'bytes':x['bytes'],'encoding':x['encoding']} for x in changes],indent=2))
