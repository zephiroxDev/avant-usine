"""Stable PS4 release metadata, generated from the actual packaged file."""
from pathlib import Path
import hashlib,json,re,sys
def generate(release,package):
    version=release['version']
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?',version):return None
    development=version.startswith('0.')
    if not development and not release.get('deviceTested'):raise ValueError('Stable PS4 releases require recorded physical-console validation')
    assert release['platform']=='ps4' and release['native'] is True and release['browser'] is False
    assert release['titleId']=='ALUS00001' and release['contentId']=='IV0000-ALUS00001_00-AVANTUSINEPS4001'
    assert re.fullmatch(r'[0-9]{2}\.[0-9]{2}',release['appVersion'])
    assert package.name in (f'Avant-l-usine-{version}.pkg',f'Avant-Usine-PS4-{version}.pkg')
    with package.open('rb') as stream:assert stream.read(4)==b'\x7fCNT'
    size=package.stat().st_size;assert 16384<=size<=512*1024*1024
    digest=hashlib.sha256()
    with package.open('rb') as stream:
        while chunk:=stream.read(1024*1024):digest.update(chunk)
    return {**{key:release[key] for key in ['platform','version','appVersion','titleId','contentId','native','browser']},
            'schema':1,'package':package.name,'bytes':size,'sha256':digest.hexdigest(),'deviceTested':bool(release.get('deviceTested')),'channel':'development' if development else 'stable'}
if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    release=json.loads((root/'release.json').read_text())
    result=generate(release,Path(sys.argv[1]))
    target=root/'ps4-update.json'
    if result is None:
        target.unlink(missing_ok=True);print('Test build: no public update manifest generated.')
    else:
        target.write_text(json.dumps(result,indent=2)+'\n');print('Verified-package release manifest generated.')
