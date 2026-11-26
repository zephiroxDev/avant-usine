"""Vérifie l'IPA non signé de l'Atelier et écrit livraison.json."""
from pathlib import Path
import hashlib, json, plistlib, sys, zipfile

racine = Path(__file__).resolve().parents[1]
p = Path(sys.argv[1])
release = json.loads((racine / 'release.json').read_text(encoding='utf-8'))
with zipfile.ZipFile(p) as archive:
    assert archive.testzip() is None, 'Archive abîmée'
    noms = archive.namelist()
    info = plistlib.loads(archive.read('Payload/App.app/Info.plist'))
    assert info['CFBundleIdentifier'] == 'dev.zephirox.avantusine.atelier'
    assert info['CFBundleShortVersionString'] == release['version']
    assert str(info['CFBundleVersion']) == str(release['buildNumber'])
    assert info['CFBundleDisplayName'] == 'Atelier'
    assert info.get('UIFileSharingEnabled') is True
    assert archive.read('Payload/App.app/' + info['CFBundleExecutable'])[:4] in [b'\xcf\xfa\xed\xfe', b'\xca\xfe\xba\xbe', b'\xca\xfe\xba\xbf'], 'Exécutable iPhone absent'
    for f in ['index.html', 'app.js', 'style.css', 'lib/mediabunny-1.62.1.mjs', 'lib/mediabunny-mp3-encoder-1.63.0.mjs', 'polices/Inter.ttf']:
        dans = archive.read('Payload/App.app/public/' + f)
        assert dans == (racine / 'www' / f).read_bytes(), f + ' différent'
    assert not any('_CodeSignature/' in n or n.endswith('embedded.mobileprovision') for n in noms)
meta = {'platform': 'ios', 'app': 'Atelier Avant l’usine', 'version': release['version'], 'unsigned': True,
        'file': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'deviceTested': False}
p.with_name('livraison.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(meta, ensure_ascii=False))
