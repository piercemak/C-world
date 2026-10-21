import SwiftUI

enum CatalogSearchScope: String, CaseIterable, Identifiable {
    case all = "All", titles = "Titles", episodes = "Episodes"
    var id: String { rawValue }
}

struct CatalogSearchResult: Identifiable {
    let media: CWorldMedia
    let season: Int?
    let episode: Int?
    let title: String
    let subtitle: String
    let searchable: String
    let normalizedTitle: String
    var id: String { "\(media.id):\(season ?? 0):\(episode ?? 0)" }
}

/// Normalization and episode title lookup happen once per catalog update, not
/// every time a keystroke or image finishes rendering.
struct CatalogSearchIndex {
    private let entries: [CatalogSearchResult]
    private let words: [[String]]

    init(catalog: [CWorldMedia] = []) {
        entries = catalog.flatMap { media -> [CatalogSearchResult] in
            var results = [CatalogSearchResult(media: media, season: nil, episode: nil,
                title: media.title, subtitle: "\(media.type == "movie" ? "Movie" : "Show") · \(media.metadata.creator)",
                searchable: Self.normalize("\(media.title) \(media.metadata.creator) \(media.metadata.year)"),
                normalizedTitle: Self.normalize(media.title))]
            for season in media.seasons ?? [] {
                for episode in season.episodes {
                    let title = episode.title
                    let code = String(format: "S%02dE%02d", season.number, episode.number)
                    let aliases = "\(code) S\(season.number)E\(episode.number) season \(season.number) episode \(episode.number)"
                    results.append(CatalogSearchResult(media: media, season: season.number, episode: episode.number,
                        title: title, subtitle: "\(media.title) · \(code)",
                        searchable: Self.normalize("\(title) \(episode.title) \(media.title) \(aliases)"),
                        normalizedTitle: Self.normalize(title)))
                }
            }
            return results
        }
        words = entries.map { $0.searchable.split(separator: " ").map(String.init) }
    }

    static func normalize(_ value: String) -> String {
        value.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }.joined(separator: " ")
    }

    func search(_ query: String, scope: CatalogSearchScope = .all) -> [CatalogSearchResult] {
        var text = query.lowercased()
        var season: Int?
        var episode: Int?
        for pattern in [#"\bs(\d+)\s*e(\d+)\b"#, #"\b(\d+)x(\d+)\b"#, #"\bseason\s+(\d+)(?:\s+episode\s+(\d+))?\b"#] {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  let seasonRange = Range(match.range(at: 1), in: text),
                  let wholeRange = Range(match.range, in: text) else { continue }
            season = Int(text[seasonRange])
            if let episodeRange = Range(match.range(at: 2), in: text) { episode = Int(text[episodeRange]) }
            text.replaceSubrange(wholeRange, with: " ")
            break
        }
        let aliases = ["opm": "one punch man", "aot": "attack on titan", "jjk": "jujutsu kaisen",
                       "fmab": "fullmetal alchemist brotherhood", "otgw": "over the garden wall"]
        let normalized = Self.normalize(text).split(separator: " ").map {
            aliases[String($0)] ?? String($0)
        }.joined(separator: " ")
        let tokens = normalized.split(separator: " ").map(String.init)
        guard !tokens.isEmpty || season != nil else { return [] }
        var matches: [(result: CatalogSearchResult, score: Int)] = []
        for (index, entry) in entries.enumerated() {
            guard scope == .all || (scope == .episodes) == (entry.episode != nil),
                  season == nil || entry.season == season,
                  episode == nil || entry.episode == episode else { continue }
            var fuzzy = 0
            var matched = true
            for token in tokens {
                if words[index].contains(where: { token.allSatisfy(\.isNumber) ? $0 == token : $0.contains(token) }) { continue }
                if token.count >= 4 && words[index].contains(where: { Self.oneEditApart(token, $0) }) { fuzzy += 1 }
                else { matched = false; break }
            }
            guard matched else { continue }
            let relevance = !normalized.isEmpty && entry.normalizedTitle == normalized ? 0
                : !normalized.isEmpty && entry.normalizedTitle.hasPrefix(normalized) ? 1
                : entry.episode == nil ? 2 : 3
            matches.append((entry, fuzzy * 10 + relevance))
        }
        return matches.sorted { left, right in
            if left.score != right.score { return left.score < right.score }
            let lhs = left.result, rhs = right.result
            if lhs.media.title != rhs.media.title { return lhs.media.title < rhs.media.title }
            if lhs.season != rhs.season { return (lhs.season ?? 0) < (rhs.season ?? 0) }
            return (lhs.episode ?? 0) < (rhs.episode ?? 0)
        }.map(\.result)
    }

    private static func oneEditApart(_ lhs: String, _ rhs: String) -> Bool {
        let a = Array(lhs), b = Array(rhs)
        guard abs(a.count - b.count) <= 1 else { return false }
        if a.count == b.count {
            let differences = a.indices.filter { a[$0] != b[$0] }
            if differences.count <= 1 { return true }
            if differences.count == 2 {
                let i = differences[0], j = differences[1]
                return j == i + 1 && a[i] == b[j] && a[j] == b[i]
            }
            return false
        }
        let shorter = a.count < b.count ? a : b, longer = a.count < b.count ? b : a
        var i = 0, j = 0, skipped = false
        while i < shorter.count && j < longer.count {
            if shorter[i] == longer[j] { i += 1; j += 1 }
            else if skipped { return false }
            else { skipped = true; j += 1 }
        }
        return true
    }
}

struct CatalogSearchView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var isFocused: Bool
    @State private var query = ""
    @State private var scope: CatalogSearchScope = .all
    @State private var index = CatalogSearchIndex()
    @State private var indexRevision = 0
    @State private var results: [CatalogSearchResult] = []
    @State private var isSearching = false
    @State private var recentSearches: [String] = []
    @State private var atmosphereURL: URL?
    @State private var latestItems: [CWorldMedia] = []
    @State private var progressByMedia: [String: WatchProgressRecord] = [:]

    init(query: String = "") {
        _query = State(initialValue: query)
    }

    private var searchKey: String { "\(indexRevision):\(scope.rawValue):\(query)" }
    private var historyKey: String {
        "seedspace.search.\(appModel.user?.id ?? -1).\(appModel.activeProfile?.id ?? -1)"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                atmosphere
                VStack(spacing: 18) {
                    searchField
                    Picker("Search in", selection: $scope) {
                        ForEach(CatalogSearchScope.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 20)
                    resultsContent
                }
                .padding(.top, 8)
            }
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { isFocused = false; dismiss() }
                }
            }
            .onReceive(appModel.$catalog) { catalog in
                index = CatalogSearchIndex(catalog: catalog)
                latestItems = Array(ArchiveCatalogSnapshot(catalog: catalog).items.prefix(8))
                updateProgress(catalog: catalog)
                indexRevision += 1
            }
            .onReceive(appModel.$watchProgress) { records in updateProgress(records: records) }
            .task(id: historyKey) {
                recentSearches = UserDefaults.standard.stringArray(forKey: historyKey) ?? []
            }
            .task { isFocused = true }
            .task(id: searchKey) {
                guard !CatalogSearchIndex.normalize(query).isEmpty else {
                    results = []
                    isSearching = false
                    atmosphereURL = latestItems.first?.artwork.preferredBackdrop
                    return
                }
                isSearching = true
                do { try await Task.sleep(for: .milliseconds(160)) } catch { return }
                guard !Task.isCancelled else { return }
                results = index.search(query, scope: scope)
                isSearching = false
                atmosphereURL = results.first?.media.artwork.preferredBackdrop
            }
        }
        .preferredColorScheme(.dark)
        .tint(.white)
    }

    private var searchField: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
            TextField("Titles, episodes, or S01E02", text: $query)
                .focused($isFocused)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .onSubmit { rememberSearch(); isFocused = false }
                .accessibilityIdentifier("catalogSearchField")
            if !query.isEmpty {
                Button {
                    query = ""
                    isFocused = true
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.leading, 18)
        .padding(.trailing, query.isEmpty ? 18 : 4)
        .frame(minHeight: 56)
        .cworldSearchGlass()
        .padding(.horizontal, 20)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.18), value: query.isEmpty)
    }

    @ViewBuilder private var resultsContent: some View {
        if CatalogSearchIndex.normalize(query).isEmpty {
            discovery
        } else if isSearching && results.isEmpty {
            ProgressView("Searching…").frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if results.isEmpty {
            ContentUnavailableView.search(text: query)
                .frame(maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Text("\(results.count) \(results.count == 1 ? "result" : "results")")
                            .font(.subheadline).foregroundStyle(.secondary)
                        Spacer()
                        if isSearching { ProgressView().controlSize(.small) }
                    }
                    .padding(.bottom, 4)
                    if scope == .all, let best = results.first {
                        Text("Best match").font(.title3.weight(.semibold))
                        resultRow(best, featured: true)
                        resultSection("Movies & Shows", items: results.dropFirst().filter { $0.episode == nil })
                        resultSection("Episodes", items: results.dropFirst().filter { $0.episode != nil })
                    } else {
                        ForEach(results) { result in resultRow(result) }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .modifier(SearchResultsEntrance(scope: scope, reduceMotion: reduceMotion))
        }
    }

    private var atmosphere: some View {
        GeometryReader { geometry in
            ZStack {
                Color(white: 0.025)
                if let url = atmosphereURL {
                    CatalogImage(url: url, showsBorder: false, maxPixelSize: 900)
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .blur(radius: 28)
                        .scaleEffect(1.12)
                        .id(url)
                        .transition(.opacity)
                }
                Color.black.opacity(0.66)
                LinearGradient(colors: [.black.opacity(0.15), .black.opacity(0.85)], startPoint: .top, endPoint: .bottom)
            }
            .clipped()
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.55), value: atmosphereURL)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private var discovery: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Find your next watch").font(.title2.weight(.semibold))
                    Text("A title, an episode, or something you remember.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                if !recentSearches.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Recent searches").font(.headline)
                            Spacer()
                            Button("Clear") {
                                recentSearches = []
                                UserDefaults.standard.removeObject(forKey: historyKey)
                            }.font(.subheadline).foregroundStyle(.secondary)
                        }
                        ForEach(recentSearches, id: \.self) { search in
                            Button { query = search } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "clock.arrow.circlepath").foregroundStyle(.secondary)
                                    Text(search).lineLimit(1)
                                    Spacer()
                                    Image(systemName: "arrow.up.left").font(.caption).foregroundStyle(.secondary)
                                }.frame(minHeight: 44).contentShape(Rectangle())
                            }.buttonStyle(.plain)
                        }
                    }
                }
                if !latestItems.isEmpty {
                    Text("Recently added").font(.headline)
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(alignment: .top, spacing: 14) {
                            ForEach(latestItems) { media in
                                NavigationLink {
                                    MediaDetailView(media: media)
                                } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        CatalogImage(url: media.artwork.preferredCard ?? media.artwork.poster,
                                                     showsBorder: false, maxPixelSize: 360)
                                            .frame(width: 120, height: 120)
                                            .clipShape(RoundedRectangle(cornerRadius: 16))
                                        Text(media.title).font(.caption.weight(.medium)).lineLimit(2)
                                    }.frame(width: 120, alignment: .leading)
                                }.buttonStyle(.plain)
                                .simultaneousGesture(TapGesture().onEnded { isFocused = false })
                            }
                        }
                    }
                }
            }.padding(20)
        }.scrollDismissesKeyboard(.interactively)
    }

    @ViewBuilder private func resultSection(_ title: String, items: [CatalogSearchResult]) -> some View {
        if !items.isEmpty {
            Text(title).font(.title3.weight(.semibold)).padding(.top, 10)
            ForEach(items) { item in resultRow(item) }
        }
    }

    private func resultRow(_ result: CatalogSearchResult, featured: Bool = false) -> some View {
        let record = progress(for: result)
        return HStack(spacing: 8) {
            NavigationLink {
                MediaDetailView(media: result.media, initialSeason: result.season, initialEpisode: result.episode)
            } label: {
                HStack(spacing: 14) {
                    SearchResultArtwork(result: result)
                        .frame(width: result.episode == nil ? (featured ? 100 : 76) : 120,
                               height: result.episode == nil ? (featured ? 100 : 76) : 72)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 5) {
                        Text(result.title).font(featured ? .title3.weight(.semibold) : .headline)
                            .foregroundStyle(.white).lineLimit(2)
                        Text(result.episode == nil
                             ? [result.media.type == "movie" ? "Movie" : "Show", result.media.metadata.year].filter { !$0.isEmpty }.joined(separator: " · ")
                             : result.subtitle)
                            .font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        if let record, record.duration > 0, record.currentTime > 5 {
                            Text(record.currentTime >= record.duration - 30 ? (result.media.type == "show" && result.episode == nil ? "Last episode watched" : "Watched")
                                 : "Resume · \(Int(ceil((record.duration - record.currentTime) / 60)))m left")
                                .font(.caption.weight(.medium)).foregroundStyle(.white.opacity(0.8))
                        }
                    }
                    Spacer(minLength: 0)
                }.contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .simultaneousGesture(TapGesture().onEnded { rememberSearch(); isFocused = false })
            if result.episode != nil || result.media.type == "movie" {
                NavigationLink { searchPlayer(result) } label: {
                    Image(systemName: "play.fill").font(.system(size: 14, weight: .semibold))
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.10), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Play \(result.title)")
                .simultaneousGesture(TapGesture().onEnded { rememberSearch(); isFocused = false })
            }
        }
        .padding(featured ? 12 : 0)
        .background(.white.opacity(featured ? 0.065 : 0), in: RoundedRectangle(cornerRadius: 22))
    }

    private func searchPlayer(_ result: CatalogSearchResult) -> some View {
        let episode = result.media.seasons?.first { $0.number == result.season }?.episodes.first { $0.number == result.episode }
        return NativeVideoPlayerView(mediaID: episode?.playbackRef.mediaId ?? result.media.movieAsset?.mediaId ?? result.media.id,
                                    season: result.season, episode: result.episode, title: result.title,
                                    subtitleURL: episode?.subtitles.first ?? result.media.subtitleTracks.first,
                                    skipIntroStart: episode?.skipIntroStart, skipIntroEnd: episode?.skipIntroEnd,
                                    skipOutroStart: episode?.skipOutroStart)
    }

    private func progress(for result: CatalogSearchResult) -> WatchProgressRecord? {
        guard let season = result.season, let number = result.episode else { return progressByMedia[result.media.id] }
        let episode = result.media.seasons?.first { $0.number == season }?.episodes.first { $0.number == number }
        return appModel.progress(for: episode?.playbackRef.mediaId ?? result.media.id, season: season, episode: number)
    }

    private func updateProgress(catalog: [CWorldMedia]? = nil, records: [String: WatchProgressRecord]? = nil) {
        var mapping: [String: String] = [:]
        for media in catalog ?? appModel.catalog {
            mapping[media.id] = media.id
            if let id = media.movieAsset?.mediaId { mapping[id] = media.id }
            for season in media.seasons ?? [] {
                for episode in season.episodes { mapping[episode.playbackRef.mediaId] = media.id }
            }
        }
        var latest: [String: WatchProgressRecord] = [:]
        for record in (records ?? appModel.watchProgress).values {
            guard let id = mapping[record.showID] else { continue }
            if latest[id] == nil || record.updatedAt > latest[id]!.updatedAt { latest[id] = record }
        }
        progressByMedia = latest
    }

    private func rememberSearch() {
        let value = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !CatalogSearchIndex.normalize(value).isEmpty, appModel.activeProfile != nil else { return }
        recentSearches.removeAll { CatalogSearchIndex.normalize($0) == CatalogSearchIndex.normalize(value) }
        recentSearches.insert(String(value.prefix(160)), at: 0)
        recentSearches = Array(recentSearches.prefix(6))
        UserDefaults.standard.set(recentSearches, forKey: historyKey)
    }
}

private struct SearchResultsEntrance: ViewModifier {
    let scope: CatalogSearchScope
    let reduceMotion: Bool
    func body(content: Content) -> some View {
        content.phaseAnimator([false, true], trigger: scope) { view, changing in
            view.opacity(changing ? 0.75 : 1)
                .offset(y: changing && !reduceMotion ? 5 : 0)
        } animation: { changing in
            .easeOut(duration: reduceMotion ? 0.1 : (changing ? 0.08 : 0.22))
        }
    }
}

private struct SearchResultArtwork: View {
    let result: CatalogSearchResult
    @State private var image: UIImage?
    private var placeholder: URL? {
        guard let season = result.season, let episode = result.episode else { return nil }
        let id = result.media.id.replacingOccurrences(of: "-", with: "")
        return URL(string: "https://d20honz3pkzrs8.cloudfront.net/\(id)/placeholders/season\(season)/S\(season)E\(episode)_\(id)_placeholder.png")
    }
    var body: some View {
        Group {
            if let image { Image(uiImage: image).resizable().scaledToFill() }
            else { CatalogImage(url: result.media.artwork.preferredCard ?? result.media.artwork.poster, showsBorder: false, maxPixelSize: 360) }
        }
        .clipped()
        .task(id: placeholder) {
            image = nil
            guard let url = placeholder else { return }
            let loaded = await ImageCache.shared.image(for: url, maxPixelSize: 360)
            guard !Task.isCancelled else { return }
            image = loaded
        }
    }
}

private struct SearchGlass: ViewModifier {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    func body(content: Content) -> some View {
        if reduceTransparency {
            content.background(Color(white: 0.15), in: Capsule())
        } else if #available(iOS 26, *) {
            content.glassEffect(.regular.interactive(), in: Capsule())
        } else {
            content.background(.ultraThinMaterial, in: Capsule())
                .overlay { Capsule().stroke(.white.opacity(0.18), lineWidth: 1) }
        }
    }
}

private extension View {
    func cworldSearchGlass() -> some View { modifier(SearchGlass()) }
}
