import Capacitor
import Foundation

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(IOSUpdatesPlugin())
    }

    #if DEBUG
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        probeBridge(remaining: 60)
    }
    private func probeBridge(remaining: Int) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self = self else { return }
            let script = """
            (()=>{const s={updates:typeof window.Capacitor?.Plugins?.IOSUpdates?.checkReleases==='function',download:typeof window.Capacitor?.Plugins?.IOSUpdates?.download==='function',crypto:typeof window.crypto?.subtle?.encrypt==='function',backup:typeof window.AU_BACKUP_18?.encrypt==='function',force:!!document.getElementById('forceAppUpdate'),readyState:document.readyState};
            if(s.crypto&&window.AU_LOCAL_STORAGE_18&&window.AU_LOCAL_18&&!window.__nativeStorageStarted){window.__nativeStorageStarted=true;(async()=>{const db=await AU_LOCAL_18.openStore(),key='__native-persistence-test';let req;await AU_LOCAL_18.transaction(db,['tracks'],'readonly',tx=>req=tx.objectStore('tracks').get(key));
            if(!localStorage.getItem(key)){const source=new File([new Uint8Array([1,2,3,4,255])],'original.wav',{type:'audio/wav'}),value=await AU_LOCAL_STORAGE_18.encode({id:key,title:'Persistence test',name:'original.wav',blob:source,cover:{blob:new Blob(['cover'])},lyrics:{lines:['Words'],times:[1]},favorite:true,order:999999});await AU_LOCAL_18.transaction(db,['tracks'],'readwrite',tx=>tx.objectStore('tracks').put(value));localStorage.setItem(key,'seeded');window.__nativeSeed=true;}
            else{const value=await AU_LOCAL_STORAGE_18.decode(req.result);if(!value||value.blob.size!==5||new Uint8Array(await value.blob.arrayBuffer())[4]!==255||await value.cover.blob.text()!=='cover'||value.lyrics.lines[0]!=='Words')throw Error('Native restart lost audio or associated data');const zip=await AU_LOCAL_18.zip([{name:'original.wav',blob:value.blob},{name:'cover.png',blob:value.cover.blob}]);if(zip.size<5)throw Error('Native ZIP failed');await AU_LOCAL_18.transaction(db,['tracks'],'readwrite',tx=>tx.objectStore('tracks').delete(key));localStorage.removeItem(key);window.__nativeVerified=true;}db.close();})().catch(e=>window.__nativeStorageError=String(e));}
            return {...s,nativeSeed:!!window.__nativeSeed,nativeVerified:!!window.__nativeVerified,nativeError:window.__nativeStorageError||''};})()
            """
            self.webView?.evaluateJavaScript(script) { value, error in
                var state = value as? [String: Any] ?? [:]
                if let error = error { state["error"] = error.localizedDescription }
                let ready = ["updates", "download", "crypto", "backup", "force"].allSatisfy { state[$0] as? Bool == true } && (state["nativeSeed"] as? Bool == true || state["nativeVerified"] as? Bool == true)
                state["ready"] = ready
                if let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
                   let data = try? JSONSerialization.data(withJSONObject: state) {
                    try? data.write(to: directory.appendingPathComponent("au-debug-probe.json"), options: .atomic)
                }
                if ready { NSLog("AU_IOS_UPDATES_READY") }
                else if remaining > 0 { self.probeBridge(remaining: remaining - 1) }
                else { NSLog("AU_IOS_UPDATES_MISSING") }
            }
        }
    }
    #endif
}
