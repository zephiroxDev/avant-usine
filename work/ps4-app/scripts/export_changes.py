"""Emit an explicit file whitelist for GitHub blob uploads; never include keys/caches."""
from pathlib import Path
import sys,json,base64
root=Path(__file__).resolve().parents[3]
files=[]
for name in sys.argv[1:]:
 p=(root/name).resolve()
 assert p.is_relative_to(root/'work/ps4-app') or p in (root/'.github/workflows/ps4-native-test.yml',root/'.github/workflows/ps4-native-ui.yml')
 assert p.is_file()
 files.append({'path':p.relative_to(root).as_posix(),'content':base64.b64encode(p.read_bytes()).decode()})
print(json.dumps(files))
