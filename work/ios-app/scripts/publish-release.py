from pathlib import Path
import json,os,subprocess
release=json.loads(Path('release.json').read_text());version=release['version']
tag='ios-v'+version
metadata=json.loads(Path('build/livraison.json').read_text());metadata['sourceCommit']=os.environ['GITHUB_SHA'];Path('build/livraison.json').write_text(json.dumps(metadata))
notes=json.loads(Path('patch-notes.json').read_text())[0]
body=notes[2]+'\n\n'+'\n'.join('- '+line for line in notes[3])
body+='\n\nCompilation iPhone/iPad vérifiée. Signature, installation et usage à confirmer sur appareil réel.\nSHA-256 : '+metadata['sha256']
notes_path=Path('build/release-notes.md');notes_path.write_text(body)
def gh(*args):return subprocess.check_output(['gh',*args],text=True)
repo=os.environ['GH_REPO']
def api(endpoint,method='GET',payload=None):
    command=['api',endpoint,'--method',method]
    if payload is not None:
        path=Path(os.environ['RUNNER_TEMP'])/'ios-release-payload.json';path.write_text(json.dumps(payload))
        command+=['--input',str(path)]
    return json.loads(gh(*command))
all_releases=api('repos/'+repo+'/releases?per_page=100')
existing=next((r for r in all_releases if r['tag_name']==tag),None)
if existing and not existing['draft']:
    names={a['name']:a for a in existing['assets']}
    assert metadata['file'] in names and 'livraison.json' in names, 'Published release missing assets'
    assert names[metadata['file']].get('digest')=='sha256:'+metadata['sha256'], 'Existing version differs; increment version'
    print('Verified release already public: '+existing['html_url'])
else:
    if not existing:
        try:
            gh('release','create',tag,'--draft','--prerelease','--latest=false','--target',os.environ['GITHUB_SHA'],'--title','Avant l’usine — iOS '+version+' (IPA à signer)','--notes-file',str(notes_path))
        except subprocess.CalledProcessError:
            # A later infrastructure commit can prevent this runner from tagging an older SHA.
            # Only allow a current-main tag if no product code changed during compilation.
            diff=api('repos/'+repo+'/compare/'+os.environ['GITHUB_SHA']+'...main')
            def infrastructure(path):
                return path.startswith('.github/') or path.startswith('work/android-app/scripts/') or path.startswith('work/android-app/releases/') or path in ['work/ios-app/scripts/publish-release.py'] or path.startswith('promo-') or path.startswith('work/github-sync-import/promo-')
            assert not diff.get('total_commits',0)>100 and all(infrastructure(f['filename']) for f in diff.get('files',[])), 'Product changed during build; refusing to tag a different version'
            gh('release','create',tag,'--draft','--prerelease','--latest=false','--target','main','--title','Avant l’usine — iOS '+version+' (IPA à signer)','--notes-file',str(notes_path))
    gh('release','upload',tag,'build/'+metadata['file'],'build/livraison.json','--clobber')
    draft=next(r for r in api('repos/'+repo+'/releases?per_page=100') if r['tag_name']==tag)
    assets={a['name']:a for a in draft['assets']}
    assert assets[metadata['file']]['size']==metadata['bytes']
    assert assets[metadata['file']].get('digest')=='sha256:'+metadata['sha256']
    assert 'livraison.json' in assets
    published=api('repos/'+repo+'/releases/'+str(draft['id']),'PATCH',{'draft':False,'prerelease':True,'make_latest':'false'})
    print('Published '+published['html_url'])

