"""Fetch the pinned MIT native UI engine; no browser runtime or system binaries."""
from pathlib import Path
import hashlib,tarfile,urllib.request
root=Path(__file__).resolve().parents[1]
archive=root/'reference/lvgl-9.3.0.tar.gz'
archive.parent.mkdir(parents=True,exist_ok=True)
expected='4933becfd3603b29158a5d04138139582836ef2bc17beb6c39dccda9cb0d32e7'
if not archive.exists():
    request=urllib.request.Request('https://github.com/lvgl/lvgl/archive/refs/tags/v9.3.0.tar.gz',headers={'User-Agent':'AvantUsine-port'})
    temporary=archive.with_suffix('.download')
    with urllib.request.urlopen(request,timeout=120) as response,temporary.open('wb') as output:
        while chunk:=response.read(1024*1024):output.write(chunk)
    if hashlib.sha256(temporary.read_bytes()).hexdigest()!=expected:
        temporary.unlink();raise SystemExit('LVGL digest mismatch')
    temporary.replace(archive)
assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected
destination=root/'reference/lvgl'
with tarfile.open(archive) as source:
    for member in source.getmembers():
        parts=Path(member.name).parts[1:]
        if not parts or not member.isfile():continue
        if '..' in parts:raise ValueError('Unsafe archive member')
        if parts[0]!='src' and '/'.join(parts) not in ('lvgl.h','lv_version.h','LICENCE.txt'):continue
        target=destination.joinpath(*parts);target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(source.extractfile(member).read())
print('LVGL 9.3.0 verified and extracted.')
