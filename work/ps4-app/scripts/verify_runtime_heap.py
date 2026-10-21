"""Fail packaging when the allocator lock activation is absent from the real ELF.

Pure ELF64/x86 parsing, independent of source preprocessor and external packages.
Checks the actual RIP-relative atomic compare-exchange target, not a byte string
anywhere in the file. This is a build check, not physical-console validation.
"""
from pathlib import Path
import struct,json,sys

def verify(path):
    data=Path(path).read_bytes();assert data[:7]==b'\x7fELF\x02\x01\x01'
    offset=struct.unpack_from('<Q',data,40)[0];size,count=struct.unpack_from('<HH',data,58)
    sections=[struct.unpack_from('<IIQQQQIIQQ',data,offset+i*size) for i in range(count)]
    symbols=[]
    for section in sections:
        if section[1]!=2:continue
        strings=sections[section[6]];names=data[strings[4]:strings[4]+strings[5]]
        for pos in range(section[4],section[4]+section[5],section[9]):
            n,info,other,index,value,length=struct.unpack_from('<IBBHQQ',data,pos)
            if index:symbols.append((names[n:names.find(b'\0',n)].decode(),value,length,index))
    libc=next(s for s in symbols if s[0]=='__libc');assert libc[2]==112,'Pinned musl layout changed'
    start=next(s for s in symbols if s[0].startswith('_ZN13native_thread5start'))
    section=sections[start[3]];position=section[4]+start[1]-section[3];code=data[position:position+start[2]]
    matches=[]
    for i in range(min(len(code)-7,160)):
        if code[i:i+3]!=b'\xf0\x0f\xb1' or code[i+3]&0xc7!=5:continue
        target=start[1]+i+8+struct.unpack_from('<i',code,i+4)[0]
        if target==libc[1]+12:matches.append(start[1]+i)
    assert matches,'Allocator locking activation is absent from native_thread::start; refusing to package'
    return {'elf':Path(path).name,'libcBytes':libc[2],'flagOffset':12,'atomicActivationAddresses':matches,'compiledActivationVerified':True,'consoleValidated':False}

if __name__=='__main__':
    path=Path(sys.argv[1]);report=verify(path);path.with_name('allocator-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
