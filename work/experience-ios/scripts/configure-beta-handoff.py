"""Private test only: hand off real audio natively before WebKit suspension."""
from pathlib import Path
import json,runpy
r=Path(__file__).resolve().parents[1]
runpy.run_path(str(r/'scripts/configure-beta-20.py'))
m=json.loads((r/'release.json').read_text());m.update(version='2.0.3',buildNumber=34,releaseId='20.0.3',channel='creator-testing')
(r/'release.json').write_text(json.dumps(m,indent=2))
for name in ['scripts/configure-lyrics.cjs','scripts/verify-ipa.py']:
 p=r/name;s=p.read_text();s=s.replace('.lyrics.betatest1','.lyrics.betatest3').replace('betatesting 20.0.2','betatesting 20.0.3');p.write_text(s)
p=r/'scripts/configure-plist.py';p.write_text(p.read_text().replace('betatesting 20.0.2','betatesting 20.0.3'))
p=r/'native/LyricsWidget.swift';p.write_text(p.read_text().replace('BÊTA TEST 1','BÊTA TEST 3').replace('Text("T1")','Text("T3")'))
p=r/'native/LiveLyrics.swift';s=p.read_text().replace('import UIKit','import UIKit\nimport WebKit')
needle='        var enabled: Bool; var highlight: Bool; var transition: String'
assert needle in s
s=s.replace(needle,needle+'\n        var volume: Double?; var start: Double?; var end: Double?\n        var fadeIn: Double?; var fadeOut: Double?; var sleepDeadline: Double?')
s=s.replace('    private var lastStopReason = "aucun"','    private var lastStopReason = "aucun"\n    private var nativeHandoffPending = false\n    private var nativeHandoffError = "aucune"\n    private var handoffIntentID: String?\n    private var handoffIntentUntil = 0.0')
needle='                self.notifyListeners("applicationState", data: ["active": false])'
assert needle in s
s=s.replace(needle,'                self.handoffIntentID = self.source?.id; self.handoffIntentUntil = ProcessInfo.processInfo.systemUptime + 5\n'+needle+'\n                self.beginNativeHandoff()')
needle='                self.backgroundLastPosition = self.backgroundFirstPosition'
assert needle in s
s=s.replace(needle,needle+'\n                self.beginNativeHandoff()')
# willResignActive can still observe .active. Retry at the actual background boundary.
s=s.replace('"updates": updateCount]', '"updates": updateCount, "handoffError": nativeHandoffError, "handoffPending": nativeHandoffPending, "preparedKey": audio.key, "sourceID": s.id]')
needle='                self.notifyListeners("applicationState", data: ["active": true])'
s=s.replace(needle,'                self.handoffIntentID = nil; self.handoffIntentUntil = 0\n                self.notifyListeners("applicationState", data: ["active": true, "nativeOwned": self.audio.ownsPlayback, "key": self.audio.key, "playing": self.audio.playing])')
needle='            self?.lastStopReason = call.getString("reason") ?? "demande du lecteur"'
assert needle in s
s=s.replace(needle,'''            if let self = self, self.audio.ownsPlayback, self.audio.playing,
               call.getString("reason") == "paroles ou piste absentes après délai de chargement" {
                // A temporarily absent WebView cache must not stop real native audio.
                call.resolve(); return
            }
'''+needle)
needle='            self.refresh(); call.resolve(["ready": true, "activityStarted": self.activity != nil])'
assert needle in s
s=s.replace(needle,needle+'; self.beginNativeHandoff()')
needle='            self.source = value; self.anchor = ProcessInfo.processInfo.systemUptime; self.refresh(); call.resolve()'
assert needle in s
s=s.replace(needle,'''            if let volume = call.getDouble("volume"), volume.isFinite { value.volume = max(0,min(1,volume)) }
            if let start = call.getDouble("start"), start.isFinite { value.start = start }
            if let end = call.getDouble("end"), end.isFinite { value.end = end }
            if let fade = call.getDouble("fadeIn"), fade.isFinite { value.fadeIn = max(0,fade) }
            if let fade = call.getDouble("fadeOut"), fade.isFinite { value.fadeOut = max(0,fade) }
'''+needle+'; self.beginNativeHandoff()')
needle='                self.audio.prepare(key: key, url: url, ownedFile: owned); call.resolve(["prepared": true])'
assert needle in s
s=s.replace(needle,needle+'\n                if UIApplication.shared.applicationState != .active { self.beginNativeHandoff() }')
s=s.replace('"position": self.audio.position,','"position": self.audio.position, "handoffError": self.nativeHandoffError, "handoffPending": self.nativeHandoffPending,')
helper='''    private func beginNativeHandoff() {
        guard UIApplication.shared.applicationState != .active, !nativeHandoffPending, !audio.ownsPlayback else { return }
        guard let s = source, s.enabled else { nativeHandoffError = "paroles absentes ou désactivées au relais"; return }
        let hasIntent = handoffIntentID == s.id && ProcessInfo.processInfo.systemUptime <= handoffIntentUntil
        guard s.playing || hasIntent else { nativeHandoffError = "lecture non demandée au passage en arrière-plan"; return }
        guard audio.key == s.id else { nativeHandoffError = "audio non préparé"; return }
        nativeHandoffPending = true; nativeHandoffError = "aucune"
        let token = generation
        let start = max(0,s.start ?? 0), end = min(s.duration,s.end ?? s.duration)
        guard end > start else { nativeHandoffPending = false; nativeHandoffError = "bornes audio invalides"; return }
        let position = min(end,max(start,s.position + (s.playing ? max(0,ProcessInfo.processInfo.systemUptime-anchor)*s.rate : 0)))
        audio.arm(position: position, rate: s.rate, volume: s.volume ?? 1, start: start, end: end,
                  fadeIn: s.fadeIn ?? 0, fadeOut: s.fadeOut ?? 0, sleepDeadline: s.sleepDeadline) { [weak self] result in
            guard let self = self else { return }
            self.nativeHandoffPending = false
            guard token == self.generation, self.source?.id == s.id,
                  UIApplication.shared.applicationState != .active else { self.finishHandoffTask(); return }
            switch result {
            case .failure(let error):
                self.nativeHandoffError = error.localizedDescription; self.finishHandoffTask()
                // WebKit is not paused when preparation fails.
            case .success:
                do {
                    // Activate the real native player first; no JS promise is required to commit it.
                    try self.audio.commit(title: s.title,duration: s.duration)
                    self.handoffIntentID = nil; self.handoffIntentUntil = 0
                    self.webView?.pauseAllMediaPlayback(completionHandler: nil)
                    self.notifyListeners("nativeOwnership",data:["key":s.id,"playing":true])
                    self.finishHandoffTask(); self.refresh()
                } catch {
                    self.nativeHandoffError = error.localizedDescription; self.finishHandoffTask()
                }
            }
        }
    }
'''
s=s.replace('    @objc func availability(_ call: CAPPluginCall) {',helper+'    @objc func availability(_ call: CAPPluginCall) {')
p.write_text(s)
p=r/'web/lyrics-island.js';s=p.read_text()
s=s.replace("return {id:s.key", "const range=window.AU_AUDIO_EDITS_19?.normalize(s.audioEdit,s.audio.duration)||{};let deadline=null;try{deadline=JSON.parse(localStorage.getItem('au-sleep-18v05')||'null')?.deadline||null;}catch{}return {volume:s.audio.muted?0:s.audio.volume,...range,sleepDeadline:deadline,id:s.key")
s=s.replace('position:s.position,rate:s.rate,playing:s.playing,enabled,highlight,transition:s.transition','position:s.position,rate:s.rate,playing:s.playing,volume:s.volume,start:s.start,end:s.end,fadeIn:s.fadeIn,fadeOut:s.fadeOut,enabled,highlight,transition:s.transition')
s=s.replace("' · Dernier arrêt : '","' · Relais natif autonome : '+(d.handoffPending?'préparation':d.handoffError||'aucune erreur')+' · Dernier arrêt : '")
p.write_text(s)
p=r/'web/lyrics-audio.js';s=p.read_text()
s=s.replace("if(phase||!(document.hidden||inactive))return;","return; // Private beta: native lifecycle owns the background handoff.\n if(phase||!(document.hidden||inactive))return;")
s=s.replace('await native.preparePlayback(options);prepared=id;','await native.preparePlayback(options);prepared=id;owner=s;')
needle="native.addListener('applicationState',event=>{inactive=!event.active;queue(()=>event.active?foreground():background());});"
assert needle in s
s=s.replace(needle,"""native.addListener('nativeOwnership',event=>{const s=window.AU_PLAYBACK_SOURCE_19?.()||owner;if(s?.key===event.key){owner=s;phase='native';nativePlaying=!!event.playing;}});
native.addListener('applicationState',event=>{inactive=!event.active;if(event.active&&event.nativeOwned){const s=window.AU_PLAYBACK_SOURCE_19?.()||owner;if(s?.key===event.key){owner=s;phase='native';nativePlaying=!!event.playing;}}queue(()=>event.active?foreground():background());});""")
p.write_text(s)
# Exercise the actual HTML player and production JS preparation before backgrounding.
p=r/'native/ViewController.swift';s=p.read_text()
prefix='const result=await window.Capacitor.Plugins.LiveLyrics.setSource({source:'
start=s.index(prefix);end=s.index(';if(!result.activityStarted)',start)
fixture=s[start+len(prefix):end][:-2]
s=s[:start]+'const fixture='+fixture+';const result=await window.Capacitor.Plugins.LiveLyrics.setSource({source:fixture})'+s[end:]
start=s.index("let encoded='';");end=s.index('window.__nativeRelayVerified=true;',start)
actual='''const a=document.getElementById('audio'),native=window.Capacitor.Plugins.LiveLyrics;
              a.src=URL.createObjectURL(new Blob([b],{type:'audio/wav'}));a.volume=.1;
              const raw={key:fixture.id,title:fixture.title,audio:a,data:{lines:fixture.lines,times:fixture.times,line_ends:fixture.ends,curves:fixture.curves,sync_mode:fixture.highlight?'highlight':'blocks',line_tracks:fixture.tracks}};
              window.AU_PLAYBACK_SOURCE_19=()=>raw;
              const boxes=document.querySelectorAll('.au-island-settings input[type=checkbox]');
              if(boxes.length!==2)throw Error('Real lyrics settings missing');
              boxes[0].checked=true;boxes[1].checked=fixture.highlight;boxes[1].dispatchEvent(new Event('change'));
              await a.play();a.currentTime=2;await window.AU_ISLAND_AUDIO_19.prepare(raw);
              await new Promise(resolve=>setTimeout(resolve,1500));
              if(a.paused||a.currentTime<2.5)throw Error('Actual HTML audio did not start');
              const before=await native.diagnostics();if(before.nativeAudio)throw Error('Native audio unexpectedly owns foreground HTML test');
              '''
s=s[:start]+actual+s[end:];p.write_text(s)
print('Private beta 20.0.3 test 3: actual HTML-to-native handoff and bounded playback intent, no public update')
