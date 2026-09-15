import Foundation
import AVFoundation
import UIKit
import Combine
#if !targetEnvironment(macCatalyst)
import ActivityKit
#endif

@MainActor
final class CWorldLiveActivityController: ObservableObject {
    static let shared = CWorldLiveActivityController()
    @Published private(set) var message: String?
    private var thumbnail: Data?
    private var artworkFilename: String?
    private var lastSignature = ""
    private var lastUpdate = Date.distantPast
    private var updateTask: Task<Void, Never>?
    #if !targetEnvironment(macCatalyst)
    private var activity: Activity<CWorldWatchingAttributes>?
    #endif

    func setArtwork(_ image: UIImage?) {
        thumbnail = nil
        artworkFilename = nil
        #if !targetEnvironment(macCatalyst)
        if let image {
            do {
                artworkFilename = try CWorldWatchingArtwork.store(image)
                lastSignature = ""
                return
            } catch {
                // Retain a small fallback if the shared container is unavailable.
                message = "High-quality Live Activity artwork requires the App Group on both app targets."
            }
        }
        #endif
        if let image {
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            let small = UIGraphicsImageRenderer(size: CGSize(width: 64, height: 36), format: format).image { _ in
                let scale = max(64 / max(1, image.size.width), 36 / max(1, image.size.height))
                let width = image.size.width * scale
                let height = image.size.height * scale
                image.draw(in: CGRect(x: (64 - width) / 2, y: (36 - height) / 2, width: width, height: height))
            }
            if let data = small.jpegData(compressionQuality: 0.4), data.count <= 1800 { thumbnail = data }
        }
        lastSignature = ""
    }

    func update(host: CWorldPlaybackHost) {
        #if !targetEnvironment(macCatalyst)
        guard host.surface != nil, let player = host.player else { return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            message = "Live Activities are disabled in iPhone settings."
            return
        }
        let status = host.connectionLost ? "TV disconnected" : host.isIntermission ? "Intermission" : host.isAirPlay || ExternalDisplaySession.shared.isConnected ? "On your TV" : "On your iPhone"
        let signature = "\(host.mediaID ?? ""):\(host.season ?? 0):\(host.episode ?? 0):\(host.isPlaying):\(status):\(host.queue.count):\(host.hasAutomaticNext):\(artworkFilename ?? ""):\(thumbnail?.count ?? 0)"
        guard signature != lastSignature || Date().timeIntervalSince(lastUpdate) >= 15 else { return }
        lastSignature = signature
        lastUpdate = Date()
        let time = player.currentTime().seconds
        let length = player.currentItem?.duration.seconds ?? 0
        var state = CWorldWatchingAttributes.ContentState(title: String(host.title.prefix(120)), show: String(host.showTitle.prefix(100)),
            status: status, queued: host.queue.count, hasNext: host.hasAutomaticNext || !host.queue.isEmpty, elapsed: time.isFinite ? max(0, time) : 0,
            duration: length.isFinite ? max(0, length) : 0, playing: host.isPlaying,
            updatedAt: Date(), thumbnail: thumbnail, artworkFilename: artworkFilename)
        // Leave headroom for attributes and ActivityKit's 4 KB content limit.
        if let encoded = try? JSONEncoder().encode(state), encoded.count > 3500 { state.thumbnail = nil }
        let content = ActivityContent(state: state, staleDate: state.playing ? Date().addingTimeInterval(60) : nil)
        if let activity {
            let previous = updateTask
            updateTask = Task { await previous?.value; await activity.update(content) }
        } else if UIApplication.shared.applicationState == .active {
            do {
                // Retire an activity left behind by a previous terminated session.
                for old in Activity<CWorldWatchingAttributes>.activities {
                    Task { await old.end(nil, dismissalPolicy: .immediate) }
                }
                activity = try Activity.request(attributes: CWorldWatchingAttributes(sessionID: UUID().uuidString), content: content, pushType: nil)
                message = nil
            } catch { message = "Live Activity unavailable: \(error.localizedDescription)" }
        }
        #endif
    }

    func stop() {
        #if !targetEnvironment(macCatalyst)
        if let current = activity {
            let previous = updateTask
            Task { await previous?.value; await current.end(nil, dismissalPolicy: .immediate) }
        }
        activity = nil
        #endif
        updateTask = nil
        lastSignature = ""
        thumbnail = nil
        artworkFilename = nil
    }
}
