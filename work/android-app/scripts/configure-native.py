from pathlib import Path
import json,shutil,re
from PIL import Image
r=Path(__file__).resolve().parents[3];p=r/'work/android-app';android=p/'android';java=android/'app/src/main/java/dev/zephirox/avantusine/android';java.mkdir(parents=True,exist_ok=True)
for f in (p/'native').glob('*.java'):shutil.copyfile(f,java/f.name)
manifest=android/'app/src/main/AndroidManifest.xml';s=manifest.read_text();s=s.replace('android:allowBackup="true"','android:allowBackup="false"')
if 'REQUEST_INSTALL_PACKAGES' not in s:s=s.replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />')
manifest.write_text(s)
release=json.loads((p/'release.json').read_text());build=android/'app/build.gradle';s=build.read_text();s=re.sub(r'versionName "[^"]+"','versionName "'+release['version']+'"',s);s=re.sub(r'versionCode \d+','versionCode '+str(release['versionCode']),s);build.write_text(s)
res=android/'app/src/main/res';image=Image.open(p/'assets/logo.png').convert('RGBA')
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=res/('mipmap-'+density);folder.mkdir(exist_ok=True)
 for name in ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']:image.resize((size,size),Image.Resampling.LANCZOS).save(folder/name)
foreground=res/'drawable/ic_launcher_foreground.xml'
if foreground.exists():foreground.unlink()
canvas=Image.new('RGBA',(432,432),'#121212');small=image.resize((288,288),Image.Resampling.LANCZOS);canvas.alpha_composite(small,(72,72));canvas.save(res/'drawable/ic_launcher_foreground.png')
print('Native plugins, application identity and logo configured.')
