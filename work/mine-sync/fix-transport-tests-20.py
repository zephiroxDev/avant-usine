from pathlib import Path
r=Path(__file__).resolve().parents[2]
p=r/'work/release-stage/index.ts';s=p.read_text(encoding='utf-8').replace("'Content-Type':'application/json'},body:JSON.stringify(body)","'Content-Type':'application/json','x-upsert':'true'},body:JSON.stringify(body)");p.write_text(s,encoding='utf-8')
p=r/'work/mine-sync/test-beta-download-20.cjs';s=p.read_text(encoding='utf-8').replace("'application/javascript'","'application/javascript; charset=utf-8'").replace("res.end('<div id=accountMember>","res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta charset=utf-8><div id=accountMember>");p.write_text(s,encoding='utf-8')
print('Explicit UTF-8 in browser fixture; resumable staging permits its exact existing object paths.')
