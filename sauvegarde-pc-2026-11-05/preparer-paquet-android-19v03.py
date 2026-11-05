from pathlib import Path
import json,hashlib,base64
r=Path(__file__).parent/'projet';src=r/'outputs/application-android';dest=r/'work/android-app/releases';dest.mkdir(exist_ok=True)
m=json.loads((src/'livraison.json').read_text());data=(src/m['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==m['sha256']
m['parts']=[]
for i,start in enumerate(range(0,len(data),4*1024*1024)):
 chunk=data[start:start+4*1024*1024];name=m['file']+f'.b64part{i:03}'
 (dest/name).write_text(base64.b64encode(chunk).decode(),encoding='ascii');m['parts'].append({'file':name,'bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest(),'encoding':'base64'})
(dest/'livraison.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
(r/'outputs/19v03/android-parts.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
print(json.dumps({'parts':len(m['parts']),'bytes':m['bytes']}),flush=True)
