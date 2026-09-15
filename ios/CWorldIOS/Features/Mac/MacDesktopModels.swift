import Foundation
import Combine

/// Local desktop preferences are deliberately separate from server-backed watch data.
@MainActor
final class MacDesktopPreferences: ObservableObject {
    struct Review: Codable, Equatable {
        var text = ""
        var rating = 0
        var watchedDate = ""
        var watchlisted = false
        var genres: [String]?
    }
    struct Settings: Codable {
        var palette = "Sky"
        var background: MacBackground?
        var favoriteBackgrounds: [MacBackground]?
        var profileBio = ""
        var reviews: [String: Review] = [:]
        var reviewOrder: [String] = []
        var filmGrid: [String]?
        var snowEnabled: Bool?
        var visualBackground: MacBackground { background ?? .legacy(palette) }
    }
    @Published private(set) var settings = Settings()
    private var key: String?
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    func load(server: String, userID: Int?, profileID: Int?) {
        guard let userID, let profileID else { key = nil; settings = Settings(); return }
        let identity = "\(server)|\(userID)|\(profileID)".data(using: .utf8)!.base64EncodedString()
        key = "cworld.mac.preferences.\(identity)"
        settings = defaults.data(forKey: key!).flatMap { try? JSONDecoder().decode(Settings.self, from: $0) } ?? Settings()
    }
    func update(_ change: (inout Settings) -> Void) {
        guard let key else { return }
        change(&settings)
        if let data = try? JSONEncoder().encode(settings) { defaults.set(data, forKey: key) }
    }
}

/// The modes, swatches, and six-favorite limit mirror ColorPicker.jsx.
struct MacBackground: Codable, Equatable, Hashable, Identifiable {
    enum Mode: String, Codable, CaseIterable { case solid, linear, diagonal, radial, center, conic }
    var mode: Mode = .conic
    var start = "#add8e6"
    var end = "#ffffff"
    var id: String { "\(mode.rawValue):\(start):\(end)" }
    static let original = MacBackground()
    static let solidColors = ["#000000", "#545454", "#737373", "#a6a6a6", "#d9d9d9", "#ffffff", "#ff3131", "#ff5757", "#ff66c4", "#cb6ce6", "#8c52ff", "#5e17eb", "#0097b2", "#0cc0df", "#5ce1e6", "#38b6ff", "#5271ff", "#004aad", "#00bf63", "#7ed957", "#c1ff72", "#ffde59", "#ffbd59", "#ff914d"]
    static let gradients: [MacBackground] = [
        ("#ff3131", "#ff914d"), ("#ff5757", "#8c52ff"), ("#5170ff", "#ff66c4"), ("#004aad", "#cb6ce6"), ("#8c52ff", "#5ce1e6"), ("#5de0e6", "#004aad"),
        ("#8c52ff", "#00bf63"), ("#0097b2", "#7ed957"), ("#0cc0df", "#ffde59"), ("#ffde59", "#ff914d"), ("#ff66c4", "#ffde59"), ("#8c52ff", "#ff914d"),
        ("#000000", "#737373"), ("#000000", "#c89116"), ("#000000", "#3533cd"), ("#a6a6a6", "#ffffff"), ("#fff7ad", "#ffa9f9"), ("#cdffd8", "#94b9ff")
    ].map { MacBackground(mode: .linear, start: $0.0, end: $0.1) }
    static func hex(_ value: String) -> String? {
        var clean = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if clean.hasPrefix("#") { clean.removeFirst() }
        guard [3, 6].contains(clean.count), clean.allSatisfy({ $0.isHexDigit }) else { return nil }
        if clean.count == 3 { clean = clean.map { "\($0)\($0)" }.joined() }
        return "#" + clean
    }
    static func legacy(_ name: String) -> Self {
        switch name {
        case "Midnight": .init(mode: .linear, start: "#000000", end: "#1a2e40")
        case "Rose": .init(mode: .linear, start: "#803852", end: "#f2bfa8")
        case "Forest": .init(mode: .linear, start: "#123d38", end: "#99c794")
        case "Violet": .init(mode: .linear, start: "#422675", end: "#a8adf5")
        default: .original
        }
    }
}

struct MacPlaybackSelection: Identifiable {
    let media: CWorldMedia
    let season: Int?
    let episode: CWorldEpisode?
    var id: String { "\(media.id):\(season ?? 0):\(episode?.number ?? 0)" }
    var playbackID: String { episode?.playbackRef.mediaId ?? media.movieAsset?.mediaId ?? media.id }
    var title: String {
        guard let season, let episode else { return media.title }
        return String(format: "S%02dE%02d", season, episode.number) + " · " +
            (EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season, episode: episode.number) ?? episode.title)
    }
    var playerEpisodeLabel: String? {
        guard let season, let episode else { return nil }
        let name = EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season, episode: episode.number) ?? episode.title
        return String(format: "S%02dE%02d", season, episode.number) + " • " + name
    }
    var subtitleURL: URL? { episode?.subtitles.first ?? (episode == nil ? media.subtitleTracks.first : nil) }
    static func resume(_ item: ContinueWatchingItem) -> Self {
        .init(media: item.media, season: item.progress.season, episode: item.episode)
    }
    static func first(_ media: CWorldMedia) -> Self? {
        if media.type == "movie" { return .init(media: media, season: nil, episode: nil) }
        guard let season = media.seasons?.first, let episode = season.episodes.first else { return nil }
        return .init(media: media, season: season.number, episode: episode)
    }
}

enum MacDesktopCatalog {
    struct DesktopArtwork: Decodable {
        let image: String
        let thumbnail: String
        let source: String
        let meta: String
    }
    private struct ArtworkManifest: Decodable { let assets: [String: DesktopArtwork] }
    static let desktopArtwork: [String: DesktopArtwork] = {
        guard let url = Bundle.main.url(forResource: "manifest", withExtension: "json", subdirectory: "DesktopArtwork"),
              let data = try? Data(contentsOf: url), let manifest = try? JSONDecoder().decode(ArtworkManifest.self, from: data) else { return [:] }
        return manifest.assets
    }()
    static func cover(_ media: CWorldMedia, thumbnail: Bool = false) -> URL? {
        guard let entry = desktopArtwork[media.id] else { return media.artwork.backdrop ?? media.artwork.card }
        return Bundle.main.url(forResource: thumbnail ? entry.thumbnail : entry.image, withExtension: nil, subdirectory: "DesktopArtwork")
            ?? URL(string: "https://cearaworld.com" + entry.source)
    }
    static func desktopMeta(_ media: CWorldMedia) -> String {
        desktopArtwork[media.id]?.meta ?? [media.metadata.year, media.metadata.genres.joined(separator: " / "), media.metadata.duration].filter { !$0.isEmpty }.joined(separator: " • ")
    }
    struct NewMedia: Decodable, Identifiable { let id: String; let season: Int?; let episode: Int? }
    struct Reference: Decodable { let order: [String]; let newMedia: [NewMedia]? }
    private static let reference: Reference? = {
        guard let url = Bundle.main.url(forResource: "desktop-reference", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let reference = try? JSONDecoder().decode(Reference.self, from: data) else { return nil }
        return reference
    }()
    static let order: [String] = reference?.order ?? []
    static let newMedia: [NewMedia] = reference?.newMedia ?? []
    static func normalizedID(_ id: String) -> String { id.lowercased().filter { $0.isLetter || $0.isNumber } }
    static func ordered(_ catalog: [CWorldMedia], reference: [String] = order) -> [CWorldMedia] {
        let ranks = Dictionary(reference.enumerated().map { (normalizedID($0.element), $0.offset) }, uniquingKeysWith: min)
        return catalog.enumerated().sorted {
            let lhs = ranks[normalizedID($0.element.id)] ?? Int.max
            let rhs = ranks[normalizedID($1.element.id)] ?? Int.max
            return lhs == rhs ? $0.offset < $1.offset : lhs < rhs
        }.map(\.element)
    }
    static func page<T>(_ items: [T], index: Int, size: Int = 6) -> [T] {
        guard size > 0, !items.isEmpty else { return [] }
        let safeIndex = min(max(index, 0), (items.count - 1) / size)
        return Array(items.dropFirst(safeIndex * size).prefix(size))
    }
    static func placeholder(_ media: CWorldMedia, season: Int? = nil, episode: Int? = nil) -> URL? {
        let id = normalizedID(media.assetId.isEmpty ? media.id : media.assetId)
        if let season, let episode {
            let prefix = id == "itsalwayssunny" ? String(format: "S%02d", season) : "S\(season)"
            return URL(string: "https://d20honz3pkzrs8.cloudfront.net/\(id)/placeholders/season\(season)/\(prefix)E\(episode)_\(id)_placeholder.png")
        }
        return URL(string: "https://cearaworld.com/images/\(id)/placeholders/\(id)_placeholder.png")
    }
}
