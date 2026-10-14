"""Promote an already tested IPA; never rebuild or accept a different product tree."""
from pathlib import Path
import json, os, subprocess, hashlib, shutil, zipfile

def gh(*args): return subprocess.check_output(['gh', *args], text=True)
def api(path): return json.loads(gh('api', path))
repo=os.environ['GH_REPO']; expected=json.loads(Path('verified-release.json').read_text()); release=json.loads(Path('release.json').read_text())
run=api(f"repos/{repo}/actions/runs/{expected['runId']}")
assert run['conclusion']=='success' and run['status']=='completed'
assert run['head_sha']==expected['sourceCommit'] and run['head_branch']=='verify/19v07-ios'
assert run['path']=='.github/workflows/ios-lyrics-19v07-validation.yml'
def product_tree(sha):
    tree=api(f'repos/{repo}/git/trees/{sha}?recursive=1');assert not tree.get('truncated')
    ignored={'work/ios-app/verified-release.json','work/ios-app/scripts/publish-verified.py','work/ios-app/scripts/publish-release.py'}
    prefixes=('work/ios-app/','work/github-sync-import/','work/android-app/web/','work/android-app/scripts/','work/android-app/assets/','work/desktop-app/build/')
    return {e['path']:e['sha'] for e in tree['tree'] if e['type']=='blob' and e['path'] not in ignored and (e['path'].startswith(prefixes) or e['path']=='work/desktop-app/scripts/desktop-copy.cjs' or e['path']=='work/mine-sync/check-promo.cjs')}
assert product_tree(expected['sourceCommit'])==product_tree(os.environ['GITHUB_SHA']), 'Product changed after validation'
artifacts=api(f"repos/{repo}/actions/runs/{expected['runId']}/artifacts")['artifacts']
artifact=next(a for a in artifacts if a['name']=='ios-verified' and not a['expired'])
assert artifact['workflow_run']['head_sha']==expected['sourceCommit']
folder=Path('build/verified');folder.mkdir(parents=True,exist_ok=True)
subprocess.run(['gh','run','download',str(expected['runId']),'--repo',repo,'--name','ios-verified','--dir',str(folder)],check=True)
name=f"Avant-Usine-iOS-{release['version']}-non-signe.ipa"
matches=list(folder.rglob(name)); metadata=list(folder.rglob('livraison.json'));assert len(matches)==len(metadata)==1
m=json.loads(metadata[0].read_text());data=matches[0].read_bytes()
assert m['file']==name and m['version']==release['version'] and len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256']
with zipfile.ZipFile(matches[0]) as archive: assert archive.testzip() is None
target=Path('build')/name;shutil.copyfile(matches[0],target)
Path('site').mkdir(exist_ok=True);Path('site/ios.js').write_text(Path('web/ios.js').read_text().replace('__IOS_VERSION__',release['version']))
subprocess.run(['python','scripts/verify-ipa.py',str(target)],check=True)
meta=json.loads(Path('build/livraison.json').read_text());meta['validationCommit']=expected['sourceCommit'];meta['validationRun']=expected['runId'];Path('build/livraison.json').write_text(json.dumps(meta))
env=os.environ.copy()
subprocess.run(['python','scripts/publish-release.py'],env=env,check=True)
print('Published the exact IPA verified by run '+str(expected['runId']))

