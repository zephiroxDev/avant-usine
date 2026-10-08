from pathlib import Path
import json, plistlib
from PIL import Image
root=Path(__file__).resolve().parents[1]
release=json.loads((root/'release.json').read_text())
app=root/'ios/App/App'
p=app/'Info.plist'
info=plistlib.loads(p.read_bytes())
info.update(CFBundleDisplayName='Avant l’usine', CFBundleShortVersionString=release['version'],
            CFBundleVersion=str(release['buildNumber']), UIFileSharingEnabled=True,
            LSSupportsOpeningDocumentsInPlace=True)
p.write_bytes(plistlib.dumps(info))
privacy={'NSPrivacyTracking':False,'NSPrivacyCollectedDataTypes':[],
         'NSPrivacyAccessedAPITypes':[{'NSPrivacyAccessedAPIType':'NSPrivacyAccessedAPICategoryFileTimestamp',
                                     'NSPrivacyAccessedAPITypeReasons':['C617.1']}]}
(app/'PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps(privacy))
icons=app/'Assets.xcassets/AppIcon.appiconset'
icons.mkdir(parents=True,exist_ok=True)
with Image.open(root/'../desktop-app/build/logo-source.jpg') as image:
    image.convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS).save(icons/'AppIcon.png')
(icons/'Contents.json').write_text(json.dumps({'images':[{'filename':'AppIcon.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}}))
print('iPhone/iPad version and HD icon configured.')
