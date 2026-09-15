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

    init(catalog: [CWorldMedia] = []) {
        entries = catalog.flatMap { media -> [CatalogSearchResult] in
            var results = [CatalogSearchResult(media: media, season: nil, episode: nil,
                title: media.title, subtitle: "\(media.type == "movie" ? "Movie" : "Show") · \(media.metadata.creator)",
                searchable: Self.normalize("\(media.title) \(media.metadata.creator) \(media.metadata.year)"),
                normalizedTitle: Self.normalize(media.title))]
            for season in media.seasons ?? [] {
                for episode in season.episodes {
                    let title = EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season.number, episode: episode.number) ?? episode.title
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
    }

    static func normalize(_ value: String) -> String {
        value.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }.joined(separator: " ")
    }

    func search(_ query: String, scope: CatalogSearchScope = .all) -> [CatalogSearchResult] {
        let normalized = Self.normalize(query)
        let tokens = normalized.split(separator: " ").map(String.init)
        guard !tokens.isEmpty else { return [] }
        return entries.filter { entry in
            (scope == .all || (scope == .episodes) == (entry.episode != nil))
                && tokens.allSatisfy { entry.searchable.contains($0) }
        }.sorted { lhs, rhs in
            func score(_ result: CatalogSearchResult) -> Int {
                if result.normalizedTitle == normalized { return 0 }
                if result.normalizedTitle.hasPrefix(normalized) { return 1 }
                return result.episode == nil ? 2 : 3
            }
            if score(lhs) != score(rhs) { return score(lhs) < score(rhs) }
            if lhs.media.title != rhs.media.title { return lhs.media.title < rhs.media.title }
            if lhs.season != rhs.season { return (lhs.season ?? 0) < (rhs.season ?? 0) }
            return (lhs.episode ?? 0) < (rhs.episode ?? 0)
        }
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

    init(query: String = "") {
        _query = State(initialValue: query)
    }

    private var searchKey: String { "\(indexRevision):\(scope.rawValue):\(query)" }

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(colors: [Color(red: 0.08, green: 0.14, blue: 0.18), .black],
                               startPoint: .topLeading, endPoint: .bottomTrailing).ignoresSafeArea()
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
                indexRevision += 1
            }
            .task { isFocused = true }
            .task(id: searchKey) {
                guard !CatalogSearchIndex.normalize(query).isEmpty else {
                    results = []
                    isSearching = false
                    return
                }
                isSearching = true
                do { try await Task.sleep(for: .milliseconds(160)) } catch { return }
                guard !Task.isCancelled else { return }
                results = index.search(query, scope: scope)
                isSearching = false
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
                .onSubmit { isFocused = false }
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
            ContentUnavailableView("Find your next watch", systemImage: "sparkle.magnifyingglass",
                                   description: Text("Search movies, shows, and individual episodes. Try an episode name or S01E02."))
                .frame(maxHeight: .infinity)
        } else if isSearching && results.isEmpty {
            ProgressView("Searching…").frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if results.isEmpty {
            ContentUnavailableView.search(text: query)
                .frame(maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("\(results.count) \(results.count == 1 ? "result" : "results")")
                            .font(.subheadline).foregroundStyle(.secondary)
                        Spacer()
                        if isSearching { ProgressView().controlSize(.small) }
                    }
                    .padding(.bottom, 4)
                    ForEach(results) { result in
                        NavigationLink {
                            MediaDetailView(media: result.media, initialSeason: result.season, initialEpisode: result.episode)
                        } label: {
                            HStack(spacing: 14) {
                                CatalogImage(url: result.media.artwork.preferredCard ?? result.media.artwork.poster,
                                             showsBorder: false, maxPixelSize: 240)
                                    .frame(width: 64, height: 64)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(result.title).font(.headline).foregroundStyle(.white).lineLimit(2)
                                    Text(result.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
                            }
                            .padding(10)
                            .background(.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 18))
                            .contentShape(RoundedRectangle(cornerRadius: 18))
                        }
                        .buttonStyle(.plain)
                        .disabled(isSearching)
                        .simultaneousGesture(TapGesture().onEnded { isFocused = false })
                        .accessibilityLabel("\(result.title), \(result.subtitle)")
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
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
