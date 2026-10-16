from pathlib import Path
import json,base64,sys
r=Path(__file__).resolve().parents[2];plan=json.loads((r/'outputs/20v00-2/upload-plan.json').read_text())
if sys.argv[1]=='small':
 rows={}
 for i,p in enumerate(plan):
  if not p['binary'] and p['bytes']<60000:rows[p['sha']]={'path':p['path'],'content':base64.b64encode(Path(p['local']).read_bytes()).decode()}
 print(json.dumps(rows,ensure_ascii=True))
else:
 p=plan[int(sys.argv[1])];print(base64.b64encode(Path(p['local']).read_bytes()).decode())
