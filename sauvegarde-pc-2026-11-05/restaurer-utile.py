from pathlib import Path
import zipfile,json
archive=Path("C:/Users/User/Documents/sauvegarde avant l'usine/Avant-usine-transfert-19V02-2026-10-12.zip")
root=Path('C:/Users/User/Desktop/Avant-l-usine/projet')
# Empreinte integrale deja verifiee avant cette restauration dans le meme tour.
assert archive.stat().st_size==6037582145
excluded_prefixes=('work/desktop-app/site/','work/android-app/site/','work/ios-app/site/','work/android-app/releases/','work/ios-app/ios/App/App/public/','work/android-app/android/app/src/main/assets/public/')
code_extensions={'.py','.js','.mjs','.cjs','.ps1','.json','.md','.txt','.html','.css','.yml','.yaml','.toml'}
selected=[];excluded=[]
with zipfile.ZipFile(archive) as z:
 for item in z.infolist():
  name=item.filename;p=Path(name)
  keep=not name.startswith(excluded_prefixes)
  if name.startswith('outputs/'):
   keep=name.startswith('outputs/19v02/') and p.suffix.lower() in {'.json','.md','.txt','.log'} and item.file_size<1000000
  if name.startswith('work/mine-sync/'):
   keep=p.suffix.lower() in code_extensions and item.file_size<1000000
  if p.suffix.lower() in {'.exe','.msi','.apk','.ipa','.zip','.aar','.jar','.dex','.class','.dll','.so','.pdb','.b64'}:keep=False
  if not keep:excluded.append(name);continue
  assert (root/name).resolve().is_relative_to(root.resolve())
  z.extract(item,'\\\\?\\'+str(root))
  selected.append(name)
 for n in ['AGENTS.md','REPRISE.md','GUIDE-TRANSFERT-COMPLET.txt','HABITUDES-UTILISATEUR.txt','work/github-sync-import/index.html','work/desktop-app/package.json','work/android-app/package.json','work/ios-app/package.json']:
  assert (root/n).read_bytes()==z.read(n),n
report={'restoredUseful':True,'files':len(selected),'bytes':sum((root/n).stat().st_size for n in selected),'excludedCount':len(excluded),'root':str(root),'archivePreserved':True,'regenerateNativeCopies':True}
(root.parent/'restauration-utile.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
