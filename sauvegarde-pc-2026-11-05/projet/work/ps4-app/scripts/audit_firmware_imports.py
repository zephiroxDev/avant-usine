"""Read-only NID availability audit; firmware stays private in local outputs.

This checks symbol availability, not ABI compatibility or successful execution.
No console file is written and no binary is sent to the console.
"""
from pathlib import Path
import ftplib
import json
import struct

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'outputs/ps4/crash-analysis/firmware-imports'
MODULES = ['libkernel', 'libSceVideoOut', 'libSceSysmodule', 'libScePad',
           'libSceUserService', 'libSceAudioOut', 'libSceNet', 'libSceSsl', 'libSceHttp']


def symbols(path):
    b = path.read_bytes()
    assert b[:4] == b'\x7fELF', path
    po = struct.unpack_from('<Q', b, 32)[0]
    pe, pn = struct.unpack_from('<HH', b, 54)
    ph = [struct.unpack_from('<IIQQQQQQ', b, po + i * pe) for i in range(pn)]
    dynamic = next(s for s in ph if s[0] == 2)
    base = next(s for s in ph if s[0] == 0x61000000)[2]
    tags = dict(struct.unpack_from('<QQ', b, p)
                for p in range(dynamic[2], dynamic[2] + dynamic[5], 16))
    strings = base + tags[0x61000035]
    table = base + tags[0x61000039]
    size = tags[0x6100003f]
    result = []
    for p in range(table, table + size, 24):
        n, info, other, index, value, length = struct.unpack_from('<IBBHQQ', b, p)
        end = b.index(b'\0', strings + n)
        name = b[strings + n:end].decode('ascii')
        if name:
            result.append({'name': name, 'defined': index != 0, 'type': info & 15,
                           'binding': info >> 4, 'value': value})
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with ftplib.FTP() as ftp:
        ftp.connect('192.168.1.209', 2121, timeout=6)
        ftp.login()
        for module in MODULES:
            dest = OUT / (module + '.sprx')
            if not dest.exists():
                temp = dest.with_suffix('.part')
                try:
                    with temp.open('wb') as f:
                        ftp.retrbinary('RETR /system/common/lib/' + dest.name, f.write)
                    temp.replace(dest)
                except Exception:
                    temp.unlink(missing_ok=True)
                    raise
            print('Read locally:', module, flush=True)
    exports = {}
    for module in MODULES:
        for s in symbols(OUT / (module + '.sprx')):
            if s['defined']:
                exports.setdefault(s['name'].split('#')[0], []).append(module)
    imports = [s for s in symbols(ROOT / 'work/ps4-app/build/avant-usine.oelf')
               if not s['defined'] and s['type'] == 2]
    missing = [s['name'] for s in imports if s['name'].split('#')[0] not in exports]
    report = {'functionImports': len(imports), 'missingNids': missing,
              'checksLibraryScope': False, 'checksAbi': False,
              'consoleExecutionVerified': False,
              'consoleModified': False}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
