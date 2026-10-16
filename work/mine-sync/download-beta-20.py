from pathlib import Path
import urllib.request,zipfile,hashlib,json,shutil,sys
r=Path(__file__).resolve().parents[2];o=r/'outputs/20v00-2/beta';o.mkdir(parents=True,exist_ok=True)
archive=o/'betatesting-20-0-2-test-1.zip';urllib.request.urlretrieve(sys.argv[1],archive)
if len(sys.argv)>2:assert hashlib.sha256(archive.read_bytes()).hexdigest()==sys.argv[2].replace('sha256:','')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name in ['betatesting-20-0-2-test-1.ipa','livraison.json']:
  member=next(n for n in z.namelist() if n.split('/')[-1]==name)
  with z.open(member) as source,(o/name).open('wb') as dest:shutil.copyfileobj(source,dest)
m=json.loads((o/'livraison.json').read_text());data=(o/m['file']).read_bytes();assert len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256'];print('PRIVATE CI BETA DOWNLOADED AND SHA-256 VERIFIED: '+str(m['bytes'])+' bytes.')
