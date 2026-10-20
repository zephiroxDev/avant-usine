from pathlib import Path
import runpy,tempfile,hashlib
root=Path(__file__).resolve().parents[1];(root/'build').mkdir(exist_ok=True)
generate=runpy.run_path(str(root/'scripts/generate_update_manifest.py'))['generate']
release={'platform':'ps4','native':True,'browser':False,'version':'1.0.1','appVersion':'01.02','titleId':'ALUS00001','contentId':'IV0000-ALUS00001_00-AVANTUSINEPS4001','deviceTested':True}
with tempfile.TemporaryDirectory(dir=root/'build') as directory:
    package=Path(directory)/'Avant-Usine-PS4-1.0.1.pkg';data=b'\x7fCNT'+b'\0'*20000;package.write_bytes(data)
    result=generate(release,package);assert result['bytes']==len(data) and result['sha256']==hashlib.sha256(data).hexdigest()
    assert generate({**release,'version':'1.0.1-test'},package) is None
    try:generate({**release,'deviceTested':False},package)
    except ValueError:pass
    else:raise AssertionError('Untested stable release must be blocked')
print('Stable manifest matches packaged bytes; prerelease and untested-stable gates passed.')
