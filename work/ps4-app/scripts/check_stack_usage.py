"""Reject a return of the oversized worker stack frames found in test3.

Compiler reports measure individual frames, not the complete call graph.
The native workers additionally request and check a 2 MiB stack at creation.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
report=root/'build/src/player.su'
assert report.is_file(), 'Missing compiler stack-usage report'
frames=[]
for line in report.read_text().splitlines():
    name,size,kind=line.rsplit('\t',2)
    assert kind=='static', 'Unbounded dynamic worker stack frame: '+line
    frames.append({'function':name,'bytes':int(size)})
assert frames and any(any(n in f['function'] for n in ['loadLoop','loadEntry']) for f in frames)
maximum=max(f['bytes'] for f in frames)
assert maximum<=32768, 'Worker frame above 32 KiB: '+str(maximum)
result={'maximumPlayerFrame':maximum,'perFrameBudget':32768,
        'workerStackRequested':2*1024*1024,'frames':frames,
        'checksFullCallGraph':False,'consoleVerified':False}
(root/'build/stack-validation.json').write_text(json.dumps(result,indent=2))
update_frames=[]
for report in sorted((root/'build/src').glob('update_*.su')):
    for line in report.read_text().splitlines():
        name,size,kind=line.rsplit('\t',2)
        assert kind=='static' and int(size)<=32768, 'Oversized or dynamic updater stack frame: '+line
        update_frames.append({'unit':report.stem,'function':name,'bytes':int(size)})
if update_frames:
    (root/'build/update-stack-validation.json').write_text(json.dumps({'frames':update_frames,'workerStackRequested':2*1024*1024,'checksFullCallGraph':False},indent=2))
print('Worker stack-frame check passed:',maximum,'bytes; native stack requested: 2 MiB')
