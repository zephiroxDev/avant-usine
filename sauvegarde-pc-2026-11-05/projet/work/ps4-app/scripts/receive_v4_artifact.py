"""Receive the CI-only V4 artifact without publishing a release."""
from pathlib import Path
import hashlib,json,sys,urllib.request,zipfile
root=Path(__file__).resolve().parents[3]
out=root/'outputs/ps4/v4'
out.mkdir(parents=True,exist_ok=True)
archive=out/'Avant-Usine-PS4-V4.zip'
with urllib.request.urlopen(sys.argv[1],timeout=45) as r:
    archive.write_bytes(r.read())
pkg='Avant-Usine-PS4-0.1.0-test4.pkg'
files=[pkg,'SHA256SUMS.txt','README.md','eboot.bin',
       'build/avant-usine.elf','build/avant-usine.oelf',
       'build/executable-validation.json','build/package-files.json',
       'build/stack-validation.json','build/src/player.su']
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name in files:
        p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(name))
data=(out/pkg).read_bytes()
expected=(out/'SHA256SUMS.txt').read_text().split()
actual=hashlib.sha256(data).hexdigest()
assert expected==[actual,pkg] and data[:4]==b'\x7fCNT'
stack=json.loads((out/'build/stack-validation.json').read_text())
assert stack['maximumPlayerFrame']<=32768 and stack['workerStackRequested']==2097152
manifest=json.loads((out/'build/package-files.json').read_text())
assert manifest['appVersion']=='01.01' and manifest['supportFilesVerified']
print(json.dumps({'pkg':str(out/pkg),'bytes':len(data),'sha256':actual,
                  'maximumPlayerFrame':stack['maximumPlayerFrame'],
                  'physicalConsoleVerified':False},indent=2))
