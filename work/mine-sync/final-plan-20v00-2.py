from pathlib import Path
import json,hashlib,base64
r=Path(__file__).resolve().parents[2];w=r/'work/github-sync-import';o=r/'outputs/20v00-2'
paths={'histories-17v01.js':w/'histories-17v01.js','promo-manifest.json':w/'promo-manifest.json','work/beta-builds/index.ts':r/'work/beta-builds/index.ts'}
for name in ['follow-compat-20v00-2.py','test-beta-download-20.cjs','verify-assets-20v00-2.py','verify-public-20v00-2.cjs','verify-windows-20v00-2.py','verify-ios-20v00-2.py','upload-beta-20.py','download-beta-20.py','optimise-beta-service-20.py','upload-20v00-2.py','read-upload-20v00-2.py','stage-android-20v00-2.py','parts-android-20v00-2.py','prepare-stage-20v00-2.py','fix-transport-tests-20.py','final-plan-20v00-2.py']:
 p=r/'work/mine-sync'/name
 if p.exists():paths[p.relative_to(r).as_posix()]=p
rows=[]
for path,p in paths.items():
 b=p.read_bytes();rows.append({'path':path,'sha':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'content':base64.b64encode(b).decode()})
(o/'final-upload-plan.json').write_text(json.dumps(rows),encoding='ascii');print(json.dumps(rows))
