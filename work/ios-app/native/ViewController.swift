import Capacitor
import Foundation

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(IOSUpdatesPlugin())
        if #available(iOS 16.2, *) { bridge?.registerPluginInstance(LiveLyricsPlugin()) }
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
            (()=>{const s={updates:typeof window.Capacitor?.Plugins?.IOSUpdates?.checkReleases==='function',download:typeof window.Capacitor?.Plugins?.IOSUpdates?.download==='function',crypto:typeof window.crypto?.subtle?.encrypt==='function',backup:typeof window.AU_BACKUP_18?.encrypt==='function',force:!!document.getElementById('forceAppUpdate'),lyrics:typeof window.Capacitor?.Plugins?.LiveLyrics?.setSource==='function',readyState:document.readyState};
            if(s.lyrics&&!window.__nativeLyricsStarted){window.__nativeLyricsStarted=true;(async()=>{const result=await window.Capacitor.Plugins.LiveLyrics.setSource({source:{id:'__native-lyrics-test',title:'Test des paroles',lines:[...Array.from({length:8},(_,i)=>'Phrase de test numéro '+(i+1)),'Un back'],times:[0,10,20,30,40,50,60,70,5],ends:[10,20,30,40,50,60,70,80,9],curves:[...Array.from({length:8},(_,i)=>[[0,i*10],[23,(i+1)*10]]),[[0,5],[7,9]]],tracks:[...Array(8).fill('main'),'backs'],duration:90,position:2,rate:1,playing:true,enabled:true,highlight:!!localStorage.getItem('__native-persistence-test'),transition:'fade'}});if(!result.activityStarted)throw Error('Live Activity was not started');window.__nativeLyricsVerified=true;
            const count=8000*90,b=new Uint8Array(44+count*2),v=new DataView(b.buffer);const text=(n,t)=>{for(let i=0;i<t.length;i++)b[n+i]=t.charCodeAt(i);};text(0,'RIFF');v.setUint32(4,b.length-8,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,count*2,true);for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.round(Math.sin(i*2*Math.PI*440/8000)*1000),true);
            let encoded='';for(let i=0;i<b.length;i+=8192)encoded+=String.fromCharCode(...b.subarray(i,i+8192));const n=window.Capacitor.Plugins.LiveLyrics;
            await n.preparePlayback({key:'__native-lyrics-test',data:btoa(encoded),extension:'wav'});await n.armPlayback({key:'__native-lyrics-test',position:2,rate:1,volume:.1,start:0,end:90,fadeIn:0,fadeOut:0});await n.commitPlayback({key:'__native-lyrics-test'});await new Promise(r=>setTimeout(r,1800));const diagnostics=await n.diagnostics();if(!diagnostics.nativeAudio||diagnostics.position<3)throw Error('Native audio clock did not advance');window.__nativeRelayVerified=true;
            })().catch(e=>window.__nativeLyricsError=String(e));}
            if(s.crypto&&window.AU_LOCAL_STORAGE_18&&window.AU_LOCAL_18&&!window.__nativeStorageStarted){window.__nativeStorageStarted=true;(async()=>{const db=await AU_LOCAL_18.openStore(),key='__native-persistence-test';let req;await AU_LOCAL_18.transaction(db,['tracks'],'readonly',tx=>req=tx.objectStore('tracks').get(key));
            if(!localStorage.getItem(key)){const source=new File([new Uint8Array([1,2,3,4,255])],'original.wav',{type:'audio/wav'}),value=await AU_LOCAL_STORAGE_18.encode({id:key,title:'Persistence test',name:'original.wav',blob:source,cover:{blob:new Blob(['cover'])},lyrics:{lines:['Words'],times:[1]},favorite:true,order:999999});await AU_LOCAL_18.transaction(db,['tracks'],'readwrite',tx=>tx.objectStore('tracks').put(value));localStorage.setItem(key,'seeded');window.__nativeSeed=true;}
            else{const value=await AU_LOCAL_STORAGE_18.decode(req.result);if(!value||value.blob.size!==5||new Uint8Array(await value.blob.arrayBuffer())[4]!==255||await value.cover.blob.text()!=='cover'||value.lyrics.lines[0]!=='Words')throw Error('Native restart lost audio or associated data');const zip=await AU_LOCAL_18.zip([{name:'original.wav',blob:value.blob},{name:'cover.png',blob:value.cover.blob}]);if(zip.size<5)throw Error('Native ZIP failed');await AU_LOCAL_18.transaction(db,['tracks'],'readwrite',tx=>tx.objectStore('tracks').delete(key));localStorage.removeItem(key);window.__nativeVerified=true;}db.close();})().catch(e=>window.__nativeStorageError=String(e));}
            return {...s,nativeSeed:!!window.__nativeSeed,nativeVerified:!!window.__nativeVerified,nativeError:window.__nativeStorageError||window.__nativeLyricsError||'',lyricsActivity:!!window.__nativeLyricsVerified,nativeRelay:!!window.__nativeRelayVerified};})()
            """
            self.webView?.evaluateJavaScript(script) { value, error in
                var state = value as? [String: Any] ?? [:]
                if let error = error { state["error"] = error.localizedDescription }
                let ready = ["updates", "download", "crypto", "backup", "force", "lyrics"].allSatisfy { state[$0] as? Bool == true } && state["lyricsActivity"] as? Bool == true && state["nativeRelay"] as? Bool == true && (state["nativeSeed"] as? Bool == true || state["nativeVerified"] as? Bool == true)
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
