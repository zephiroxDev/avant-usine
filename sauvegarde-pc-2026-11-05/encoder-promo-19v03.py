from pathlib import Path
import sys,subprocess,json,base64
r=Path(__file__).parent;p=r/'projet';w=p/'work/github-sync-import';out=p/'outputs/19v03';sys.path.insert(0,str(r/'outils-video'));import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe();subprocess.run([ff,'-y','-v','error','-framerate','15','-i',str(out/'promo-frames/frame-%03d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(w/'promo-19v03-anime.mp4')],check=True)
from PIL import Image
frames=[Image.open(out/f'promo-frames/frame-{i:03d}.png').resize((540,960)) for i in range(0,120,8)];frames[0].save(w/'promo-19v03-vivant.png',save_all=True,append_images=frames[1:],duration=533,loop=0)
files=['promo-19v03.png','promo-19v03-vivant.png','promo-19v03-anime.mp4'];sizes={}
for name in files:
 content=base64.b64encode((w/name).read_bytes()).decode();(out/(name+'.b64')).write_text(content,encoding='ascii');sizes[name]=len(content)
(out/'final-promo-sizes.json').write_text(json.dumps(sizes));print(json.dumps(sizes),flush=True)
