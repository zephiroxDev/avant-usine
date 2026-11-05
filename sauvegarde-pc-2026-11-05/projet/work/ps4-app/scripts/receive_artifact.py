from pathlib import Path
import urllib.request,sys,zipfile,hashlib,json
root=Path(__file__).resolve().parents[3]/'outputs/ps4'
root.mkdir(parents=True,exist_ok=True)
archive=root/'Avant-Usine-PS4-test.zip'
with urllib.request.urlopen(sys.argv[1],timeout=90) as response:archive.write_bytes(response.read())
with zipfile.ZipFile(archive) as z:
 for name in ['Avant-Usine-PS4-0.1.0-test1.pkg','SHA256SUMS.txt','README.md']:
  data=z.read(name);(root/name).write_bytes(data)
p=root/'Avant-Usine-PS4-0.1.0-test1.pkg'
actual=hashlib.sha256(p.read_bytes()).hexdigest()
assert actual==(root/'SHA256SUMS.txt').read_text().split()[0]
assert p.read_bytes()[:4]==b'\x7fCNT'
print(json.dumps({'pkg':str(p),'bytes':p.stat().st_size,'sha256':actual}))
