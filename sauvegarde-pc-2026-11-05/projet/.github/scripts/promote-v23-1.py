"""Publish the exact V23.1 artifacts; never compile during promotion."""
from pathlib import Path
import json,os,subprocess,sys,hashlib,shutil,zipfile,time
platform=sys.argv[1];repo=os.environ['GH_REPO'];root=Path.cwd()
proof=json.loads(Path('.github/v23-1-release.json').read_text());source=proof['sourceCommit'];run_id=proof['runId']
def gh(*args):return subprocess.check_output(['gh',*map(str,args)],text=True)
def api(path):return json.loads(gh('api','repos/'+repo+'/'+path))
run=api('actions/runs/'+str(run_id))
assert run['head_sha']==source and run['head_branch']=='release/v23-1'
assert run['path']=='.github/workflows/v23-1-validation.yml'
# Destinations publish independently once their own required jobs succeed.
# Wait for an active job, but never accept a failed, skipped or cancelled job.
deadline=time.monotonic()+30*60
while True:
    jobs=api('actions/runs/'+str(run_id)+'/jobs?per_page=100')['jobs']
    required=[next(j for j in jobs if j['name']==name) for name in ['server-tests','ios' if platform=='ios' else 'windows']]
    if all(j['status']=='completed' and j['conclusion']=='success' for j in required):break
    assert not any(j['status']=='completed' and j['conclusion']!='success' for j in required), required
    assert time.monotonic()<deadline, 'Validation did not finish before the promotion deadline'
    print('Waiting for verified '+platform+' artifact',flush=True);time.sleep(45)
prefixes=('work/experience-integration/', 'work/'+('experience-ios' if platform=='ios' else 'desktop-app')+'/')
def product(sha):
    tree=api('git/trees/'+sha+'?recursive=1');assert not tree.get('truncated')
    return {e['path']:e['sha'] for e in tree['tree'] if e['type']=='blob' and e['path'].startswith(prefixes)}
assert product(source)==product(os.environ['GITHUB_SHA']), 'Source changed after validation'
name='iphone-v23-1-candidate' if platform=='ios' else 'windows-v23-1-candidate'
artifacts=api('actions/runs/'+str(run_id)+'/artifacts')['artifacts']
artifact=next(a for a in artifacts if a['name']==name and not a['expired'])
assert artifact['workflow_run']['head_sha']==source
target=root/'outputs/v23-1-verified-artifacts'/platform;target.mkdir(parents=True,exist_ok=True)
subprocess.run(['gh','run','download',str(run_id),'--repo',repo,'--name',name,'--dir',str(target)],check=True)
def find(name):
    matches=list(target.rglob(name));assert len(matches)==1,(name,len(matches));return matches[0]
if platform=='ios':
    folder=root/'work/experience-ios';release=json.loads((folder/'release.json').read_text());ipa_name='Avant-Usine-iOS-'+release['version']+'-non-signe.ipa'
    ipa=find(ipa_name);meta=json.loads(find('livraison.json').read_text());data=ipa.read_bytes()
    assert meta['version']==release['version'] and meta['file']==ipa_name and meta['bytes']==len(data)
    assert hashlib.sha256(data).hexdigest()==meta['sha256']
    with zipfile.ZipFile(ipa) as archive:assert archive.testzip() is None
    build=folder/'build';build.mkdir(exist_ok=True);shutil.copyfile(ipa,build/ipa_name)
    site=folder/'site';site.mkdir(exist_ok=True);(site/'ios.js').write_text((folder/'web/ios.js').read_text().replace('__IOS_VERSION__',release['version']))
    subprocess.run([sys.executable,'scripts/verify-ipa.py',str(build/ipa_name)],cwd=folder,check=True)
    meta.update(validationCommit=source,validationRun=run_id,deviceTested=False)
    (build/'livraison.json').write_text(json.dumps(meta))
    subprocess.run([sys.executable,'scripts/publish-release.py'],cwd=folder,check=True)
else:
    folder=root/'work/desktop-app';release=json.loads((folder/'release.json').read_text());version=release['desktopVersion'];out=root/'outputs/application-windows';out.mkdir(parents=True,exist_ok=True)
    names=['Avant-Usine-Installation-'+version+'.exe','Avant-Usine-Portable-'+version+'.exe','Avant-Usine-Site-'+release['releaseId']+'.zip','Avant-Usine-Sources-Windows-'+version+'.zip','livraison.json']
    for name in names:shutil.copyfile(find(name),out/name)
    manifest=find('Avant-Usine-Mise-a-jour-'+version+'.json');updates=root/('outputs/application-windows-'+version+'/update-assets');updates.mkdir(parents=True,exist_ok=True)
    for file in manifest.parent.iterdir():
        if file.is_file():shutil.copyfile(file,updates/file.name)
    env=os.environ.copy();env['RELEASE_COMMIT']=os.environ['GITHUB_SHA']
    subprocess.run(['pwsh','-NoProfile','-File',str(folder/'scripts/publish-ci.ps1')],env=env,check=True)
print('Verified V23.1 artifact published: '+platform)
