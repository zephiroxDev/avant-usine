import Capacitor
import Foundation

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(IOSUpdatesPlugin())
    }

    #if DEBUG
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        probeBridge(remaining: 10)
    }
    private func probeBridge(remaining: Int) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self = self else { return }
            self.webView?.evaluateJavaScript("typeof window.Capacitor?.Plugins?.IOSUpdates?.checkReleases === 'function' && typeof window.Capacitor?.Plugins?.IOSUpdates?.download === 'function' && typeof window.crypto?.subtle?.encrypt === 'function' && typeof window.AU_BACKUP_18?.encrypt === 'function' && !!document.getElementById('forceAppUpdate')") { value, _ in
                if value as? Bool == true { NSLog("AU_IOS_UPDATES_READY") }
                else if remaining > 0 { self.probeBridge(remaining: remaining - 1) }
                else { NSLog("AU_IOS_UPDATES_MISSING") }
            }
        }
    }
    #endif
}
