from pathlib import Path
import json,base64,sys,subprocess
from PIL import Image
r=Path(__file__).resolve().parents[2];o=r/'outputs/20-0';w=r/'work/github-sync-import';fs=sorted((o/'promo-frames').glob('*.png'));assert len(fs)==48
palette=Image.open(fs[0]).convert('RGB').quantize(colors=192);ims=[Image.open(f).convert('RGB').quantize(palette=palette) for f in fs[::4]];ims[0].save(w/'promo-20-0-vivant.png',save_all=True,append_images=ims[1:],duration=333,loop=0,optimize=True)
sys.path.insert(0,str(r.parent/'outils-video'));import imageio_ffmpeg
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-framerate','12','-i',str(o/'promo-frames/frame-%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','21',str(w/'promo-20-0-anime.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for name in ['promo-20-0.png','promo-20-0-vivant.png','promo-20-0-anime.mp4']:(o/(name+'.b64')).write_text(base64.b64encode((w/name).read_bytes()).decode(),encoding='ascii')
print('Promo 20.0 originale, APNG et MP4 prêts.')
