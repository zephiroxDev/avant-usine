from pathlib import Path
import zipfile,json,hashlib,shutil,subprocess,os,re
r=Path(__file__).resolve().parents[3];out=r/'outputs/application-android';m=json.loads((out/'livraison.json').read_text());apk=out/m['file'];assert apk.stat().st_size==m['bytes'] and hashlib.sha256(apk.read_bytes()).hexdigest()==m['sha256']
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 names=z.namelist();assert 'classes.dex' in names and 'AndroidManifest.xml' in names
 assert not any('test-local' in n or '.jks' in n or 'signing.json' in n for n in names)
 html=z.read('assets/public/index.html').decode();assert 'android.js' in html and 'androidAnnouncement' not in html
 for name in ['android.js','android.css','local-18v00.js','histories-17v01.js','app-17v01.js']:assert 'assets/public/'+name in names
 prefix='window.AU_PLATFORM_HISTORIES=';h=json.loads(z.read('assets/public/histories-17v01.js').decode()[len(prefix):].strip().rstrip(';'));assert h['android'][0][0].startswith('Android '+m['version']) and isinstance(h['ios'],list)
tools=Path.home()/'.cache/avant-usine-android-tools';paths=json.loads((tools/'paths.json').read_text());env=os.environ.copy();env['JAVA_HOME']=paths['java'];env['PATH']=str(Path(paths['java'])/'bin')+os.pathsep+env['PATH'];bt=Path(paths['sdk'])/'build-tools/36.0.0'
badging=subprocess.check_output([str(bt/'aapt2.exe'),'dump','badging',str(apk)],env=env,text=True);assert "name='dev.zephirox.avantusine.android'" in badging and ("versionName='"+m['version']+"'") in badging;assert "android.permission.REQUEST_INSTALL_PACKAGES" in badging
verify=subprocess.check_output(['cmd.exe','/d','/c',str(bt/'apksigner.bat'),'verify','--verbose','--print-certs',str(apk)],env=env,text=True);cert=re.search(r'Signer #1 certificate SHA-256 digest: (\w+)',verify);assert cert;m['certificateSha256']=cert[1];(out/'livraison.json').write_text(json.dumps(m,indent=2))
private=Path.home()/'.codex/signing/avant-usine-android';private.mkdir(parents=True,exist_ok=True)
for name in ['signing.json','avant-usine-android.jks']:
 source=tools/name;target=private/name
 if source.exists() and not target.exists():shutil.copyfile(source,target)
assert (private/'signing.json').exists() and (private/'avant-usine-android.jks').exists()
print(json.dumps({'version':m['version'],'bytes':m['bytes'],'sha256':m['sha256'],'certificateSha256':m['certificateSha256'],'assetsVerified':True,'signatureVerified':True,'privateKeyPreserved':True}))
