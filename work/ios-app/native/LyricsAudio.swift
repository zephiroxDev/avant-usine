import AVFoundation
import MediaPlayer
import Foundation

// Real audio playback, never a silent background keepalive.
final class LyricsAudio {
    private(set) var player: AVPlayer?
    private(set) var key = ""
    private(set) var ownsPlayback = false
    private var timeObserver: Any?
    private var itemEnd: NSObjectProtocol?
    private var itemFailure: NSObjectProtocol?
    private var cachedFile: URL?
    private var requestedRate: Float = 1
    private var baseVolume: Float = 1
    private var endTime = Double.infinity
    private var startTime: Double = 0
    private var fadeIn: Double = 0
    private var fadeOut: Double = 0
    private var sleepDeadline: Double?
    private var commands: [(MPRemoteCommand, Any)] = []
    private var finished = false
    private var previousSample: (Double, Double)?
    private var segments: [[String: Double]] = []
    func takeSegments() -> [[String: Double]] { let result = segments; segments.removeAll(); return result }
    var onTime: (() -> Void)?
    var onEnd: (() -> Void)?
    var onError: ((String) -> Void)?
    var onSleep: (() -> Void)?
    var position: Double { let t = player?.currentTime().seconds ?? 0; return t.isFinite ? t : 0 }
    var playing: Bool { ownsPlayback && (player?.rate ?? 0) > 0 }

    func prepare(key: String, url: URL, ownedFile: URL? = nil) {
        clear()
        self.key = key; self.cachedFile = ownedFile; finished = false
        let item = AVPlayerItem(url: url)
        let p = AVPlayer(playerItem: item); p.automaticallyWaitsToMinimizeStalling = true
        player = p
        timeObserver = p.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { [weak self] _ in self?.tick() }
        itemEnd = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in self?.finish() }
        itemFailure = NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main) { [weak self] _ in self?.onError?("Lecture native interrompue ; retour au lecteur habituel.") }
    }

    func arm(position: Double, rate: Double, volume: Double, start: Double, end: Double, fadeIn: Double, fadeOut: Double, sleepDeadline: Double? = nil, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let player = player else { completion(.failure(NSError(domain: "LyricsAudio", code: 1, userInfo: [NSLocalizedDescriptionKey: "Audio non préparé."]))); return }
        requestedRate = Float(rate); baseVolume = Float(max(0, min(1, volume)))
        startTime = start; endTime = end; self.fadeIn = fadeIn; self.fadeOut = fadeOut; self.sleepDeadline = sleepDeadline
        let began = ProcessInfo.processInfo.systemUptime
        func ready() {
            guard self.player === player else { completion(.failure(NSError(domain: "LyricsAudio", code: 2, userInfo: [NSLocalizedDescriptionKey: "Morceau remplacé."]))); return }
            if player.currentItem?.status == .failed { completion(.failure(player.currentItem?.error ?? NSError(domain: "LyricsAudio", code: 3))); return }
            if player.currentItem?.status == .readyToPlay {
                player.seek(to: CMTime(seconds: max(start, min(end, position)), preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { finished in
                    DispatchQueue.main.async {
                        guard finished, self.player === player else { completion(.failure(NSError(domain: "LyricsAudio", code: 4))); return }
                        completion(.success(()))
                    }
                }
            } else if ProcessInfo.processInfo.systemUptime - began < 12 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1, execute: ready)
            } else { completion(.failure(NSError(domain: "LyricsAudio", code: 5, userInfo: [NSLocalizedDescriptionKey: "Chargement audio trop long ; le lecteur habituel est conservé."]))) }
        }
        ready()
    }

    func commit(title: String, duration: Double) throws {
        guard let p = player else { throw NSError(domain: "LyricsAudio", code: 1) }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default)
        try session.setActive(true)
        ownsPlayback = true; previousSample = (position, Date().timeIntervalSince1970 * 1000)
        p.volume = gain(position); p.playImmediately(atRate: requestedRate)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [MPMediaItemPropertyTitle: title, MPMediaItemPropertyPlaybackDuration: duration, MPNowPlayingInfoPropertyElapsedPlaybackTime: position, MPNowPlayingInfoPropertyPlaybackRate: requestedRate]
        let remote = MPRemoteCommandCenter.shared()
        commands.append((remote.pauseCommand, remote.pauseCommand.addTarget { [weak self] _ in self?.player?.pause(); self?.tick(); return .success }))
        commands.append((remote.playCommand, remote.playCommand.addTarget { [weak self] _ in guard let self = self else { return .commandFailed }; self.player?.playImmediately(atRate: self.requestedRate); self.tick(); return .success }))
        commands.append((remote.changePlaybackPositionCommand, remote.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self = self, let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self.player?.seek(to: CMTime(seconds: max(self.startTime, min(self.endTime, event.positionTime)), preferredTimescale: 600))
            self.previousSample = nil
            return .success
        }))
        tick()
    }

    func release() -> (Double, Bool) {
        sample(force: true)
        let result = (position, playing)
        player?.pause(); ownsPlayback = false
        for (command, token) in commands { command.removeTarget(token) }; commands.removeAll()
        return result
    }

    private func gain(_ time: Double) -> Float {
        let incoming = fadeIn > 0 ? max(0, min(1, (time-startTime)/fadeIn)) : 1
        let outgoing = fadeOut > 0 ? max(0, min(1, (endTime-time)/fadeOut)) : 1
        return baseVolume * Float(min(incoming, outgoing))
    }
    private func tick() {
        guard ownsPlayback else { return }
        sample(force: false)
        if let deadline = sleepDeadline, Date().timeIntervalSince1970 * 1000 >= deadline {
            sleepDeadline = nil; sample(force: true); player?.pause(); onTime?(); onSleep?(); return
        }
        if position >= endTime { finish(); return }
        player?.volume = gain(position)
        if var info = MPNowPlayingInfoCenter.default().nowPlayingInfo { info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position; info[MPNowPlayingInfoPropertyPlaybackRate] = player?.rate ?? 0; MPNowPlayingInfoCenter.default().nowPlayingInfo = info }
        onTime?()
    }
    func control(playing: Bool) { sample(force: true); if playing { player?.playImmediately(atRate: requestedRate) } else { player?.pause() }; tick() }
    private func sample(force: Bool) {
        let now = Date().timeIntervalSince1970 * 1000, t = position
        guard ownsPlayback, let old = previousSample else { previousSample = (t, now); return }
        let wall = (now-old.1)/1000
        if !force && wall < 5 { return }
        previousSample = (t, now)
        let advance = t-old.0
        guard wall > 0, wall <= 35, advance > 0, advance <= wall * Double(requestedRate) + 0.5 else { return }
        segments.append(["seconds": min(wall, advance/Double(requestedRate)), "startPosition": old.0, "endPosition": t, "startedAt": old.1, "endedAt": now])
    }
    private func finish() { guard ownsPlayback, !finished else { return }; finished = true; player?.pause(); onTime?(); onEnd?() }
    func clear() {
        _ = release()
        if let token = timeObserver { player?.removeTimeObserver(token) }; timeObserver = nil
        if let token = itemEnd { NotificationCenter.default.removeObserver(token) }; itemEnd = nil
        if let token = itemFailure { NotificationCenter.default.removeObserver(token) }; itemFailure = nil
        player = nil; key = ""; previousSample = nil; segments.removeAll()
        if let file = cachedFile { try? FileManager.default.removeItem(at: file) }; cachedFile = nil
    }
    deinit { clear() }
}
