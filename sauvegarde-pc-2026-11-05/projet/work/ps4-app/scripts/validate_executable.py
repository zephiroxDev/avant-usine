"""Structural checks beyond a successful compiler exit (not a console emulator)."""
from pathlib import Path
import struct,json,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
b=(root/'build/avant-usine.oelf').read_bytes()
assert b[:4]==b'\x7fELF' and b[4:7]==b'\x02\x01\x01'
kind,machine=struct.unpack_from('<HH',b,16)
assert kind==0xfe10 and machine==62, 'Not a PS4 x86_64 executable'
offset=struct.unpack_from('<Q',b,32)[0];size,count=struct.unpack_from('<HH',b,54)
assert size==56 and 0<count<32
segments=[]
for i in range(count):
 t,flags,off,va,pa,fs,ms,align=struct.unpack_from('<IIQQQQQQ',b,offset+i*size)
 assert off+fs<=len(b), 'Segment outside executable'
 segments.append(dict(type=t,flags=flags,offset=off,address=va,filesize=fs,memorysize=ms,alignment=align))
mapped=[s for s in segments if s['type'] in (1,0x61000010)]
for s in mapped:
 assert s['offset']%0x4000==0 and s['address']%0x4000==0
 assert s['filesize']<=s['memorysize']
for a,c in zip(sorted(mapped,key=lambda s:s['address']),sorted(mapped,key=lambda s:s['address'])[1:]):
 assert a['address']+a['memorysize']<=c['address'], 'Overlapping load segments'
params=[s for s in segments if s['type']==0x61000001]
assert len(params)==1 and params[0]['filesize']>=16
p=params[0];assert b[p['offset']+8:p['offset']+12]==b'ORBI', 'Invalid process parameters'
assert any(s['address']<=p['address'] and p['address']+p['memorysize']<=s['address']+s['memorysize'] for s in mapped)
entry=struct.unpack_from('<Q',b,24)[0]
assert any(s['flags']&1 and s['address']<=entry<s['address']+s['memorysize'] for s in mapped)
self=(root/'eboot.bin').read_bytes()
assert self[:4]==b'O\x15=\x1d' and len(self)>0x1000
(root/'build/executable-validation.json').write_text(json.dumps({'type':kind,'entry':entry,'segments':segments,'consoleTestRequired':True},indent=2))
print('SELF/OELF structure verified; physical console validation still required.')
