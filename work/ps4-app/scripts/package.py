from pathlib import Path
import os,json,subprocess,hashlib,struct,shutil
r=Path(__file__).resolve().parents[1];os.chdir(r)
sdk=Path(os.environ['OO_PS4_TOOLCHAIN']);tool=sdk/'bin/linux/PkgTool.Core'
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
files=['eboot.bin','sce_sys/param.sfo','sce_sys/icon0.png']
rights=list(sdk.glob('**/sce_sys/about/right.sprx'))
if rights:
 (r/'sce_sys/about').mkdir(parents=True,exist_ok=True)
 shutil.copyfile(rights[0],r/'sce_sys/about/right.sprx');files.append('sce_sys/about/right.sprx')
subprocess.run([str(sdk/'bin/linux/create-gp4'),'-out','pkg.gp4','--content-id='+release['contentId'],'--files',' '.join(files)],check=True)
run('pkg_build','pkg.gp4','.')
packages=list(r.glob('*.pkg'));assert len(packages)==1,packages
p=packages[0];assert p.stat().st_size>16384
with p.open('rb') as f:assert f.read(4)==b'\x7fCNT','Invalid PKG header'
target=r/('Avant-Usine-PS4-'+release['version']+'.pkg')
if p!=target:p.rename(target)
assert (r/'build/avant-usine.elf').read_bytes()[:4]==b'\x7fELF'
(r/'SHA256SUMS.txt').write_text(hashlib.sha256(target.read_bytes()).hexdigest()+'  '+target.name+'\n')
print('Native PKG built. Physical-console compatibility remains unverified.')
