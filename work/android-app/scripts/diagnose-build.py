from pathlib import Path
import subprocess,json
p=json.loads((Path.home()/'.cache/avant-usine-android-tools/paths.json').read_text());logs=sorted((Path.home()/'.gradle/daemon/8.14.3').glob('daemon-*.out.log'),key=lambda p:p.stat().st_mtime);pid=logs[-1].stem.split('-')[-1]
s=subprocess.run([str(Path(p['java'])/'bin/jcmd.exe'),pid,'Thread.print'],capture_output=True,text=True,timeout=30).stdout
parts=s.split('\n\n');found=0
for block in parts:
 if '"Daemon worker"' in block or ('RUNNABLE' in block and 'org.gradle.' in block):
  print('\n'.join(block.splitlines()[:22]));found+=1
  if found==5:break
print('Gradle cache artifacts: '+str(sum(1 for _ in (Path.home()/'.gradle/caches').rglob('*.jar'))))
