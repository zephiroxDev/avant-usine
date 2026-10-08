from pathlib import Path
from PIL import Image
p=Path(__file__).resolve().parents[1];image=Image.open(p/'assets/logo.png').convert('RGBA');out=p/'assets/generated';out.mkdir(parents=True,exist_ok=True)
assert image.width>=1024 and image.height>=1024, 'Use the high resolution master, never a launcher thumbnail'
for name,size in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180),('favicon-32.png',32)]:image.resize((size,size),Image.Resampling.LANCZOS).save(out/name)
image.save(out/'favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Android web icons generated directly from the HD master.')
