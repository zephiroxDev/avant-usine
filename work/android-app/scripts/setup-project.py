from pathlib import Path
import json,os,subprocess
r=Path(__file__).resolve().parents[3];project=r/'work/android-app';tools=Path.home()/'.cache/avant-usine-android-tools';paths=json.loads((tools/'paths.json').read_text());node=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
env=os.environ.copy();env.update(JAVA_HOME=paths['java'],ANDROID_HOME=paths['sdk'],ANDROID_SDK_ROOT=paths['sdk']);env['PATH']=str(node.parent)+os.pathsep+str(Path(paths['java'])/'bin')+os.pathsep+env['PATH']
def run(args,input=None):
 subprocess.run(args,cwd=project,env=env,input=input,text=True,check=True)
run([str(node),paths['npm'],'install','--no-audit','--no-fund'])
run([str(node),'scripts/prepare-site.cjs'])
cli=str(project/'node_modules/@capacitor/cli/bin/capacitor')
if not (project/'android').exists():run([str(node),cli,'add','android'])
run([str(node),cli,'sync','android'])
sdk=str(tools/'sdk/cmdline-tools/latest/bin/sdkmanager.bat')
run(['cmd.exe','/d','/c',sdk,'platform-tools','platforms;android-36','build-tools;36.0.0'],input='y\n'*10)
(project/'android/local.properties').write_text('sdk.dir='+paths['sdk'].replace('\\','/')+'\n')
print('Android project and SDK ready.',flush=True)
