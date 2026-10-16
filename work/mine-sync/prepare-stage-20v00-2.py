from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];m=json.loads((r/'outputs/20v00-2/android-blob-manifest.json').read_text());count=len(m['parts'])
p=r/'work/release-stage/index.ts';s=p.read_text(encoding='utf-8').replace('0.3.1','0.3.2').replace('length:35','length:'+str(count));p.write_text(s,encoding='utf-8')
p=r/'work/mine-sync/stage-android-20v00-2.py';s=p.read_text(encoding='utf-8').replace("assert len(signed)==len(manifest['parts'])==35","assert len(signed)==len(manifest['parts'])").replace("+'/35 verified'","+'/'+str(len(manifest['parts']))+' verified'");p.write_text(s,encoding='utf-8')
print('Exact signed Android parts prepared: '+str(count))
