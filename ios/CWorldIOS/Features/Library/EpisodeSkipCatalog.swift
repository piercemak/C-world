import Foundation

struct EpisodeSkipMarkers: Decodable, Equatable {
    let introStart: Double?
    let introEnd: Double?
    let outroStart: Double?

    func introTarget(at time: Double, duration: Double) -> Double? {
        guard let start = introStart, let end = introEnd,
              start.isFinite, end.isFinite, time.isFinite, duration.isFinite,
              start >= 0, end > start, end < duration,
              time >= start, time < end - 0.25 else { return nil }
        return end
    }

    func canSkipOutro(at time: Double, duration: Double) -> Bool {
        hasReachedOutro(at: time, duration: duration) && time < duration - 0.25
    }

    /// Playback time, rather than a wall-clock timer, keeps pauses and seeks correct.
    func nextEpisodeCountdown(at time: Double, duration: Double) -> Int? {
        guard hasReachedOutro(at: time, duration: duration), let outroStart else { return nil }
        return max(0, Int(ceil(min(duration, outroStart + 5) - time)))
    }

    func hasReachedOutro(at time: Double, duration: Double) -> Bool {
        guard let start = outroStart, start.isFinite, time.isFinite, duration.isFinite,
              start > 0, start < duration else { return false }
        return time >= start && time <= duration
    }
}

enum EpisodeSkipCatalog {
    private struct Manifest: Decodable {
        let version: Int
        let episodes: [String: EpisodeSkipMarkers]
    }
    static let episodes: [String: EpisodeSkipMarkers] = {
        guard let url = Bundle.main.url(forResource: "episode-markers", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let manifest = try? JSONDecoder().decode(Manifest.self, from: data),
              manifest.version == 1 else { return [:] }
        return manifest.episodes
    }()

    static func markers(mediaID: String, season: Int?, episode: Int?,
                        introEnd: Double?, outroStart: Double?) -> EpisodeSkipMarkers {
        if let season, let episode,
           let known = episodes["\(mediaID.replacingOccurrences(of: "-", with: "")):\(season):\(episode)"] {
            return known
        }
        return EpisodeSkipMarkers(introStart: introEnd == nil ? nil : 0,
                                  introEnd: introEnd, outroStart: outroStart)
    }
}
