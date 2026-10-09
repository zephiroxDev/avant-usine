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
            self.webView?.evaluateJavaScript("({updates:typeof window.Capacitor?.Plugins?.IOSUpdates?.checkReleases === 'function',download:typeof window.Capacitor?.Plugins?.IOSUpdates?.download === 'function',crypto:typeof window.crypto?.subtle?.encrypt === 'function',backup:typeof window.AU_BACKUP_18?.encrypt === 'function',force:!!document.getElementById('forceAppUpdate'),readyState:document.readyState})") { value, error in
                var state = value as? [String: Any] ?? [:]
                if let error = error { state["error"] = error.localizedDescription }
                let ready = ["updates", "download", "crypto", "backup", "force"].allSatisfy { state[$0] as? Bool == true }
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
