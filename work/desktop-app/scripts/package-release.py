from pathlib import Path
import json,zipfile,hashlib
root=Path(__file__).resolve().parents[1];release=json.loads((root/'release.json').read_text(encoding='utf-8'));package=json.loads((root/'package.json').read_text(encoding='utf-8'))
assert release['desktopVersion']==package['version'],'Les versions ne correspondent pas'
website=(root/release['websiteSource']).resolve();output=root.parents[1]/'outputs/application-windows';version=package['version'];install=output/f'Avant-Usine-Installation-{version}.exe';portable=output/f'Avant-Usine-Portable-{version}.exe'
assert install.is_file() and portable.is_file(),'Construire les deux exécutables avant de préparer la livraison'
bundle=output/f"Avant-Usine-Site-{release['releaseId']}.zip"
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in website.iterdir():
  if file.is_file() and file.suffix.lower() in ['.html','.js','.css','.png','.ico','.webp','.mp4','.webmanifest','.md','.sql']:
   archive.write(file,file.name)
manifest={**release,'files':[{'name':file.name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()} for file in [install,portable,bundle]]}
(output/'livraison.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Livraison complète préparée : application Windows et site de la même version.')
