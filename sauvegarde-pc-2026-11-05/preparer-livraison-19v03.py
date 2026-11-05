from pathlib import Path
import json
root=Path(__file__).parent/'projet';web=root/'work/github-sync-import'
public=['Les paroles Highlight apparaissent progressivement à la lettre près, backs compris.','En synchronisation classique, le texte se révèle par un fondu du haut vers le bas pendant la phrase.']
prefix='window.AU_PLATFORM_HISTORIES='
p=web/'histories-17v01.js';h=json.loads(p.read_text(encoding='utf-8')[len(prefix):].strip().rstrip(';'))
names={'web-pc':'Site PC','web-mobile':'Site mobile','desktop-pc':'Application Windows 0.5.4','android':'Application Android 0.2.3','ios':'Application iOS 1.1.4'}
for key,label in names.items():
 h[key]=[entry for entry in h[key] if not entry[0].startswith('19V03')]
 h[key].insert(0,['19V03 · '+label,'13 octobre 2026','Les paroles prennent vie au rythme du morceau.',public])
p.write_text(prefix+json.dumps(h,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for platform,version,field,value in [('desktop-app','0.5.4','desktopVersion','0.5.4'),('android-app','0.2.3','versionCode',14),('ios-app','1.1.4','buildNumber',17)]:
 folder=root/'work'/platform;p=folder/'release.json';data=json.loads(p.read_text(encoding='utf-8-sig'));data.update(releaseId='19V03');data[field]=value
 if platform!='desktop-app':data['version']=version
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for name in ['package.json','package-lock.json']:
  p=folder/name
  if not p.exists():continue
  data=json.loads(p.read_text(encoding='utf-8-sig'));data['version']=version
  if name=='package-lock.json':data.get('packages',{}).get('',{})['version']=version
  p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 p=folder/'patch-notes.json';notes=[entry for entry in json.loads(p.read_text(encoding='utf-8-sig')) if not entry[0].startswith('19V03')];key={'desktop-app':'desktop-pc','android-app':'android','ios-app':'ios'}[platform];notes.insert(0,h[key][0]);p.write_text(json.dumps(notes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (folder/f'NOTES-{version}.md').write_text('# Avant l’usine — '+names[key]+' · 19V03\n\n'+'\n'.join('- '+item for item in public)+'\n',encoding='utf-8')
p=web/'app-17v01.js';s=p.read_text(encoding='utf-8');s=s.replace("['Navigation et annonces'","['Paroles révélées progressivement','Le Highlight fait apparaître les lettres selon les repères du fichier, y compris les backs. En synchronisation classique, le texte apparaît du haut vers le bas sur la durée de la phrase ; sans fin explicite, celle-ci est estimée jusqu’au prochain départ. Cet effet visuel ne crée pas de repères de mots.'],\n ['Navigation et annonces'",1);p.write_text(s,encoding='utf-8')
print('Versions, historiques publics et Infos préparés pour 19V03')
