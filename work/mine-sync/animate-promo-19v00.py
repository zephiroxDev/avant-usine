from pathlib import Path
import sys,subprocess,json,math
import numpy as np
from PIL import Image
r=Path(__file__).resolve().parents[2];sys.path.insert(0,str(r/'work/mine-sync/.export-runtime'));import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe();out=r/'outputs/19v00';out.mkdir(parents=True,exist_ok=True);web=r/'work/github-sync-import'
original=Path(r'C:\Users\User\.codex\generated_images\01a0f7e6-d7bb-7c61-ad37-bef3f1e97e07\exec-9fdc0e97-6efc-43a6-b868-2594a32f4ff8.png')
(web/'promo-19v00.png').write_bytes(original.read_bytes())
# Generated light-only layers; the original poster is neither repainted nor cropped.
y,x=np.mgrid[0:700,0:320];alpha=(np.exp(-((x-160)/70)**2-((y-350)/230)**2)*240).astype(np.uint8)
for name,color in [('cyan',(20,215,255)),('pink',(255,40,180))]:
 a=np.zeros((700,320,4),dtype=np.uint8);a[:,:,:3]=color;a[:,:,3]=alpha;Image.fromarray(a).save(out/(name+'-light.png'))
video=web/'promo-19v00-anime.mp4'
filters="[0:v]scale=1080:1920:flags=lanczos,format=rgba[poster];[poster][1:v]overlay=x='-215+35*sin(2*PI*t/4)':y='440+730*sin(2*PI*t/6)':shortest=1[a];[a][2:v]overlay=x='975+35*sin(2*PI*t/4+PI)':y='440+730*sin(2*PI*t/6+PI)':shortest=1,format=yuv420p[v]"
subprocess.run([ff,'-y','-v','error','-loop','1','-i',str(web/'promo-19v00.png'),'-loop','1','-i',str(out/'cyan-light.png'),'-loop','1','-i',str(out/'pink-light.png'),'-filter_complex',filters,'-map','[v]','-t','12','-r','30','-an','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-movflags','+faststart',str(video)],check=True)
subprocess.run([ff,'-v','error','-i',str(video),'-f','null','-'],check=True)
print(json.dumps({'poster':str(web/'promo-19v00.png'),'animation':str(video),'bytes':video.stat().st_size,'seconds':12,'width':1080,'height':1920,'silent':True,'originalPreserved':True}))

# Animated PNG for existing application cards, whose thumbnail renderer uses img.
# Only the light strip changes; all note pixels remain fixed and full resolution.
w,h=Image.open(web/'promo-19v00.png').size
raw=out/'promo-preview-frames.png'
subprocess.run([ff,'-y','-v','error','-i',str(video),'-t','6','-vf',f'fps=4,scale={w}:{h}:flags=lanczos','-plays','0','-f','apng',str(raw)],check=True)
base=Image.open(web/'promo-19v00.png').convert('RGBA');movie=Image.open(raw);frames=[]
for i in range(movie.n_frames):
 movie.seek(i);frame=base.copy();frame.paste(movie.convert('RGBA').crop((0,0,95,h)),(0,0));frames.append(frame)
preview=web/'promo-19v00-vivant.png'
frames[0].save(preview,format='PNG',save_all=True,append_images=frames[1:],duration=250,loop=0,disposal=0,blend=0,optimize=True)
assert preview.stat().st_size<12*1024*1024
