"""Upload the verified CI beta to private storage; never create a public release."""
from pathlib import Path
import json,hashlib,urllib.request,concurrent.futures,sys,zipfile
r=Path(__file__).resolve().parents[2];out=r/'outputs/20v00-2/beta';out.mkdir(parents=True,exist_ok=True)
ipa=Path(sys.argv[1]);assert ipa.name=='betatesting-20-0-2-test-1.ipa'
with zipfile.ZipFile(ipa) as z:
 assert z.testzip() is None
 import plistlib
 app=plistlib.loads(z.read('Payload/App.app/Info.plist'));widget=plistlib.loads(z.read('Payload/App.app/PlugIns/LyricsIsland.appex/Info.plist'))
 assert app['CFBundleIdentifier']=='dev.zephirox.avantusine.ios' and app['CFBundleVersion']=='30'
 assert app['CFBundleDisplayName']=='betatesting 20.0.2'
 assert widget['CFBundleIdentifier']=='dev.zephirox.avantusine.ios.lyrics.betatest1' and widget['CFBundleVersion']=='30'
data=ipa.read_bytes();parts=[]
for i,start in enumerate(range(0,len(data),4194304)):
 chunk=data[start:start+4194304];parts.append({'path':ipa.name+'/part-'+str(i).zfill(3),'bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()})
m={'patch':'20.0.2','platform':'ios','version':'2.0.2','build_number':30,'object_path':ipa.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'parts':parts,'notes':'Test 1 de la Dynamic Island : nouvelle identité de l’extension, repère T1 et contrôle de sa présence après signature. Fonctionnement à confirmer sur iPhone réel. Conserver les extensions lors de l’installation ; faire une sauvegarde avant l’essai.'}
token=(r.parent/'promo-cron-token.txt').read_text().strip();endpoint='https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/beta-builds'
def call(body):
 req=urllib.request.Request(endpoint,data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=180) as response:return json.load(response)
prepared=call({'action':'prepare','metadata':m});assert len(prepared['uploads'])==len(parts)
def upload(i):
 item=prepared['uploads'][i];assert item['path']==parts[i]['path'];chunk=data[i*4194304:(i+1)*4194304]
 req=urllib.request.Request(item['url'],data=chunk,method='PUT',headers={'Content-Type':'application/octet-stream'})
 with urllib.request.urlopen(req,timeout=120) as response:assert response.status in [200,201]
 return i
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for n,i in enumerate(pool.map(upload,range(len(parts))),1):print('Private beta upload '+str(n)+'/'+str(len(parts)),flush=True)
result=call({'action':'complete','id':prepared['id']});assert result['ready'] is True and result['sha256']==m['sha256'] and result['bytes']==len(data)
(out/'private-delivery.json').write_text(json.dumps(result|{'metadata':m},ensure_ascii=False,indent=2),encoding='utf-8');print('VERIFIED PRIVATE BETA READY IN CREATOR ACCOUNT; no public update created.',flush=True)
