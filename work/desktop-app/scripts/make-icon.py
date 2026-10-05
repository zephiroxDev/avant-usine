from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
(root/'build').mkdir(exist_ok=True)
with Image.open(root/'build/logo-source.jpg') as original:
    im=original.convert('RGBA')
    for name,size in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180),('favicon-32.png',32)]:
        im.resize((size,size),Image.Resampling.LANCZOS).save(root/'build'/name)
    im.save(root/'build/icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Icon created')
