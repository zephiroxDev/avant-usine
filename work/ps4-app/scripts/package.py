from pathlib import Path
import os,json,subprocess,hashlib,struct,shutil
r=Path(__file__).resolve().parents[1];os.chdir(r)
sdk=Path(os.environ['OO_PS4_TOOLCHAIN']);tool=Path(os.environ.get('PS4_PKG_TOOL',str(sdk/'bin/linux/PkgTool.Core')))
gp4=Path(os.environ.get('PS4_GP4_TOOL',str(sdk/'bin/linux/create-gp4')))
release=json.loads((r/'release.json').read_text())
def run(*args):subprocess.run([str(tool),*map(str,args)],check=True)
sfo=r/'sce_sys/param.sfo';run('sfo_new',sfo)
for name,kind,size,value in [
 ('APP_TYPE','Integer',4,1),('APP_VER','Utf8',8,release['appVersion']),
 ('ATTRIBUTE','Integer',4,0),('CATEGORY','Utf8',4,'gd'),
 ('CONTENT_ID','Utf8',48,release['contentId']),('DOWNLOAD_DATA_SIZE','Integer',4,0),
 ('SYSTEM_VER','Integer',4,0),('TITLE','Utf8',128,"Avant l'usine - PS4 test"),
 ('TITLE_ID','Utf8',12,release['titleId']),('VERSION','Utf8',8,release['appVersion'])]:
 run('sfo_setentry',sfo,name,'--type',kind,'--maxsize',size,'--value',value)
support=['sce_module/libc.prx','sce_module/libSceFios2.prx','sce_sys/about/right.sprx']
pins={d['path']:d for d in json.loads((r/'dependencies.json').read_text())}
for name in support:
 data=(r/name).read_bytes()
 assert data[:4]==b'O\x15=\x1d' and hashlib.sha256(data).hexdigest()==pins[name]['sha256'],name
files=['eboot.bin','sce_sys/param.sfo','sce_sys/icon0.png']+support
subprocess.run([str(gp4),'-out','pkg.gp4','--content-id='+release['contentId'],'--files',' '.join(files)],check=True)
run('pkg_build','pkg.gp4','.')
p=r/(release['contentId']+'.pkg');assert p.is_file() and p.stat().st_size>16384
with p.open('rb') as f:assert f.read(4)==b'\x7fCNT','Invalid PKG header'
target=r/('Avant-Usine-PS4-'+release['version']+'.pkg')
if p!=target:p.rename(target)
assert (r/'build/avant-usine.elf').read_bytes()[:4]==b'\x7fELF'
(r/'SHA256SUMS.txt').write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  '+target.name+'\n')
subprocess.run(['python3',str(r/'scripts/generate_update_manifest.py'),str(target)],check=True)
print('Native PKG built. Physical-console compatibility remains unverified.')
(r/'build/package-files.json').write_text(json.dumps({'files':files,'appVersion':release['appVersion'],'supportFilesVerified':True},indent=2))
