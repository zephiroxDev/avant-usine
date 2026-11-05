"""Convert native 1280x720 BGRX frames to PNG using only Python's standard library."""
from pathlib import Path
import struct,zlib,sys
root=Path(sys.argv[1])
def chunk(kind,data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
for source in root.glob('*.bgra'):
    pixels=source.read_bytes();assert len(pixels)==1280*720*4
    rgb=bytearray(1280*720*3)
    rgb[0::3]=pixels[2::4];rgb[1::3]=pixels[1::4];rgb[2::3]=pixels[0::4]
    stride=1280*3
    rows=b''.join(b'\0'+rgb[y*stride:(y+1)*stride] for y in range(720))
    output=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1280,720,8,2,0,0,0))
    output+=chunk(b'IDAT',zlib.compress(rows,6))+chunk(b'IEND',b'')
    source.with_suffix('.png').write_bytes(output)
    print(source.with_suffix('.png').name)
