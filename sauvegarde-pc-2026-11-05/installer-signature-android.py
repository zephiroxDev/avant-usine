from pathlib import Path
import zipfile,json,subprocess,os,urllib.request,hashlib
r=Path(__file__).parent/'outils-android'
checksum=urllib.request.urlopen('https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip.sha256sum.txt',timeout=60).read().decode().split()[0]
assert hashlib.sha256((r/'jdk-microsoft.zip').read_bytes()).hexdigest()==checksum
with zipfile.ZipFile(r/'jdk-microsoft.zip') as z:
 for e in z.infolist():assert (r/'jdk'/e.filename).resolve().is_relative_to((r/'jdk').resolve())
 z.extractall(r/'jdk')
java=next((r/'jdk').glob('*/bin/java.exe')).parents[1]
p={'java':str(java),'sdk':str(r/'sdk'),'npm':str(r/'npm/package/bin/npm-cli.js')}
(r/'paths.json').write_text(json.dumps(p,indent=2))
env=os.environ.copy();env.update(JAVA_HOME=str(java),ANDROID_USER_HOME=str(r/'android-user'),JAVA_TOOL_OPTIONS='-Duser.home='+str(r/'java-home'),TEMP=str(r/'tmp'),TMP=str(r/'tmp'))
for name in ['tmp','android-user','java-home']:(r/name).mkdir(exist_ok=True)
manager=r/'sdk/cmdline-tools/latest/bin/sdkmanager.bat'
args=['cmd.exe','/d','/c',str(manager),'--sdk_root='+str(r/'sdk')]
print('JDK vérifié ; installation des outils de signature Android.',flush=True)
for extra in [['--licenses'],['build-tools;36.0.0']]:
 result=subprocess.run(args+extra,input='y\n'*100,text=True,env=env,capture_output=True)
 (r/('licences.log' if extra[0]=='--licenses' else 'installation.log')).write_text(result.stdout+result.stderr,encoding='utf-8')
 if result.returncode:raise RuntimeError((result.stdout+result.stderr)[-1800:])
assert (r/'sdk/build-tools/36.0.0/apksigner.bat').exists()
print('Outils de signature Android prêts, uniquement dans le dossier du Bureau.',flush=True)
