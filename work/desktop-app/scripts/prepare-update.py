from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
output=root.parents[1]/'outputs'/f'application-windows-{version}'/'update-assets'
output.mkdir(parents=True,exist_ok=True)
files=[root/'product.cjs',*sorted((root/'site').glob('*'))]
manifest={'format':1,'version':version,'files':[]}
for file in files:
    if not file.is_file():continue
    data=file.read_bytes();digest=hashlib.sha256(data).hexdigest();name=f'au-{digest}.bin'
    (output/name).write_bytes(data)
    manifest['files'].append({'path':file.relative_to(root).as_posix(),'bytes':len(data),'sha256':digest,'url':f'https://github.com/zephiroxDev/avant-usine/releases/download/v{version}/{name}'})
(output/f'Avant-Usine-Mise-a-jour-{version}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
# Exercise the existing launcher's validator before building or publishing.
subprocess.run(['node','-e',"const fs=require('node:fs');const m=JSON.parse(fs.readFileSync(process.argv[1]));require('./version-store.cjs').validateManifest(m,m.version);",str(output/f'Avant-Usine-Mise-a-jour-{version}.json')],cwd=root,check=True)
print(f'{len(manifest["files"])} fichiers pour les mises à jour sans réinstallation.')
