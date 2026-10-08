from pathlib import Path
import json,subprocess,os,secrets,hashlib,shutil
r=Path(__file__).resolve().parents[3];project=r/'work/android-app';tools=Path.home()/'.cache/avant-usine-android-tools';paths=json.loads((tools/'paths.json').read_text());node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';java=Path(paths['java']);env=os.environ.copy();env.update(JAVA_HOME=str(java),ANDROID_HOME=paths['sdk'],ANDROID_SDK_ROOT=paths['sdk']);env['PATH']=str(node.parent)+os.pathsep+str(java/'bin')+os.pathsep+env['PATH']
def run(args,cwd=project):subprocess.run([str(x) for x in args],cwd=cwd,env=env,check=True)
run([node,'scripts/prepare-site.cjs']);run([node,'node_modules/@capacitor/cli/bin/capacitor','sync','android'])
run([Path(os.sys.executable),'scripts/configure-native.py'])
run(['cmd.exe','/d','/c',project/'android/gradlew.bat','assembleRelease','--no-daemon'],project/'android')
signing=Path.home()/'.codex/signing/avant-usine-android';signing.mkdir(parents=True,exist_ok=True);sign=signing/'signing.json';key=signing/'avant-usine-android.jks'
if (tools/'signing.json').exists() and not sign.exists():shutil.copyfile(tools/'signing.json',sign)
if (tools/'avant-usine-android.jks').exists() and not key.exists():shutil.copyfile(tools/'avant-usine-android.jks',key)
if not sign.exists():sign.write_text(json.dumps({'password':secrets.token_urlsafe(32),'alias':'avant-usine'}))
credentials=json.loads(sign.read_text());env['AU_ANDROID_KEY_PASS']=credentials['password']
if not key.exists():run([java/'bin/keytool.exe','-genkeypair','-keystore',key,'-alias',credentials['alias'],'-keyalg','RSA','-keysize','4096','-validity','10000','-storepass:env','AU_ANDROID_KEY_PASS','-keypass:env','AU_ANDROID_KEY_PASS','-dname','CN=Avant l’usine, OU=Android, O=zephiroxDev, C=FR'])
release=json.loads((project/'release.json').read_text());version=release['version'];out=r/'outputs/application-android';out.mkdir(parents=True,exist_ok=True);unsigned=project/'android/app/build/outputs/apk/release/app-release-unsigned.apk';aligned=out/'aligned.apk';apk=out/('Avant-Usine-Android-'+version+'.apk');bt=Path(paths['sdk'])/'build-tools/36.0.0'
run([bt/'zipalign.exe','-f','-p','4',unsigned,aligned]);run(['cmd.exe','/d','/c',bt/'apksigner.bat','sign','--ks',key,'--ks-key-alias',credentials['alias'],'--ks-pass','env:AU_ANDROID_KEY_PASS','--key-pass','env:AU_ANDROID_KEY_PASS','--out',apk,aligned]);run(['cmd.exe','/d','/c',bt/'apksigner.bat','verify','--verbose','--print-certs',apk]);aligned.unlink()
(out/'livraison.json').write_text(json.dumps({'platform':'android','version':version,'versionCode':release['versionCode'],'file':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()},indent=2));print('SIGNED APK READY: '+str(apk),flush=True)
