import Foundation
import Capacitor
import CryptoKit
import UIKit
import UserNotifications

@objc(IOSUpdatesPlugin)
public class IOSUpdatesPlugin: CAPPlugin, CAPBridgedPlugin, URLSessionDownloadDelegate, UIDocumentInteractionControllerDelegate, UNUserNotificationCenterDelegate {
    public let identifier = "IOSUpdatesPlugin"
    public let jsName = "IOSUpdates"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkReleases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "accessibility", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAppIcon", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "notificationPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleCampaign", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearCampaignNotifications", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareAudioPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "releaseAudioPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openIn", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?
    private var expectedHash = ""
    private var expectedSize: Int64 = 0
    private var outputName = ""
    private var session: URLSession?
    private var lastProgress = Date.distantPast
    private var documentController: UIDocumentInteractionController?
    private var openCall: CAPPluginCall?
    private var audioPreviews: [String: URL] = [:]

    public override func load() {
        UNUserNotificationCenter.current().delegate = self
        NotificationCenter.default.addObserver(self, selector: #selector(resumed), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(accessibilityChanged), name: UIAccessibility.reduceTransparencyStatusDidChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(accessibilityChanged), name: UIAccessibility.darkerSystemColorsStatusDidChangeNotification, object: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }
    @objc func prepareAudioPreview(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw), url.scheme == "https",
              let host = url.host?.lowercased(), host == "archive.org" || host.hasSuffix(".archive.org") else { call.reject("Source audio non prise en charge pour la copie locale"); return }
        var request = URLRequest(url: url); request.timeoutInterval = 60
        URLSession.shared.downloadTask(with: request) { [weak self] temporary, response, error in
            guard let self = self else { call.reject("Prévisualisation fermée"); return }
            if let error = error { call.reject(error.localizedDescription); return }
            guard let temporary = temporary, let response = response as? HTTPURLResponse,
                  (200...299).contains(response.statusCode), let finalHost = response.url?.host?.lowercased(),
                  finalHost == "archive.org" || finalHost.hasSuffix(".archive.org") else { call.reject("Le fichier audio est inaccessible"); return }
            do {
                let size = try FileManager.default.attributesOfItem(atPath: temporary.path)[.size] as? NSNumber
                guard let size = size, size.intValue > 0, size.intValue <= 64 * 1024 * 1024 else { call.reject("Le fichier dépasse la limite de prévisualisation (64 Mo)"); return }
                let identifier = UUID().uuidString
                let ext = ["mp3", "m4a", "aac", "wav", "flac", "ogg"].contains(url.pathExtension.lowercased()) ? url.pathExtension.lowercased() : "mp3"
                let file = FileManager.default.temporaryDirectory.appendingPathComponent("au-audio-preview-" + identifier).appendingPathExtension(ext)
                try FileManager.default.moveItem(at: temporary, to: file)
                DispatchQueue.main.async { self.audioPreviews[identifier] = file; call.resolve(["id": identifier, "uri": file.absoluteString]) }
            } catch { call.reject(error.localizedDescription) }
        }.resume()
    }
    @objc func releaseAudioPreview(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Identifiant absent"); return }
        DispatchQueue.main.async { if let file = self.audioPreviews.removeValue(forKey: id) { try? FileManager.default.removeItem(at: file) }; call.resolve() }
    }
    public func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }
    public func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        notifyListeners("campaignOpened", data: ["id": response.notification.request.content.userInfo["campaign"] as? String ?? ""])
        completionHandler()
    }

    @objc func getAppIcon(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["icon": UIApplication.shared.alternateIconName == nil ? "portrait" : "legacy"]) }
    }
    @objc func setAppIcon(_ call: CAPPluginCall) {
        let icon = call.getString("icon") ?? "portrait"
        guard ["portrait", "legacy"].contains(icon) else { call.reject("Icône inconnue"); return }
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else { call.reject("Icônes alternatives indisponibles"); return }
            UIApplication.shared.setAlternateIconName(icon == "legacy" ? "AppIconLegacy" : nil) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve(["icon": icon]) }
            }
        }
    }
    @objc func notificationPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve(["granted": granted]) }
        }
    }
    @objc func clearCampaignNotifications(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { requests in
            center.removePendingNotificationRequests(withIdentifiers: requests.filter { $0.identifier.hasPrefix("au22-") }.map { $0.identifier })
            call.resolve()
        }
    }
    @objc func scheduleCampaign(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), UUID(uuidString: id) != nil,
              let title = call.getString("title"), let body = call.getString("body"),
              title.count <= 100, body.count <= 1000 else { call.reject("Message invalide"); return }
        let content = UNMutableNotificationContent(); content.title = title; content.body = body
        content.userInfo = ["campaign": id]; content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, call.getDouble("delay") ?? 1), repeats: false)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "au22-" + id, content: content, trigger: trigger)) { error in
            if let error = error { call.reject(error.localizedDescription) } else { call.resolve(["scheduled": true]) }
        }
    }

    @objc private func resumed() { notifyListeners("resume", data: [:]) }
    @objc private func accessibilityChanged() { notifyListeners("accessibility", data: accessibilityValues()) }
    private func accessibilityValues() -> [String: Any] {
        return ["reduceTransparency": UIAccessibility.isReduceTransparencyEnabled, "increaseContrast": UIAccessibility.isDarkerSystemColorsEnabled]
    }
    @objc func accessibility(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.accessibilityValues()) }
    }

    @objc func checkReleases(_ call: CAPPluginCall) {
        let url = URL(string: "https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100")!
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 25)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("Avant-usine-iOS", forHTTPHeaderField: "User-Agent")
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error { call.reject("Recherche de mise à jour : " + error.localizedDescription); return }
            guard let response = response as? HTTPURLResponse, response.statusCode == 200,
                  let data = data, let json = String(data: data, encoding: .utf8) else {
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                call.reject("Recherche de mise à jour indisponible (HTTP \(status)). Réessaie plus tard."); return
            }
            call.resolve(["json": json])
        }.resume()
    }

    @objc func openIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.openCall == nil, let raw = call.getString("uri"), let url = URL(string: raw),
                  url.isFileURL else { call.reject("Fichier indisponible."); return }
            let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("MisesAJour").standardizedFileURL.path + "/"
            guard url.standardizedFileURL.path.hasPrefix(folder), url.pathExtension == "ipa",
                  FileManager.default.fileExists(atPath: url.path),
                  let view = self.bridge?.viewController?.view
            else { call.reject("IPA indisponible."); return }
            let controller = UIDocumentInteractionController(url: url)
            controller.delegate = self
            self.documentController = controller
            self.openCall = call
            let rect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            if !controller.presentOpenInMenu(from: rect, in: view, animated: true) {
                self.openCall = nil; self.documentController = nil
                call.reject("Aucune application ne peut ouvrir cet IPA.")
            }
        }
    }

    public func documentInteractionController(_ controller: UIDocumentInteractionController,
                                             didEndSendingToApplication application: String?) {
        openCall?.resolve(["opened": true]); openCall = nil
    }

    public func documentInteractionControllerDidDismissOpenInMenu(_ controller: UIDocumentInteractionController) {
        // Dismissal is a cancellation, never reported as a successful import.
        openCall?.resolve(["opened": false]); openCall = nil
        documentController = nil
    }

    @objc func download(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pending == nil else { call.reject("Un téléchargement est déjà en cours."); return }
            guard let raw = call.getString("url"), let url = URL(string: raw),
                  url.scheme == "https",
                  ((url.host == "github.com" && url.path.hasPrefix("/zephiroxDev/avant-usine/releases/download/")) || (url.host == "djjfzymrkncwhrocpxjo.supabase.co" && url.path == "/functions/v1/beta-builds")),
                  let hash = call.getString("sha256"),
                  hash.range(of: "^[a-fA-F0-9]{64}$", options: .regularExpression) != nil,
                  let size = call.getInt("size"), size > 0,
                  let name = call.getString("name"),
                  ((url.host == "github.com" && name.range(of: "^Avant-Usine-iOS-[0-9]+\\.[0-9]+\\.[0-9]+-non-signe\\.ipa$", options: .regularExpression) != nil) || (url.host == "djjfzymrkncwhrocpxjo.supabase.co" && name.range(of: "^betatesting-[0-9]+-[0-9]+-[0-9]+-test-[1-9][0-9]*\\.ipa$", options: .regularExpression) != nil))
            else { call.reject("Informations du paquet invalides."); return }
            self.pending = call
            self.expectedHash = hash.lowercased()
            self.expectedSize = Int64(size)
            self.outputName = name
            let configuration = URLSessionConfiguration.default
            configuration.timeoutIntervalForRequest = 60
            configuration.timeoutIntervalForResource = 1800
            self.session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
            self.session?.downloadTask(with: url).resume()
        }
    }

    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                           didWriteData bytesWritten: Int64, totalBytesWritten: Int64,
                           totalBytesExpectedToWrite: Int64) {
        guard Date().timeIntervalSince(lastProgress) > 0.1 else { return }
        lastProgress = Date()
        notifyListeners("progress", data: ["bytes": totalBytesWritten, "total": expectedSize])
    }

    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                           didFinishDownloadingTo location: URL) {
        do {
            guard let response = downloadTask.response as? HTTPURLResponse, response.statusCode == 200
            else { throw NSError(domain: "AvantUsine", code: 1, userInfo: [NSLocalizedDescriptionKey: "Le serveur a refusé le téléchargement."]) }
            let attributes = try FileManager.default.attributesOfItem(atPath: location.path)
            guard (attributes[.size] as? NSNumber)?.int64Value == expectedSize
            else { throw NSError(domain: "AvantUsine", code: 2, userInfo: [NSLocalizedDescriptionKey: "Taille du paquet incorrecte."]) }
            let handle = try FileHandle(forReadingFrom: location)
            defer { try? handle.close() }
            var hash = SHA256()
            while let chunk = try handle.read(upToCount: 1024 * 1024), !chunk.isEmpty { hash.update(data: chunk) }
            let digest = hash.finalize().map { String(format: "%02x", $0) }.joined()
            guard digest == expectedHash else {
                throw NSError(domain: "AvantUsine", code: 3, userInfo: [NSLocalizedDescriptionKey: "L’empreinte du fichier est incorrecte."])
            }
            let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("MisesAJour", isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let destination = folder.appendingPathComponent(outputName)
            if FileManager.default.fileExists(atPath: destination.path) {
                _ = try FileManager.default.replaceItemAt(destination, withItemAt: location)
            } else { try FileManager.default.moveItem(at: location, to: destination) }
            var values = URLResourceValues(); values.isExcludedFromBackup = true
            var saved = destination; try saved.setResourceValues(values)
            finish(uri: destination.absoluteString, error: nil)
        } catch { finish(uri: nil, error: error.localizedDescription) }
    }

    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error { finish(uri: nil, error: error.localizedDescription) }
    }

    private func finish(uri: String?, error: String?) {
        DispatchQueue.main.async {
            guard let call = self.pending else { return }
            self.pending = nil
            self.session?.finishTasksAndInvalidate(); self.session = nil
            if let error = error { call.reject(error) }
            else if let uri = uri { call.resolve(["uri": uri]) }
        }
    }
}
