from pathlib import Path
import json

root=Path(__file__).resolve().parents[2]
web=root/'work/github-sync-import'
date='15 octobre 2026'
changes=[
 'Une interface plus sobre et cohérente : typographie, espacements, commandes et fenêtres retravaillés, avec des accents rose et violet discrets.',
 'Un écran de paroles repensé : pochette à gauche sur grand écran, petite pochette en haut à droite sur téléphone, fond diffus aux couleurs du volume.',
 'Paroles classiques et Highlight : texte plus lisible, mise en lumière douce, défilement fluide et voix secondaires distinctes, avec les minutages existants.',
 'Les réglages de visibilité de 0 à 100, les transitions et les explications restent accessibles dans les options des paroles.',
 'Le contrôle de volume adopte un ruban en relief qui réagit au déplacement, avec un affichage en pourcentage.'
]
history_path=web/'histories-17v01.js'
histories=json.loads(history_path.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
entries={}
for key,label in [('web-pc','Site PC'),('web-mobile','Site mobile'),('desktop-pc','Windows 0.6.0'),('android','Android 0.3.0'),('ios','iPhone et iPad 2.0')]:
 entry=['20.0 · '+label,date,'Une nouvelle finition pour Avant l’usine.',changes.copy()]
 if key in ['desktop-pc','android','ios']:
  entry[3].append('Le mode immersion reprend la nouvelle composition, adaptée à la taille de l’écran.')
 histories[key]=[entry]+[e for e in histories.get(key,[]) if not e[0].startswith('20.0 ·')]
 entries[key]=entry
history_path.write_text('window.AU_PLATFORM_HISTORIES='+json.dumps(histories,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for platform,key,version in [('desktop','desktop-pc','0.6.0'),('android','android','0.3.0'),('ios','ios','2.0.0')]:
 folder=root/f'work/{platform}-app'
 release=json.loads((folder/'release.json').read_text(encoding='utf-8'))
 release['releaseId']='20.0'
 if platform=='desktop':release['desktopVersion']=version
 else:release['version']=version
 if platform=='android':release['versionCode']=22
 if platform=='ios':release['buildNumber']=27
 (folder/'release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 package_path=folder/'package.json';package=json.loads(package_path.read_text(encoding='utf-8'));package['version']=version;package_path.write_text(json.dumps(package,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 lock_path=folder/'package-lock.json'
 if lock_path.exists():
  lock=json.loads(lock_path.read_text());lock['version']=version
  if '' in lock.get('packages',{}):lock['packages']['']['version']=version
  lock_path.write_text(json.dumps(lock,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (folder/'patch-notes.json').write_text(json.dumps(histories[key],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 entry=entries[key]
 (folder/'NOTES-20.0.md').write_text('# '+entry[0]+'\n\n'+entry[2]+'\n\n'+'\n'.join('- '+x for x in entry[3])+'\n',encoding='utf-8')
 # Android publisher expects the technical-version notes in addition to patch notes.
 if platform=='android':(folder/f'NOTES-{version}.md').write_text((folder/'NOTES-20.0.md').read_text(encoding='utf-8'),encoding='utf-8')
promo_path=web/'promo-manifest.json';manifest=json.loads(promo_path.read_text(encoding='utf-8'))
entry={'id':'20-0','patch':'20.0','image':'promo-20-0-vivant.png','original':'promo-20-0.png','animation':'promo-20-0-anime.mp4','platforms':['Site PC et mobile','Windows 0.6.0','Android 0.3.0','iPhone 2.0']}
manifest['images']=[entry]+[item for item in manifest['images'] if item['id']!='20-0']
promo_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
app_path=web/'app-17v01.js';app=app_path.read_text(encoding='utf-8');needle='for(const [title,text]of ['
info="\n['Le lecteur 20.0','Sur grand écran, la pochette accompagne les paroles à gauche ; sur téléphone, elle reste en petit en haut à droite. Les options des paroles regroupent la visibilité de 0 à 100, les transitions et les contributions. Les phrases et voix secondaires suivent leurs minutages enregistrés.'],"
if info not in app:
 if needle not in app:raise RuntimeError('Infos insertion anchor missing')
 app=app.replace(needle,needle+info,1)
app_path.write_text(app,encoding='utf-8')
print('Release metadata and platform histories prepared. Promo catalogue is LOCAL ONLY until all distributions are verified and released.')
