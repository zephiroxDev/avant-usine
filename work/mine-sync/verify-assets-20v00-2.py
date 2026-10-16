from pathlib import Path
import urllib.request,json,hashlib
r=Path(__file__).resolve().parents[2];web=r/'work/github-sync-import';report=[]
for name in ['app-17v01.js','beta-20v00-2.js','index.html','sw.js','design-20.js','immersion-18v05-2.js']:
 with urllib.request.urlopen('https://zephiroxdev.github.io/avant-usine/'+name+'?verify=20-0-2',timeout=30) as response:body=response.read()
 expected=(web/name).read_bytes();assert body==expected,name+' is not the prepared version';report.append({'file':name,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
(r/'outputs/20v00-2/public-assets-verification.json').write_text(json.dumps(report,indent=2));print('LIVE 20.0.2: all six product files match the prepared sources.')
