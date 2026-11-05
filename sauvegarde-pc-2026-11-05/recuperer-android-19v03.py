from pathlib import Path
import sys,urllib.request,hashlib,zipfile,json
r=Path(__file__).parent/'projet/outputs/19v03';p=r/'android-unsigned.zip'
with urllib.request.urlopen(sys.argv[1],timeout=180) as response,p.open('wb') as f:
 while chunk:=response.read(1024*1024):f.write(chunk)
assert hashlib.file_digest(p.open('rb'),'sha256').hexdigest()=='960176a41ed3a5478d18f5c132aa4fe1f41f1d8787700307b1b813b8e1206175'
d=r/'android-unsigned';d.mkdir(exist_ok=True)
with zipfile.ZipFile(p) as z:
 for name in ['app-release-unsigned.apk','build.json']:
  candidates=[n for n in z.namelist() if Path(n).name==name];assert len(candidates)==1
  (d/name).write_bytes(z.read(candidates[0]))
m=json.loads((d/'build.json').read_text());assert m['sourceCommit']=='a935434bb9980e7e35a3a0a381e46de3dd56def0'
assert (d/'app-release-unsigned.apk').stat().st_size==m['bytes']
print('APK récupéré : empreinte et sources confirmées.',flush=True)
