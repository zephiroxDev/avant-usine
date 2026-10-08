from pathlib import Path
import hashlib,json,subprocess,urllib.request
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'release.json').read_text())['version']
req=urllib.request.Request('https://api.github.com/repos/zephiroxDev/avant-usine/releases/tags/ios-v'+version,headers={'Accept':'application/vnd.github+json','User-Agent':'AvantUsine-verification'})
release=json.load(urllib.request.urlopen(req,timeout=45))
assert not release['draft']
ipa=next(a for a in release['assets'] if a['name']=='Avant-Usine-iOS-'+version+'-non-signe.ipa')
manifest=next(a for a in release['assets'] if a['name']=='livraison.json')
metadata=json.load(urllib.request.urlopen(manifest['browser_download_url'],timeout=45))
out=root/'build';out.mkdir(exist_ok=True)
target=out/ipa['name']
with urllib.request.urlopen(ipa['browser_download_url'],timeout=90) as response,target.open('wb') as file:
    while block:=response.read(1024*1024):file.write(block)
assert target.stat().st_size==ipa['size']==metadata['bytes']
assert hashlib.sha256(target.read_bytes()).hexdigest()==metadata['sha256']==ipa['digest'].removeprefix('sha256:')
subprocess.run([__import__('sys').executable,'scripts/verify-ipa.py',str(target)],cwd=root,check=True)
(out/'public-release.json').write_text(json.dumps(release,indent=2))
print('PUBLIC DOWNLOAD VERIFIED '+str(target))
