"""Réglages iOS de l'Atelier après `cap sync ios` : nom, version, Fichiers, icône."""
from pathlib import Path
import json, plistlib, shutil

racine = Path(__file__).resolve().parents[1]
release = json.loads((racine / 'release.json').read_text(encoding='utf-8'))
app = racine / 'ios/App/App'

p = app / 'Info.plist'
info = plistlib.loads(p.read_bytes())
info.update(
    CFBundleDisplayName='Atelier',
    CFBundleShortVersionString=release['version'],
    CFBundleVersion=str(release['buildNumber']),
    UIFileSharingEnabled=True,               # dossier visible dans l'appli Fichiers
    LSSupportsOpeningDocumentsInPlace=True,
    UIRequiresFullScreen=False,
)
info['UISupportedInterfaceOrientations'] = ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']
info['UISupportedInterfaceOrientations~ipad'] = ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']
info['UIStatusBarStyle'] = 'UIStatusBarStyleLightContent'
info['UIViewControllerBasedStatusBarAppearance'] = False
p.write_bytes(plistlib.dumps(info))

privacy = {'NSPrivacyTracking': False, 'NSPrivacyCollectedDataTypes': [],
           'NSPrivacyAccessedAPITypes': [{'NSPrivacyAccessedAPIType': 'NSPrivacyAccessedAPICategoryFileTimestamp',
                                          'NSPrivacyAccessedAPITypeReasons': ['C617.1']}]}
(app / 'PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps(privacy))

icones = app / 'Assets.xcassets/AppIcon.appiconset'
for f in icones.glob('*.png'):
    f.unlink()
shutil.copy(racine / 'assets/icone-1024.png', icones / 'AppIcon.png')
(icones / 'Contents.json').write_text(json.dumps({'images': [{'filename': 'AppIcon.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}],
                                                  'info': {'author': 'xcode', 'version': 1}}))
print('Atelier configuré :', release['version'], 'build', release['buildNumber'])
