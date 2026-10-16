from pathlib import Path
import json
r=Path(__file__).resolve().parents[2];w=r/'work/github-sync-import';o=r/'outputs/20v00-1';o.mkdir(exist_ok=True)
hp=w/'histories-17v01.js';h=json.loads(hp.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
common=['Les paroles terminées ne réapparaissent plus brièvement à la fin de leur transition.']
for key,label in [('web-pc','Site PC'),('web-mobile','Site mobile'),('desktop-pc','Windows 0.6.1'),('android','Android 0.3.1'),('ios','iPhone et iPad 2.0.1')]:
 changes=common.copy()
 if key in ['web-mobile','android','ios']:changes+=['Les commandes du bas du lecteur sont mieux espacées et tiennent compte des marges de sécurité du téléphone.']
 if key in ['desktop-pc','android','ios']:changes+=['Le mode immersion récupère aussi les synchronisations déjà chargées avant son ouverture.']
 if key=='ios':changes+=['Le volume utilise un réglage audio effectif sur iPhone et iPad.','Le rendu natif des paroles dans la Dynamic Island est simplifié ; le fonctionnement après signature reste à confirmer sur appareil.']
 entry=['20V00.1 · '+label,'16 octobre 2026','Correctifs du lecteur et des paroles.',changes]
 h[key]=[entry]+[x for x in h[key] if not x[0].startswith('20V00.1 ·')]
hp.write_text('window.AU_PLATFORM_HISTORIES='+json.dumps(h,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for platform,key,version in [('desktop','desktop-pc','0.6.1'),('android','android','0.3.1'),('ios','ios','2.0.1')]:
 d=r/f'work/{platform}-app';p=d/'release.json';m=json.loads(p.read_text(encoding='utf-8'));m['releaseId']='20V00.1';m['desktopVersion' if platform=='desktop' else 'version']=version
 if platform=='android':m['versionCode']=23
 if platform=='ios':m['buildNumber']=28
 p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for name in ['package.json','package-lock.json']:
  p=d/name
  if not p.exists():continue
  m=json.loads(p.read_text(encoding='utf-8'));m['version']=version
  if '' in m.get('packages',{}):m['packages']['']['version']=version
  p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (d/'patch-notes.json').write_text(json.dumps(h[key],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 notes='# '+h[key][0][0]+'\n\n'+h[key][0][2]+'\n\n'+'\n'.join('- '+x for x in h[key][0][3])+'\n'
 (d/'NOTES-20V00.1.md').write_text(notes,encoding='utf-8')
 if platform=='android':(d/f'NOTES-{version}.md').write_text(notes,encoding='utf-8')
p=w/'promo-manifest.json';m=json.loads(p.read_text(encoding='utf-8'));entry={'id':'20v00-1','patch':'20V00.1','image':'promo-20v00-1-vivant.png','original':'promo-20v00-1.png','animation':'promo-20v00-1-anime.mp4','platforms':['Site PC et mobile','Windows 0.6.1','Android 0.3.1','iPhone 2.0.1']};m['images']=[entry]+[x for x in m['images'] if x['id']!='20v00-1'];p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=w/'app-17v01.js';s=p.read_text(encoding='utf-8');item="\n['Le lecteur 20V00.1','Les commandes mobiles gardent leurs marges de sécurité. Dans les applications, le mode immersion utilise aussi les synchronisations chargées avant son ouverture. Sur iPhone et iPad, le ruban de volume agit sur le signal audio.'],"
if item not in s:s=s.replace('for(const [title,text]of [','for(const [title,text]of ['+item,1)
p.write_text(s,encoding='utf-8')
print('20V00.1 metadata ready; source promo manifest remains local until releases are verified.')
