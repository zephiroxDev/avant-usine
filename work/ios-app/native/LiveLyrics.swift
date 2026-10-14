import ActivityKit
import Foundation
import UIKit
import Capacitor

@available(iOS 16.2, *)
@objc(LiveLyricsPlugin)
public class LiveLyricsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveLyricsPlugin"
    public let jsName = "LiveLyrics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSource", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setClock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "diagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private struct Source: Decodable {
        var id: String; var title: String; var lines: [String]; var times: [Double]
        var ends: [Double]; var curves: [[[Double]]]?; var tracks: [String]?
        var duration: Double; var position: Double; var rate: Double; var playing: Bool
        var enabled: Bool; var highlight: Bool; var transition: String
    }
    private var source: Source?
    private var activity: Activity<LyricsAttributes>?
    private var timer: Timer?
    private var anchor = ProcessInfo.processInfo.systemUptime
    private var lastState: LyricsAttributes.ContentState?
    private var updating = false
    private var failedTrack: String?
    private var generation = 0
    private var lastTick = ProcessInfo.processInfo.systemUptime
    private var longestGap: Double = 0
    private var updateCount = 0
    private var lastUpdateAt: Double = 0
    private var tickCount = 0
    private var lifecycleObservers: [NSObjectProtocol] = []
    public override func load() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in self?.refresh() }
            if let timer = self.timer { RunLoop.main.add(timer, forMode: .common) }
            self.lifecycleObservers.append(NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
                guard let self = self else { return }
                self.lastState = nil; self.failedTrack = nil; self.refresh()
            })
        }
    }
    @objc func diagnostics(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.resolve(); return }
            call.resolve(["ticks": self.tickCount, "updates": self.updateCount,
                "longestGap": self.longestGap, "playing": self.source?.playing ?? false,
                "state": self.activity.map { String(describing: $0.activityState) } ?? "absent",
                "updatePending": self.updating, "background": UIApplication.shared.applicationState != .active])
        }
    }
    @objc func availability(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let insets = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.windows.first?.safeAreaInsets }.first ?? .zero
            let island = UIDevice.current.userInterfaceIdiom == .phone && max(insets.top, max(insets.left, insets.right)) >= 51
            call.resolve(["supported": island, "activitiesEnabled": ActivityAuthorizationInfo().areActivitiesEnabled])
        }
    }
    @objc func setSource(_ call: CAPPluginCall) {
        guard let object = call.getObject("source"), let bytes = try? JSONSerialization.data(withJSONObject: object),
              bytes.count < 2_000_000, let value = try? JSONDecoder().decode(Source.self, from: bytes),
              value.lines.count <= 600, value.times.count == value.lines.count, value.ends.count == value.lines.count,
              (value.tracks == nil || value.tracks?.count == value.lines.count), value.position.isFinite, value.rate.isFinite, value.rate > 0, value.rate <= 4,
              value.duration.isFinite, value.duration > 0, value.duration <= 21600,
              value.times.allSatisfy({ $0.isFinite && $0 >= 0 }), value.ends.allSatisfy({ $0.isFinite && $0 >= 0 }) else {
            call.reject("Données de paroles invalides."); return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("Service indisponible."); return }
            if self.source?.id != value.id {
                self.generation += 1; self.lastState = nil
                if self.activity?.attributes.trackID != value.id { self.endActivity() }
                if self.activity == nil {
                    self.activity = Activity<LyricsAttributes>.activities.first { $0.attributes.trackID == value.id && $0.activityState != .ended && $0.activityState != .dismissed }
                }
                for old in Activity<LyricsAttributes>.activities where old.id != self.activity?.id {
                    Task { await old.end(nil, dismissalPolicy: .immediate) }
                }
            }
            self.failedTrack = nil; self.source = value; self.anchor = ProcessInfo.processInfo.systemUptime
            self.refresh(); call.resolve(["ready": true, "activityStarted": self.activity != nil])
        }
    }
    @objc func setClock(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, var value = self.source else { call.resolve(); return }
            if let t = call.getDouble("position"), t.isFinite { value.position = max(0, min(value.duration, t)) }
            if let rate = call.getDouble("rate"), rate.isFinite, rate > 0, rate <= 4 { value.rate = rate }
            if let playing = call.getBool("playing") { value.playing = playing }
            if let enabled = call.getBool("enabled") { value.enabled = enabled }
            if let highlight = call.getBool("highlight") { value.highlight = highlight }
            if let transition = call.getString("transition") { value.transition = transition }
            self.source = value; self.anchor = ProcessInfo.processInfo.systemUptime; self.refresh(); call.resolve()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in self?.source = nil; self?.generation += 1; self?.endActivity(); call.resolve() }
    }
    private func endActivity() {
        let old = activity; activity = nil; lastState = nil
        if let old = old { Task { await old.end(nil, dismissalPolicy: .immediate) } }
    }
    private func refresh() {
        let now = ProcessInfo.processInfo.systemUptime
        longestGap = max(longestGap, now - lastTick); lastTick = now; tickCount += 1
        guard let s = source, s.enabled, !s.lines.isEmpty else { if activity != nil { endActivity() }; return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let time = min(s.duration, s.position + (s.playing ? max(0, ProcessInfo.processInfo.systemUptime-anchor) * s.rate : 0))
        let indices = s.lines.indices.filter { time >= s.times[$0] && time < s.ends[$0] + (s.curves == nil ? 0 : 0.18) }
        let main = indices.first(where: { s.tracks?[$0] == "main" }) ?? indices.first
        let phrase = main.map { s.lines[$0] } ?? (s.playing ? "♪" : "Lecture en pause")
        let backs = indices.filter { $0 != main }.map { s.lines[$0] }.joined(separator: " · ")
        var count = 0
        if s.highlight, let i = main, let curves = s.curves, i < curves.count {
            let points = curves[i]
            if let last = points.last, last.count == 2, time >= last[1] { count = phrase.unicodeScalars.count }
            else if points.count > 1 { for j in 1..<points.count { let a=points[j-1],b=points[j];if a.count == 2 && b.count == 2 && b[1] > a[1] && time >= a[1] && time < b[1] { count=Int((a[0]+(b[0]-a[0])*(time-a[1])/(b[1]-a[1])).rounded(.down));break } } }
        }
        let next = s.times.indices.first { s.times[$0] > time }.map { s.lines[$0] } ?? ""
        var state = LyricsAttributes.ContentState(phrase: String(phrase.unicodeScalars.prefix(500)), backs: String(backs.unicodeScalars.prefix(100)), nextPhrase: String(next.unicodeScalars.prefix(100)), lineID: (main.map(String.init) ?? "gap") + ":" + (indices.map(String.init).joined(separator: ",")), highlighted: count, highlightEnabled: s.highlight && s.curves != nil, playing: s.playing, transition: s.transition)
        while ((try? JSONEncoder().encode(state).count) ?? 0) > 3500 { if !state.nextPhrase.isEmpty { state.nextPhrase.removeLast() } else if !state.backs.isEmpty { state.backs.removeLast() } else if !state.phrase.isEmpty { state.phrase.removeLast() } else { return } }
        if let current = activity, current.activityState == .ended || current.activityState == .dismissed { activity = nil; lastState = nil }
        guard state != lastState, !updating else { return }
        if let previous = lastState, previous.lineID == state.lineID, previous.playing == state.playing,
           previous.highlightEnabled == state.highlightEnabled {
            let finalLetter = state.highlightEnabled && state.highlighted >= state.phrase.unicodeScalars.count && previous.highlighted < state.highlighted
            let interval = UIApplication.shared.applicationState == .active ? 0.5 : 1.0
            if !finalLetter && now - lastUpdateAt < interval { return }
        }
        let attrs = LyricsAttributes(title: String(s.title.unicodeScalars.prefix(70)), trackID: String(s.id.prefix(100)))
        let content = ActivityContent(state: state, staleDate: nil, relevanceScore: 1)
        if activity == nil {
            guard UIApplication.shared.applicationState == .active, failedTrack != s.id else { return }
            do { activity = try Activity.request(attributes: attrs, content: content, pushType: nil); lastState = state; updateCount += 1; lastUpdateAt = now }
            catch { failedTrack = s.id; notifyListeners("error", data: ["message": error.localizedDescription]) }
        } else if let current = activity {
            updating = true; lastUpdateAt = now; let token = generation
            Task { await current.update(content); await MainActor.run { self.updating = false; if self.generation == token { self.lastState = state; self.updateCount += 1 }; self.refresh() } }
        }
    }
    deinit { timer?.invalidate(); for observer in lifecycleObservers { NotificationCenter.default.removeObserver(observer) } }
}
