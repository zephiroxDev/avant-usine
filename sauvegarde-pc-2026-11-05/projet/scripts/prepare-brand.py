"""Compile the approved full-bleed master into native/web icon sizes."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil
root=Path(__file__).resolve().parents[1]
master=root/'assets/branding/portrait-halo.png'
with Image.open(master) as source:
 image=source.convert('RGB')
 assert image.width==image.height and image.width>=1024
 targets={
  'work/experience-integration/brand-portrait-21.png':192,
  'work/experience-integration/icon-512.png':512,
  'work/experience-integration/icon-192.png':192,
  'work/experience-integration/apple-touch-icon.png':180,
  'work/experience-integration/favicon-32.png':32,
  'work/desktop-app/build/logo-source.png':1024,
  'work/experience-ios/assets/logo-source.png':1024,
  'work/android-app/assets/logo.png':1024,
  'work/ps4-app/sce_sys/icon0.png':512,
 }
 for name,size in targets.items():
  p=root/name;p.parent.mkdir(parents=True,exist_ok=True)
  image.resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True)
 image.save(root/'work/experience-integration/favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
 records=[{'path':name,'size':size,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()} for name,size in targets.items()]
(root/'assets/branding/manifest.json').write_text(json.dumps({'name':'Avant l’usine','approved':'2026-10-26','master':hashlib.sha256(master.read_bytes()).hexdigest(),'files':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared '+str(len(records))+' web/native identity assets; no paused platform compiled.')
