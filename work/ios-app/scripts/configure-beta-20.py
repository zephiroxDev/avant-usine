"""Generate a private iPhone test package without changing public source identity."""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
p=r/'release.json';m=json.loads(p.read_text());m.update(version='2.0.2',buildNumber=30,releaseId='20.0.2',channel='creator-testing');p.write_text(json.dumps(m,indent=2))
p=r/'scripts/configure-lyrics.cjs';s=p.read_text().replace('dev.zephirox.avantusine.ios.lyrics','dev.zephirox.avantusine.ios.lyrics.betatest1');p.write_text(s)
p=r/'scripts/configure-plist.py';s=p.read_text();s=s.replace("CFBundleDisplayName='Avant l’usine'","CFBundleDisplayName='betatesting 20.0.2'");p.write_text(s)
p=r/'native/LiveLyrics.swift';s=p.read_text();s=s.replace('"build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"]','"build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?", "widgetPresent": self.widgetPresent]')
needle='    @objc func availability(_ call: CAPPluginCall) {'
helper='''    private var widgetPresent: Bool {
        guard let folder = Bundle.main.builtInPlugInsURL,
              let urls = try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil) else { return false }
        return urls.contains { url in
            guard url.pathExtension == "appex", let bundle = Bundle(url: url),
                  let extensionInfo = bundle.infoDictionary?["NSExtension"] as? [String: Any] else { return false }
            return extensionInfo["NSExtensionPointIdentifier"] as? String == "com.apple.widgetkit-extension"
                && (bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String) == (Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String)
        }
    }
'''
s=s.replace(needle,helper+needle).replace('"activitiesEnabled": ActivityAuthorizationInfo().areActivitiesEnabled]','"activitiesEnabled": ActivityAuthorizationInfo().areActivitiesEnabled, "widgetPresent": self.widgetPresent]')
# availability needs an instance capture to inspect the installed bundle.
s=s.replace('@objc func availability(_ call: CAPPluginCall) {\n        DispatchQueue.main.async {','@objc func availability(_ call: CAPPluginCall) {\n        DispatchQueue.main.async { [weak self] in\n            guard let self = self else { call.resolve(); return }')
p.write_text(s)
p=r/'native/LyricsWidget.swift';s=p.read_text();s=s.replace('Text(context.state.title ?? context.attributes.title)','Text("BÊTA TEST 1 · " + (context.state.title ?? context.attributes.title))').replace('Image(systemName: "music.note").foregroundColor(.pink).font(.system(size: 12))','Text("T1").foregroundColor(.pink).font(.system(size: 11, weight: .bold))');p.write_text(s)
p=r/'web/lyrics-island.js';s=p.read_text();s=s.replace("note.textContent='Les activités en direct sont désactivées dans les réglages iOS de cette application.';","note.textContent='Les activités en direct sont désactivées dans les réglages iOS de cette application.';if(supported&&result.widgetPresent===false)note.textContent='Extension des paroles absente ou mauvaise version après installation. Réinstalle cet IPA en conservant ses extensions dans ton outil de signature.';")
s=s.replace("'Application '+(d.appVersion||'?')","'Bêta · Extension : '+(d.widgetPresent?'présente':'absente')+' · Application '+(d.appVersion||'?')")
p.write_text(s)
# Keep the signed IPA out of public release assets and the public version matcher.
p=r/'scripts/verify-ipa.py';s=p.read_text();s=s.replace("'deviceTested':False","'deviceTested':False,'channel':'creator-testing','label':'betatesting 20.0.2'").replace("=='dev.zephirox.avantusine.ios.lyrics'","=='dev.zephirox.avantusine.ios.lyrics.betatest1'");p.write_text(s)
print('Private beta test 1: fresh extension identity, visible native marker and installed-extension check. No claim of a confirmed device fix.')
