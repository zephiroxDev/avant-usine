from pathlib import Path
import json,zipfile
root=Path(__file__).parent/'projet';web=root/'work/github-sync-import';out=root/'outputs/19v03';prefix='window.AU_PLATFORM_HISTORIES='
p=web/'histories-17v01.js';current=json.loads(p.read_text(encoding='utf-8')[len(prefix):].strip().rstrip(';'))
with zipfile.ZipFile("C:/Users/User/Documents/sauvegarde avant l'usine/Avant-usine-transfert-19V02-2026-10-12.zip") as z:old=json.loads(z.read('work/github-sync-import/histories-17v01.js').decode()[len(prefix):].strip().rstrip(';'))
for key in current:current[key]=[current[key][0]]+old[key]
p.write_text(prefix+json.dumps(current,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
entries=[]
for name in ['app-17v01.js','local-18v00.js','studio-19v00.js','histories-17v01.js','promo-manifest.json']:
 for pre in ['','work/github-sync-import/']:entries.append({'path':pre+name,'content':(web/name).read_text(encoding='utf-8')})
for platform,notes in [('desktop-app',['NOTES-19V03.md','NOTES-WINDOWS.md']),('android-app',['NOTES-0.2.4.md']),('ios-app',['NOTES-1.1.5.md'])]:
 for name in ['release.json','package.json','patch-notes.json']+notes+(['package-lock.json'] if platform=='android-app' else []):entries.append({'path':f'work/{platform}/{name}','content':(root/'work'/platform/name).read_text(encoding='utf-8')})
p=out/'correction-payload.json';p.write_text(json.dumps(entries,ensure_ascii=False),encoding='utf-8');print(json.dumps({'entries':len(entries),'chars':len(p.read_text(encoding='utf-8'))}))
