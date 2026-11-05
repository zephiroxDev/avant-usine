from pathlib import Path
import json
r=Path(__file__).parent/'projet';w=r/'work/github-sync-import'
p=w/'studio-19v00.js';s=p.read_text(encoding='utf-8').replace("captureMode=initial?.captureMode||'glide'","captureMode=initial?.captureMode||(initial?.syncMode==='blocks'?'phrases':'glide')")
s=s.replace("const p=model.project,valid=p.phrases.filter(l=>!M.issues({...p,phrases:[l]},'highlight').length)","const p=model.project,mode=captureMode==='phrases'?'blocks':'highlight',valid=p.phrases.filter(l=>!M.issues({...p,phrases:[l]},mode).length)")
s=s.replace("M.flatten({...p,phrases:valid},'highlight')","M.flatten({...p,phrases:valid},mode)")
s=s.replace("export:mode=>model.export(mode),flush","get syncMode(){return captureMode==='phrases'?'blocks':'highlight';},export:mode=>model.export(mode||(captureMode==='phrases'?'blocks':'highlight')),flush")
s=s.replace("model.session({captureMode});render();};","model.session({captureMode});render();status.textContent=captureMode==='glide'?'Fais glisser la barre au rythme du chant.':'Marque le début et la fin des phrases pendant la lecture.';};")
p.write_text(s,encoding='utf-8')
p=w/'app-17v01.js';s=p.read_text(encoding='utf-8').replace("onchange:project=>{work.playbackRate=project.rate;","onchange:project=>{if(project.captureMode)work.mode=project.captureMode==='phrases'?'blocks':'highlight';work.playbackRate=project.rate;")
s=s.replace('w.editor.export(w.mode)','w.editor.export(w.editor.syncMode||w.mode)')
s=s.replace("if(data.line_ends?.some(Number.isFinite))return Math.max(...data.line_ends.filter(Number.isFinite));","if(data.line_ends?.some(Number.isFinite))return Math.max(...data.lines.map((_,i)=>lyricLineEnd(data,i)).filter(Number.isFinite));")
p.write_text(s,encoding='utf-8')
p=w/'local-18v00.js';s=p.read_text(encoding='utf-8').replace('onchange:project=>{last=project;','onchange:project=>{if(project.captureMode)mode=project.captureMode===\'phrases\'?\'blocks\':\'highlight\';last=project;').replace('instance.export(mode)','instance.export(instance.syncMode||mode)');p.write_text(s,encoding='utf-8')
# Les compilations initiales sont déjà parties ; les versions techniques suivantes
# garantissent que leur remplacement contient les corrections d’intégration.
for platform,old,new,key,code in [('desktop-app','0.5.4','0.5.5','desktop-pc',None),('android-app','0.2.3','0.2.4','android',15),('ios-app','1.1.4','1.1.5','ios',18)]:
 folder=r/'work'/platform
 for name in ['release.json','package.json','package-lock.json']:
  p=folder/name
  if not p.exists():continue
  data=json.loads(p.read_text(encoding='utf-8'));field='desktopVersion' if name=='release.json' and platform=='desktop-app' else 'version';data[field]=new
  if name=='release.json' and code:data['versionCode' if platform=='android-app' else 'buildNumber']=code
  if name=='package-lock.json':data.get('packages',{}).get('',{})['version']=new
  p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 p=folder/'patch-notes.json';data=json.loads(p.read_text(encoding='utf-8'));data[0][0]=data[0][0].replace(old,new);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for name in (['NOTES-19V03.md','NOTES-WINDOWS.md'] if platform=='desktop-app' else [f'NOTES-{new}.md']):
  source=folder/(name if platform=='desktop-app' else f'NOTES-{old}.md');(folder/name).write_text(source.read_text(encoding='utf-8').replace(old,new),encoding='utf-8')
for name in ['histories-17v01.js','promo-manifest.json']:
 p=w/name;s=p.read_text(encoding='utf-8').replace('0.5.4','0.5.5').replace('0.2.3','0.2.4').replace('1.1.4','1.1.5');p.write_text(s,encoding='utf-8')
p=r/'outputs/19v03/promo.html';s=p.read_text(encoding='utf-8').replace('0.5.4','0.5.5').replace('0.2.3','0.2.4').replace('1.1.4','1.1.5');p.write_text(s,encoding='utf-8')
print('Mode initial, aperçu, envoi Web et sauvegarde locale cohérents.')
