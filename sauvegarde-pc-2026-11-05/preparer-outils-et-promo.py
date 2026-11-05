from pathlib import Path
import zipfile,json,sys,subprocess,hashlib,io
sys.stdout.reconfigure(encoding='utf-8')
r=Path(__file__).parent;project=r/'projet';web=project/'work/github-sync-import'
archives=list(r.glob('*.zip'));assert len(archives)==1
packed=archives[0].read_bytes()
for depth in range(4):
 with zipfile.ZipFile(io.BytesIO(packed)) as container:
  names=container.namelist()
  if any(Path(n).name=='avant-usine-android.jks' for n in names):break
  nested=[n for n in names if n.lower().endswith('.zip')];assert len(nested)==1,'Archive de clés illisible'
  assert container.getinfo(nested[0]).file_size<10000000
  packed=container.read(nested[0])
with zipfile.ZipFile(io.BytesIO(packed)) as z:
 target=r/'cles-android';target.mkdir(exist_ok=True)
 for name in ['avant-usine-android.jks','signing.json']:
  matches=[n for n in z.namelist() if Path(n).name==name];assert len(matches)==1,name
  (target/name).write_bytes(z.read(matches[0]))
assert json.loads((target/'signing.json').read_text()).get('password')
print('Clés privées extraites uniquement dans le dossier du Bureau.')
for name in ['sign-ci.py','verify-apk.py','install-tools.py']:
 p=project/'work/android-app/scripts'/name;s=p.read_text(encoding='utf-8')
 if name=='install-tools.py':
  s=s.replace("tools=Path.home()/'.cache/avant-usine-android-tools'", "tools=Path(__file__).resolve().parents[4]/'outils-android'")
 else:
  s=s.replace("tools=Path.home()/'.cache/avant-usine-android-tools'", "tools=r.parent/'outils-android'")
  s=s.replace("private=Path.home()/'.codex/signing/avant-usine-android'", "private=r.parent/'cles-android'")
 if name=='sign-ci.py':
  s=s.replace("if not sign.exists():sign.write_text(json.dumps({'password':secrets.token_urlsafe(32),'alias':'avant-usine'}))", "if not sign.exists() or not key.exists():raise RuntimeError('Clés Android d’origine nécessaires : ne pas générer une nouvelle signature.')")
 p.write_text(s,encoding='utf-8')
sys.path.insert(0,str(r/'outils-video'));import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe();out=project/'outputs/19v03'
subprocess.run([ff,'-y','-v','error','-framerate','15','-i',str(out/'promo-frames/frame-%03d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(web/'promo-19v03-anime.mp4')],check=True)
from PIL import Image
frames=[Image.open(out/f'promo-frames/frame-{i:03d}.png').resize((540,960)) for i in range(0,120,8)]
frames[0].save(web/'promo-19v03-vivant.png',save_all=True,append_images=frames[1:],duration=533,loop=0)
p=web/'promo-manifest.json';m=json.loads(p.read_text(encoding='utf-8'));m['images']=[i for i in m['images'] if i['patch']!='19V03'];m['images'].insert(0,{'id':'19v03-all','patch':'19V03','image':'promo-19v03-vivant.png','original':'promo-19v03.png','animation':'promo-19v03-anime.mp4','platforms':['Site 19V03','Windows 0.5.4','Android 0.2.3','iOS 1.1.4']});p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
notes=(project/'work/desktop-app/NOTES-0.5.4.md').read_text(encoding='utf-8')
for name in ['NOTES-19V03.md','NOTES-WINDOWS.md']:(project/'work/desktop-app'/name).write_text(notes,encoding='utf-8')
print(json.dumps({'promoVideoBytes':(web/'promo-19v03-anime.mp4').stat().st_size,'promoPreviewBytes':(web/'promo-19v03-vivant.png').stat().st_size,'publicFeatures':2,'textAnimated':True}))
