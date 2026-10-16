from pathlib import Path
import json,hashlib,base64,sys
r=Path(__file__).resolve().parents[2];o=r/'outputs/20v00-2';w=r/'work/github-sync-import'
if len(sys.argv)>1:
 plan=json.loads((o/'upload-plan.json').read_text(encoding='utf-8'));p=Path(plan[int(sys.argv[1])]['local']);data=p.read_bytes();offset=int(sys.argv[2]);size=int(sys.argv[3]);print(base64.b64encode(data[offset:offset+size]).decode());raise SystemExit
candidates={}
def add(rel,local=None):
 p=r/(local or rel)
 if p.exists():candidates[rel]=p
for name in ['app-17v01.js','beta-20v00-2.js','index.html','sw.js','design-20.js','immersion-18v05-2.js','histories-17v01.js','promo-manifest.json','promo-20v00-2.png','promo-20v00-2-vivant.png','promo-20v00-2-anime.mp4']:
 add('work/github-sync-import/'+name)
 if name not in ['promo-manifest.json','histories-17v01.js']:add(name,'work/github-sync-import/'+name)
# Keep application histories and promotion pending until the actual packages are public.
h=json.loads((w/'histories-17v01.js').read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
for k in ['desktop-pc','android','ios']:h[k]=[v for v in h[k] if not v[0].startswith('20.0.2 ·')]
(o/'web-histories.js').write_text('window.AU_PLATFORM_HISTORIES='+json.dumps(h,ensure_ascii=False,indent=2)+';\n',encoding='utf-8');add('histories-17v01.js','outputs/20v00-2/web-histories.js')
for platform in ['desktop','android','ios']:
 for name in ['release.json','package.json','package-lock.json','patch-notes.json','NOTES-20.0.2.md','scripts/prepare-site.cjs']:add(f'work/{platform}-app/'+name)
add('work/android-app/NOTES-0.3.2.md')
for name in ['native/IOSUpdates.swift','scripts/configure-beta-20.py']:add('work/ios-app/'+name)
add('.github/workflows/ios-beta-20v00-2.yml');add('work/beta-builds/index.ts')
for name in ['prepare-20v00-2.py','release-20v00-2.py','beta-download-20v00-2.py','test-20v00-2.cjs','test-design-20v00-2.cjs','beta-20v00-2.sql','promo-20v00-2.py','render-promo-20v00-2.cjs','animate-promo-20v00-2.py','build-android-20v00-2.py','prepare-beta-workflow-20.py','check-beta-service-20.py']:add('work/mine-sync/'+name)
plan=[]
for key,p in candidates.items():
 data=p.read_bytes();sha=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();plan.append({'path':key,'local':str(p),'bytes':len(data),'sha':sha,'binary':p.suffix in ['.png','.mp4']})
(o/'upload-plan.json').write_text(json.dumps(plan),encoding='utf-8');print(json.dumps(plan))
