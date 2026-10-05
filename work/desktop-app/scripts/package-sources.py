from pathlib import Path
import os,json,zipfile
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
output=root.parents[1]/'outputs/application-windows'
output.mkdir(exist_ok=True)
with zipfile.ZipFile(output/f'Avant-Usine-Sources-Windows-{version}.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for current,dirs,files in os.walk(root):
        dirs[:]=[name for name in dirs if name not in ('node_modules','site','.git')]
        for name in files:
            file=Path(current)/name
            archive.write(file,file.relative_to(root))
print('Sources Windows archivées')
