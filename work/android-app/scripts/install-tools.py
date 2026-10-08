from pathlib import Path
import urllib.request,json,hashlib,zipfile,tarfile,concurrent.futures,base64
tools=Path.home()/'.cache/avant-usine-android-tools';tools.mkdir(parents=True,exist_ok=True)
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Avant-usine-build'}),timeout=120) as r:return r.read()
def download(url,path,sha=None):
 if not path.exists():
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Avant-usine-build'}),timeout=120) as r,path.open('wb') as f:
   while chunk:=r.read(1024*1024):f.write(chunk)
 if sha and hashlib.sha256(path.read_bytes()).hexdigest()!=sha:raise RuntimeError('Checksum mismatch: '+path.name)
 return path
def npm():
 info=json.loads(get('https://registry.npmjs.org/npm/latest'));p=download(info['dist']['tarball'],tools/'npm.tgz');alg,value=info['dist']['integrity'].split('-',1);assert base64.b64encode(hashlib.new(alg,p.read_bytes()).digest()).decode()==value
 with tarfile.open(p) as t:t.extractall(tools/'npm',filter='data')
 return str(tools/'npm/package/bin/npm-cli.js')
def java():
 info=json.loads(get('https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'))[0]['binary']['package'];p=download(info['link'],tools/'jdk.zip',info['checksum'])
 if not list((tools/'jdk').glob('*/bin/java.exe')):
  with zipfile.ZipFile(p) as z:z.extractall(tools/'jdk')
 return str(next((tools/'jdk').glob('*/bin/java.exe')).parents[1])
def sdk():
 p=download('https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip',tools/'sdk-tools.zip','90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a');dest=tools/'sdk/cmdline-tools/latest'
 if not (dest/'bin/sdkmanager.bat').exists():
  with zipfile.ZipFile(p) as z:
   for item in z.infolist():
    rel=Path(item.filename).relative_to('cmdline-tools');target=dest/rel
    assert target.resolve().is_relative_to(dest.resolve())
    if item.is_dir():target.mkdir(parents=True,exist_ok=True)
    else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(item))
 return str(tools/'sdk')
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 tasks={name:pool.submit(fn) for name,fn in [('npm',npm),('java',java),('sdk',sdk)]};results={}
 for name,f in tasks.items():results[name]=f.result();print(name+' ready',flush=True)
(tools/'paths.json').write_text(json.dumps(results,indent=2));print('Toolchain ready: '+str(tools/'paths.json'),flush=True)
