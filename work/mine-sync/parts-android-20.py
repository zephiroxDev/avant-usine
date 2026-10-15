from pathlib import Path
import json,hashlib,base64,zipfile
r=Path(__file__).resolve().parents[2];o=r/'outputs/20-0';d=o/'android';m=json.loads((d/'livraison.json').read_text());p=d/m['file'];assert m['version']=='0.3.0' and m['versionCode']==22
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 for name in ['design-20.css','design-20.js','audio-edits-19v06.js','android.css','android.js','index.html','app-17v01.js','histories-17v01.js','promo-manifest.json','immersion-18v05-2.css','backup-18v06.js','local-storage-18v07.js']:
  assert z.read('assets/public/'+name).replace(b'\r\n',b'\n')==(r/'work/android-app/site'/name).read_bytes().replace(b'\r\n',b'\n'), name
target=r/'work/android-app/releases';parts=[];blobs=[]
with p.open('rb') as f:
 i=0
 while raw:=f.read(4194304):
  name=m['file']+'.b64part'+str(i).zfill(3);text=base64.b64encode(raw);(target/name).write_bytes(text);parts.append({'file':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'encoding':'base64'});blobs.append({'sha':hashlib.sha1(b'blob '+str(len(text)).encode()+b'\0'+text).hexdigest(),'payload':str(target/name),'length':len(text),'bytes':len(text),'name':name});i+=1
m['parts']=parts;(target/'livraison.json').write_text(json.dumps(m,indent=2));(o/'android-blob-manifest.json').write_text(json.dumps({'blobs':blobs,'parts':parts,'metadata':m}),encoding='ascii');print(json.dumps({'parts':len(parts),'bytes':m['bytes'],'sha256':m['sha256'],'embeddedFilesVerified':True}))
