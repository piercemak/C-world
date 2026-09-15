import Foundation

struct CatalogEnvelope: Codable {
    let schemaVersion: Int
    let catalogRevision: String
    let generatedAt: String
    let items: [CWorldMedia]
}

struct CWorldMedia: Codable, Identifiable {
    let id: String
    let assetId: String
    let type: String
    let title: String
    let dateAdded: String?
    let description: String
    let artwork: CWorldArtwork
    let metadata: CWorldMetadata
    let subtitles: Bool
    let subtitleTracks: [URL]
    let rokuSubtitleTracks: [URL]
    let movieAsset: PlaybackReference?
    let seasons: [CWorldSeason]?

    private enum CodingKeys: String, CodingKey {
        case id, assetId, type, title, dateAdded, description, artwork, metadata, subtitles
        case subtitleTracks, rokuSubtitleTracks, movieAsset, seasons
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        assetId = try container.decode(String.self, forKey: .assetId)
        type = try container.decode(String.self, forKey: .type)
        title = try container.decode(String.self, forKey: .title)
        dateAdded = try container.decodeIfPresent(String.self, forKey: .dateAdded)
        description = try container.decode(String.self, forKey: .description)
        artwork = try container.decode(CWorldArtwork.self, forKey: .artwork)
        metadata = try container.decode(CWorldMetadata.self, forKey: .metadata)
        subtitles = try container.decodeIfPresent(Bool.self, forKey: .subtitles) ?? false
        subtitleTracks = try container.decodeIfPresent([URL].self, forKey: .subtitleTracks) ?? []
        rokuSubtitleTracks = try container.decodeIfPresent([URL].self, forKey: .rokuSubtitleTracks) ?? []
        movieAsset = try container.decodeIfPresent(PlaybackReference.self, forKey: .movieAsset)
        seasons = try container.decodeIfPresent([CWorldSeason].self, forKey: .seasons)
    }
}

struct CWorldArtwork: Codable {
    let card: URL?
    let poster: URL?
    let backdrop: URL?
    let mobileBackdrop: URL?

    var preferredCard: URL? {
        card
    }

    var preferredBackdrop: URL? {
        mobileBackdrop ?? backdrop
    }
}

struct CWorldMetadata: Codable {
    let creator: String
    let rating: String
    let year: String
    let genres: [String]
    let duration: String
    let ageRating: String
}

struct CWorldSeason: Codable, Identifiable {
    let number: Int
    let episodes: [CWorldEpisode]

    var id: Int { number }
}

struct CWorldEpisode: Codable, Identifiable {
    let number: Int
    let title: String
    let description: String
    let airDate: String
    let duration: String
    let playbackRef: PlaybackReference
    let subtitles: [URL]
    let rokuSubtitles: [URL]
    let skipIntroEnd: Double?
    let skipOutroStart: Double?

    var id: Int { number }

    private enum CodingKeys: String, CodingKey {
        case number, title, description, airDate, duration, playbackRef
        case subtitles, rokuSubtitles, skipIntroEnd, skipOutroStart
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        number = try container.decode(Int.self, forKey: .number)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decode(String.self, forKey: .description)
        airDate = try container.decode(String.self, forKey: .airDate)
        duration = try container.decode(String.self, forKey: .duration)
        playbackRef = try container.decode(PlaybackReference.self, forKey: .playbackRef)
        subtitles = try container.decodeIfPresent([URL].self, forKey: .subtitles) ?? []
        rokuSubtitles = try container.decodeIfPresent([URL].self, forKey: .rokuSubtitles) ?? []
        skipIntroEnd = try container.decodeIfPresent(Double.self, forKey: .skipIntroEnd)
        skipOutroStart = try container.decodeIfPresent(Double.self, forKey: .skipOutroStart)
    }
}

struct PlaybackReference: Codable {
    let mediaId: String
    let season: Int?
    let episode: Int?
}

struct PlaybackSession: Decodable {
    let mediaId: String
    let season: Int?
    let episode: Int?
    let url: URL
    let expiresAt: String
}

struct WatchProgressPayload: Encodable {
    let showId: String
    let season: Int?
    let episode: Int?
    let currentTime: Double
    let duration: Double

    enum CodingKeys: String, CodingKey {
        case showId = "show_id"
        case season
        case episode
        case currentTime = "current_time"
        case duration
    }
}

struct WatchProgressRecord: Decodable, Identifiable {
    let id: Int
    let showID: String
    let season: Int?
    let episode: Int?
    let currentTime: Double
    let duration: Double
    let updatedAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case showID = "show_id"
        case season, episode
        case currentTime = "current_time"
        case duration
        case updatedAt = "updated_at"
    }
}

struct ContinueWatchingItem: Identifiable, Hashable {
    let media: CWorldMedia
    let progress: WatchProgressRecord
    var id: String { media.id }
    var episode: CWorldEpisode? {
        media.seasons?.first(where: { $0.number == progress.season })?.episodes.first(where: { $0.number == progress.episode })
    }
    var playbackID: String { episode?.playbackRef.mediaId ?? media.movieAsset?.mediaId ?? progress.showID }

    static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.id == rhs.id && lhs.progress.season == rhs.progress.season && lhs.progress.episode == rhs.progress.episode
    }
    func hash(into hasher: inout Hasher) {
        hasher.combine(id); hasher.combine(progress.season); hasher.combine(progress.episode)
    }

    static func make(catalog: [CWorldMedia], records: [WatchProgressRecord]) -> [Self] {
        var mediaByPlaybackID: [String: CWorldMedia] = [:]
        for media in catalog {
            mediaByPlaybackID[media.id] = media
            if let movieID = media.movieAsset?.mediaId { mediaByPlaybackID[movieID] = media }
            for season in media.seasons ?? [] {
                for episode in season.episodes { mediaByPlaybackID[episode.playbackRef.mediaId] = media }
            }
        }
        var seen = Set<String>()
        return records.sorted { $0.updatedAt == $1.updatedAt ? $0.id > $1.id : $0.updatedAt > $1.updatedAt }.compactMap { record in
            guard let media = mediaByPlaybackID[record.showID], seen.insert(media.id).inserted else { return nil }
            // Check the latest record before deciding whether it is resumable.
            // A newer reset/completion must not reveal an older partial episode.
            guard record.duration > 0, record.currentTime > 5, record.currentTime < record.duration - 30 else { return nil }
            let item = Self(media: media, progress: record)
            guard media.type == "movie" || item.episode != nil else { return nil }
            return item
        }
    }
}

struct WatchHistoryRecord: Decodable, Identifiable {
    let id: Int
    let showID: String
    let season: Int?
    let episode: Int?
    let watchedAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case showID = "show_id"
        case season, episode
        case watchedAt = "watched_at"
    }
}
