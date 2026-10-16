from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];w=r/'work/github-sync-import';o=r/'outputs/20v00-2';o.mkdir(exist_ok=True)
changes=['Touchez une phrase synchronisée pour rejoindre son passage dans le morceau, y compris les backs, en classique et en Highlight.','Après un défilement manuel, le bouton « Revenir aux paroles en cours » recentre le chant et réactive le suivi automatique.']
p=w/'histories-17v01.js';h=json.loads(p.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
for key,label in [('web-pc','Site PC'),('web-mobile','Site mobile'),('desktop-pc','Windows 0.6.2'),('android','Android 0.3.2'),('ios','iPhone et iPad 2.0.2')]:
 h[key]=[['20.0.2 · '+label,'16 octobre 2026','Les paroles deviennent des repères de lecture.',changes]]+[v for v in h[key] if not v[0].startswith('20.0.2 ·')]
p.write_text('window.AU_PLATFORM_HISTORIES='+json.dumps(h,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for platform,key,version in [('desktop','desktop-pc','0.6.2'),('android','android','0.3.2'),('ios','ios','2.0.2')]:
 d=r/f'work/{platform}-app';p=d/'release.json';m=json.loads(p.read_text(encoding='utf-8'));m['releaseId']='20.0.2';m['desktopVersion' if platform=='desktop' else 'version']=version
 if platform=='android':m['versionCode']=24
 if platform=='ios':m['buildNumber']=29
 p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for name in ['package.json','package-lock.json']:
  p=d/name
  if not p.exists():continue
  m=json.loads(p.read_text(encoding='utf-8'));m['version']=version
  if '' in m.get('packages',{}):m['packages']['']['version']=version
  p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (d/'patch-notes.json').write_text(json.dumps(h[key],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 notes='# '+h[key][0][0]+'\n\n'+h[key][0][2]+'\n\n'+'\n'.join('- '+x for x in changes)+'\n'
 (d/'NOTES-20.0.2.md').write_text(notes,encoding='utf-8')
 if platform=='android':(d/f'NOTES-{version}.md').write_text(notes,encoding='utf-8')
for platform in ['desktop','android']:
 p=r/f'work/{platform}-app/scripts/prepare-site.cjs';s=p.read_text(encoding='utf-8').replace('const allowed=/^(','const allowed=/^(beta-20v00-2\\.js|',1);p.write_text(s,encoding='utf-8')
p=w/'app-17v01.js';s=p.read_text(encoding='utf-8').replace('for(const [title,text]of [',"for(const [title,text]of [\n['Les paroles comme repères de lecture','Touchez une phrase synchronisée pour rejoindre son horaire. Après avoir parcouru les paroles, utilisez Revenir aux paroles en cours pour réactiver le suivi. Une sélection de texte pour une annotation reste possible sans déplacer la lecture.'],",1);p.write_text(s,encoding='utf-8')
print('20.0.2 metadata prepared; private tools omitted from public notes.')
