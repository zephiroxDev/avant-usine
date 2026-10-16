from pathlib import Path
import urllib.request,urllib.error,json,concurrent.futures,time
r=Path(__file__).resolve().parents[2];base=r.parent;endpoint='https://djjfzymrkncwhrocpxjo.supabase.co/functions/v1/release-stage'
token=(base/'promo-cron-token.txt').read_text().strip();manifest=json.loads((r/'outputs/20v00-2/android-blob-manifest.json').read_text())
def request(url,data=None,method=None,headers=None):
 with urllib.request.urlopen(urllib.request.Request(url,data=data,method=method,headers=headers or {}),timeout=120) as response:return response.read()
try:request(endpoint,b'{}','POST',{'Content-Type':'application/json'});raise AssertionError('Unauthenticated staging accepted')
except urllib.error.HTTPError as e:assert e.code==401
signed=json.loads(request(endpoint,json.dumps({'action':'prepare'}).encode(),'POST',{'Authorization':'Bearer '+token,'Content-Type':'application/json'}))['parts']
assert len(signed)==len(manifest['parts'])
previous_path=r/'outputs/20v00-2/android/staged-metadata.json'
if previous_path.exists():
 previous=json.loads(previous_path.read_text())
 if previous['sha256']==manifest['metadata']['sha256']:
  for i,part in enumerate(previous['parts']):
   if part.get('url'):manifest['metadata']['parts'][i]['url']=part['url']
def upload(i):
 row=manifest['blobs'][i];part=signed[i];assert part['path'].endswith('/'+row['name']);data=Path(row['payload']).read_bytes()
 for attempt in range(3):
  try:
   request(part['upload'],data,'PUT',{'Content-Type':'text/plain','Cache-Control':'max-age=3600'})
   with urllib.request.urlopen(urllib.request.Request(part['public'],method='HEAD'),timeout=60) as response:assert int(response.headers['Content-Length'])==len(data)
   return i,part['public']
  except Exception:
   if attempt==2:raise
   time.sleep(1+attempt)
pending=[i for i in range(len(manifest['parts'])) if not manifest['metadata']['parts'][i].get('url')]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for done,(i,url) in enumerate(pool.map(upload,pending),1):manifest['metadata']['parts'][i]['url']=url;print('Android artifact staging: '+str(len(manifest['parts'])-len(pending)+done)+'/'+str(len(manifest['parts']))+' verified',flush=True)
assert all(p.get('url') for p in manifest['metadata']['parts'])
(r/'work/android-app/releases/livraison.json').write_text(json.dumps(manifest['metadata'],indent=2),encoding='utf-8')
(r/'outputs/20v00-2/android/staged-metadata.json').write_text(json.dumps(manifest['metadata'],indent=2),encoding='utf-8')
print('SIGNED ANDROID READY FOR GITHUB RELEASE; staging endpoint rejects unauthenticated requests.',flush=True)

