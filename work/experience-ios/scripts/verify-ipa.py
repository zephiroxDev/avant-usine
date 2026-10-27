from pathlib import Path
import hashlib,json,plistlib,sys,zipfile
p=Path(sys.argv[1]);release=json.loads(Path('release.json').read_text())
with zipfile.ZipFile(p) as archive:
    assert archive.testzip() is None, 'Corrupt archive'
    names=archive.namelist()
    info=plistlib.loads(archive.read('Payload/App.app/Info.plist'))
    assert info['CFBundleIdentifier']=='dev.zephirox.avantusine.ios'
    assert info['CFBundleShortVersionString']==release['version']
    assert str(info['CFBundleVersion'])==str(release['buildNumber'])
    assert info['CFBundleDisplayName']==('betatesting Avant l’usine' if release.get('channel')=='creator-testing' else 'Avant l’usine')
    assert info['UIDeviceFamily']==[1,2]
    assert 'iPhoneOS' in info['CFBundleSupportedPlatforms']
    assert archive.read('Payload/App.app/'+info['CFBundleExecutable'])[:4] in [b'\xcf\xfa\xed\xfe',b'\xca\xfe\xba\xbe',b'\xca\xfe\xba\xbf'], 'Not a device executable'
    assert not any('_CodeSignature/' in n or n.endswith('embedded.mobileprovision') for n in names)
    assert archive.read('Payload/App.app/public/ios.js').decode('utf-8').replace('\r\n','\n')==Path('site/ios.js').read_text(encoding='utf-8')
    assert 'Payload/App.app/PrivacyInfo.xcprivacy' in names
    assert 'Payload/App.app/PlugIns/LyricsIsland.appex/Info.plist' in names, 'Lyrics Live Activity extension missing'
    widget=plistlib.loads(archive.read('Payload/App.app/PlugIns/LyricsIsland.appex/Info.plist'))
    assert widget['NSExtension']['NSExtensionPointIdentifier']=='com.apple.widgetkit-extension'
    assert widget['CFBundleShortVersionString']==release['version']
    assert str(widget['CFBundleVersion'])==str(release['buildNumber'])
    assert widget['CFBundleIdentifier']=='dev.zephirox.avantusine.ios.lyrics'
    executable='Payload/App.app/PlugIns/LyricsIsland.appex/'+widget['CFBundleExecutable']
    assert archive.read(executable)[:4] in [b'\xcf\xfa\xed\xfe',b'\xca\xfe\xba\xbe',b'\xca\xfe\xba\xbf'], 'Lyrics widget executable missing or invalid'
    assert 'AppIconLegacy' in info.get('CFBundleIcons',{}).get('CFBundleAlternateIcons',{}), 'Alternate launcher icon missing'
    assert info.get('NSSupportsLiveActivities') is True
    assert not any(n.endswith('.p12') for n in names)
metadata={'platform':'ios','version':release['version'],'unsigned':True,'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'deviceTested':False}
p.with_name('livraison.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata))
