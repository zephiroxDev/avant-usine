from pathlib import Path
import os,json,urllib.request,hashlib,subprocess,secrets,sys
r=Path(__file__).resolve().parents[3];project=r/'work/android-app';release=json.loads((project/'release.json').read_text());version=release['version'];commit=sys.argv[1];branch='build/android-'+commit[:12];base='https://raw.githubusercontent.com/zephiroxDev/avant-usine/refs/heads/'+branch+'/'
def get(name):
 with urllib.request.urlopen(base+name,timeout=120) as response:return response.read()
metadata=json.loads(get('build.json'));assert metadata['sourceCommit']==commit and metadata['unsigned']
data=get('unsigned.apk');assert len(data)==metadata['bytes'] and hashlib.sha256(data).hexdigest()==metadata['sha256'];out=r/'outputs/application-android';out.mkdir(parents=True,exist_ok=True);unsigned=out/'unsigned.apk';unsigned.write_bytes(data)
tools=Path.home()/'.cache/avant-usine-android-tools';paths=json.loads((tools/'paths.json').read_text());java=Path(paths['java']);bt=Path(paths['sdk'])/'build-tools/36.0.0';env=os.environ.copy();env.update(JAVA_HOME=str(java));env['PATH']=str(java/'bin')+os.pathsep+env['PATH']
private=Path.home()/'.codex/signing/avant-usine-android';private.mkdir(parents=True,exist_ok=True);sign=private/'signing.json';key=private/'avant-usine-android.jks'
if not sign.exists():sign.write_text(json.dumps({'password':secrets.token_urlsafe(32),'alias':'avant-usine'}))
credentials=json.loads(sign.read_text());env['AU_ANDROID_KEY_PASS']=credentials['password']
def run(args):subprocess.run([str(x) for x in args],cwd=project,env=env,check=True)
if not key.exists():run([java/'bin/keytool.exe','-genkeypair','-keystore',key,'-alias',credentials['alias'],'-keyalg','RSA','-keysize','4096','-validity','10000','-storepass:env','AU_ANDROID_KEY_PASS','-keypass:env','AU_ANDROID_KEY_PASS','-dname','CN=Avant l’usine, OU=Android, O=zephiroxDev, C=FR'])
aligned=out/'aligned.apk';apk=out/('Avant-Usine-Android-'+version+'.apk');run([bt/'zipalign.exe','-f','-p','4',unsigned,aligned]);run(['cmd.exe','/d','/c',bt/'apksigner.bat','sign','--ks',key,'--ks-key-alias',credentials['alias'],'--ks-pass','env:AU_ANDROID_KEY_PASS','--key-pass','env:AU_ANDROID_KEY_PASS','--out',apk,aligned]);aligned.unlink();unsigned.unlink()
m={'platform':'android','version':version,'versionCode':release['versionCode'],'sourceCommit':commit,'file':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()};(out/'livraison.json').write_text(json.dumps(m,indent=2));print('Signed APK created: '+str(apk),flush=True)
