import PhotosUI
import SwiftUI
import UIKit

enum ArchiveTypeFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case shows = "Shows"
    case movies = "Movies"

    var id: String { rawValue }
    var mediaType: String? {
        switch self {
        case .all: return nil
        case .shows: return "show"
        case .movies: return "movie"
        }
    }
}

enum ArchiveSortMode: String, CaseIterable, Identifiable {
    case newest = "Newest"
    case oldest = "Oldest"
    case highestRated = "Highest Rated"
    case lowestRated = "Lowest Rated"
    case alphabetical = "Alphabetical (A–Z)"

    var id: String { rawValue }
}

/// Built only when catalog/filter inputs change, never while paging or rendering rows.
struct ArchiveCatalogSnapshot {
    let items: [CWorldMedia]
    let pages: [[CWorldMedia]]
    let latest: [CWorldMedia]

    init(catalog: [CWorldMedia] = [], query: String = "", type: ArchiveTypeFilter = .all,
         sort: ArchiveSortMode = .newest, pageSize: Int = 6) {
        let dated = catalog.enumerated().map { (offset: $0.offset, media: $0.element, date: Self.parseAddedDate($0.element.dateAdded)) }
        let newest = dated.filter { $0.date != nil }.sorted {
            if $0.date != $1.date { return $0.date! > $1.date! }
            return $0.offset < $1.offset
        }.prefix(3).map(\.media)
        latest = newest.isEmpty ? Array(catalog.suffix(3).reversed()) : Array(newest)

        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        var matches = dated.filter {
            (type.mediaType == nil || $0.media.type == type.mediaType)
                && (query.isEmpty || $0.media.title.localizedCaseInsensitiveContains(query)
                    || $0.media.metadata.creator.localizedCaseInsensitiveContains(query))
        }
        let hasDates = matches.contains { $0.date != nil }
        matches.sort { lhs, rhs in
            switch sort {
            case .newest, .oldest:
                if !hasDates { return sort == .newest ? lhs.offset > rhs.offset : lhs.offset < rhs.offset }
                let left = lhs.date ?? .distantPast
                let right = rhs.date ?? .distantPast
                if left != right { return sort == .newest ? left > right : left < right }
            case .highestRated, .lowestRated:
                let left = Double(lhs.media.metadata.rating) ?? 0
                let right = Double(rhs.media.metadata.rating) ?? 0
                if left != right { return sort == .highestRated ? left > right : left < right }
            case .alphabetical:
                let order = lhs.media.title.localizedCaseInsensitiveCompare(rhs.media.title)
                if order != .orderedSame { return order == .orderedAscending }
            }
            return lhs.offset < rhs.offset
        }
        let items = matches.map(\.media)
        self.items = items
        let pageSize = max(pageSize, 1)
        pages = stride(from: 0, to: items.count, by: pageSize).map {
            Array(items[$0..<min($0 + pageSize, items.count)])
        }
    }

    private static func parseAddedDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let parts = value.split { $0 == "-" || $0 == "/" }.compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        let components: DateComponents
        if parts[0] > 31 {
            components = DateComponents(year: parts[0], month: parts[1], day: parts[2])
        } else {
            let year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
            components = DateComponents(year: year, month: parts[0], day: parts[1])
        }
        return Calendar(identifier: .gregorian).date(from: components)
    }
}

private struct ArchiveScrollFrameKey: PreferenceKey {
    static let defaultValue = CGRect.zero
    static func reduce(value: inout CGRect, nextValue: () -> CGRect) {
        value = nextValue()
    }
}

/// Non-publishing bookkeeping: scroll pixels must not invalidate the Library.
private final class ArchiveScrollDirectionTracker {
    var viewportHeight: CGFloat = 0
    private var previous: CGFloat?
    private var distance: CGFloat = 0
    private var compact = false

    func endGesture() { previous = nil; distance = 0 }

    func update(_ offset: CGFloat) -> Bool? {
        defer { previous = offset }
        if offset <= 8 { distance = 0; return change(to: false) }
        guard let previous else { return nil }
        let delta = offset - previous
        guard abs(delta) > 0.5 else { return nil }
        if delta * distance < 0 { distance = 0 }
        distance += delta
        if distance > 18 { distance = 0; return change(to: true) }
        if distance < -10 { distance = 0; return change(to: false) }
        return nil
    }

    private func change(to value: Bool) -> Bool? {
        guard compact != value else { return nil }
        compact = value
        return value
    }
}

private struct ArchiveLegacyScrollFrame: ViewModifier {
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content
        } else {
            content.background {
                GeometryReader { proxy in
                    Color.clear.preference(key: ArchiveScrollFrameKey.self,
                        value: proxy.frame(in: .named("archiveVerticalScroll")))
                }
                .allowsHitTesting(false)
            }
        }
    }
}

private struct ArchiveScrollOffsetObserver: ViewModifier {
    let onCompactChange: (Bool) -> Void
    @State private var tracker = ArchiveScrollDirectionTracker()

    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.onScrollGeometryChange(for: CGFloat.self) { geometry in
                let maximum = max(0, geometry.contentSize.height - geometry.containerSize.height
                                  + geometry.contentInsets.top + geometry.contentInsets.bottom)
                return min(maximum, max(0, geometry.contentOffset.y + geometry.contentInsets.top))
            } action: { _, offset in
                report(offset)
            }
            .onScrollPhaseChange { _, phase in
                if phase == .idle { tracker.endGesture() }
            }
        } else {
            content
                .background {
                    GeometryReader { proxy in
                        Color.clear
                            .onAppear { tracker.viewportHeight = proxy.size.height }
                            .onChange(of: proxy.size.height) { _, height in
                                tracker.viewportHeight = height
                                tracker.endGesture()
                            }
                    }
                    .allowsHitTesting(false)
                }
                .onPreferenceChange(ArchiveScrollFrameKey.self) { frame in
                    guard tracker.viewportHeight > 0, frame.height > 0 else { return }
                    let maximum = max(0, frame.height - tracker.viewportHeight)
                    report(min(maximum, max(0, -frame.minY)))
                }
        }
    }

    private func report(_ offset: CGFloat) {
        if let compact = tracker.update(offset) { onCompactChange(compact) }
    }
}

struct ArchiveView: View {
    var contentBottomInset: CGFloat = 0
    var onOpenMedia: (String) -> Void
    var onNavigationCompactChange: (Bool) -> Void = { _ in }
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.displayScale) private var displayScale
    @State private var searchText = ""
    @State private var typeFilter: ArchiveTypeFilter = .all
    @State private var sortMode: ArchiveSortMode = .newest
    @State private var showingBackdropPicker = false
    @State private var resumeItem: ContinueWatchingItem?
    @State private var catalogSnapshot = ArchiveCatalogSnapshot()
    @State private var continueWatching: [ContinueWatchingItem] = []

    private let allMediaPerPage = 6

    private var filteredItems: [CWorldMedia] { catalogSnapshot.items }

    private var currentBackdrop: CWorldMedia? {
        appModel.catalog.first
    }

    private var archiveBackdropURL: URL? {
        if let value = appModel.activeProfile?.archiveBackdrop,
           !value.isEmpty,
           let url = URL(string: value) {
            return url
        }
        return currentBackdrop?.artwork.preferredBackdrop
    }

    private var latestItems: [CWorldMedia] { catalogSnapshot.latest }
    private var allMediaPages: [[CWorldMedia]] { catalogSnapshot.pages }

    private func updateCatalogSnapshot(_ catalog: [CWorldMedia]) {
        catalogSnapshot = ArchiveCatalogSnapshot(catalog: catalog, query: searchText,
                                                type: typeFilter, sort: sortMode, pageSize: allMediaPerPage)
    }

    var body: some View {
        Group {
            archiveContent
            .toolbar(.hidden, for: .navigationBar)
            .task(id: archivePrefetchKey) { await prepareArchiveArtwork() }
            .navigationDestination(item: $resumeItem) { item in
                NativeVideoPlayerView(
                    mediaID: item.playbackID,
                    season: item.progress.season,
                    episode: item.progress.episode,
                    title: item.episode.map { "S\(item.progress.season ?? 1)E\($0.number) · \($0.title)" } ?? item.media.title,
                    subtitleURL: item.episode?.subtitles.first ?? item.media.subtitleTracks.first,
                    skipIntroStart: item.episode?.skipIntroStart, skipIntroEnd: item.episode?.skipIntroEnd,
                    skipOutroStart: item.episode?.skipOutroStart
                )
            }
            .sheet(isPresented: $showingBackdropPicker) {
                ArchiveBackdropPickerView()
            }
            .onReceive(appModel.$catalog) { catalog in
                updateCatalogSnapshot(catalog)
                continueWatching = Array(ContinueWatchingItem.make(
                    catalog: catalog, records: Array(appModel.watchProgress.values)
                ).prefix(10))
            }
            .onReceive(appModel.$watchProgress) { records in
                continueWatching = Array(ContinueWatchingItem.make(
                    catalog: appModel.catalog, records: Array(records.values)
                ).prefix(10))
            }
            .onChange(of: searchText) { _, _ in
                updateCatalogSnapshot(appModel.catalog)
            }
            .onChange(of: typeFilter) { _, _ in
                updateCatalogSnapshot(appModel.catalog)
            }
            .onChange(of: sortMode) { _, _ in
                updateCatalogSnapshot(appModel.catalog)
            }
        }
    }

    private var archiveContent: some View {
    ZStack(alignment: .top) {
        Color.black.ignoresSafeArea()

        if archiveBackdropURL != nil {
            FullScreenCatalogBackdrop(url: archiveBackdropURL)
        }

        Color.black.opacity(0.58)
            .ignoresSafeArea()

        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: 60) {
                if !latestItems.isEmpty && searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    newMediaSection
                }

                if !continueWatching.isEmpty && searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    continueWatchingSection
                }

                allMediaSection
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 28 + contentBottomInset)
            .modifier(ArchiveLegacyScrollFrame())
        }
        .coordinateSpace(name: "archiveVerticalScroll")
        .modifier(ArchiveScrollOffsetObserver(onCompactChange: onNavigationCompactChange))

    }
    }

    private func prepareArchiveArtwork() async {
        // The retained Library warms before it is opened; switching tabs
        // must not cancel/restart this work.
        do { try await Task.sleep(for: .milliseconds(200)) } catch { return }
        for (index, media) in latestItems.prefix(3).enumerated() {
            guard !Task.isCancelled else { return }
            guard let url = media.artwork.preferredCard ?? media.artwork.poster else { continue }
            let size = Self.artworkPixelSize(width: index == 0 ? 240 : 118,
                                            height: index == 0 ? 240 : 112,
                                            displayScale: displayScale)
            let resolved = MobileArtwork.bundledURL(for: url, maxPixelSize: size) ?? url
            guard resolved.pathExtension.lowercased() != "svg" else { continue }
            _ = await ImageCache.shared.image(for: resolved, maxPixelSize: size)
        }
        await ImageCache.shared.prefetchImages(archivePrefetchURLs)
    }

    private var archivePrefetchKey: String {
        "\(appModel.catalogRevision):\(continueWatching.map { "\($0.id):\($0.progress.season ?? 0):\($0.progress.episode ?? 0)" }.joined(separator: ","))"
    }

    private var archivePrefetchURLs: [URL] {
        // Fetch only artwork actually used on this screen, including adjacent
        // pages. Do not compete with visible images by fetching every backdrop.
        return latestItems.compactMap {
            $0.artwork.preferredCard ?? $0.artwork.poster
        } + continueWatching.compactMap { placeholderURL(for: $0) }
    }

    private var newMediaSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("New Media")
                    .archiveFont(24, weight: .semibold)
                    .foregroundStyle(.white)
                Spacer()
                Label("Recently added", systemImage: "folder")
                    .archiveFont(13)
                    .foregroundStyle(.white.opacity(0.8))
            }

            HStack(spacing: 8) {
                if let first = latestItems.first {
                    archiveImage(first, width: 240, height: 240)
                }
                VStack(spacing: 8) {
                    ForEach(latestItems.dropFirst().prefix(2)) { media in
                        archiveImage(media, width: 118, height: 112)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }

    private var continueWatchingSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Continue Watching")
                .archiveFont(24, weight: .semibold)
                .foregroundStyle(.white)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(continueWatching) { item in
                        let media = item.media
                        Button {
                            resumeItem = item
                        } label: {
                            ZStack(alignment: .bottomLeading) {
                                CatalogImage(url: placeholderURL(for: item),
                                             showsBorder: false,
                                             maxPixelSize: Self.artworkPixelSize(width: 282, height: 160, displayScale: displayScale))
                                    .frame(width: 282, height: 160)

                                LinearGradient(
                                    colors: [.clear, .black.opacity(0.9)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(media.title)
                                        .archiveFont(15, weight: .semibold)
                                        .foregroundStyle(.white)
                                        .lineLimit(1)

                                    if let season = item.progress.season,
                                       let episode = item.progress.episode {
                                        Text("S\(season) · E\(episode)\(item.episode.map { " · \($0.title)" } ?? "")")
                                            .archiveFont(13)
                                            .foregroundStyle(.white.opacity(0.7))
                                            .lineLimit(1)
                                    }

                                    ProgressView(value: min(max(item.progress.currentTime / max(item.progress.duration, 1), 0), 1))
                                        .tint(.white)
                                        .progressViewStyle(.linear)
                                        .frame(height: 4)
                                }
                                .padding(.horizontal, 12)
                                .padding(.bottom, 10)
                            }
                            .frame(width: 282, height: 160)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay {
                                MobileArtworkGlassRim(fallbackOpacity: 0.15)
                            }
                            .overlay {
                                CWorldTVPlaybackHighlight(mediaID: item.playbackID, season: item.progress.season, episode: item.progress.episode)
                            }
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button(role: .destructive) {
                                Task { await appModel.removeFromContinueWatching(media) }
                            } label: {
                                Label("Remove from Continue Watching", systemImage: "xmark.circle")
                            }
                        }
                        .accessibilityAction(named: "Remove from Continue Watching") {
                            Task { await appModel.removeFromContinueWatching(media) }
                        }
                    }
                }
            }
        }
    }

    private var allMediaSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("All Media")
                    .archiveFont(24, weight: .semibold)
                    .foregroundStyle(.white)
                Spacer()
                Menu {
                    Button("Choose library backdrop", systemImage: "photo.on.rectangle.angled") {
                        showingBackdropPicker = true
                    }
                    Section("Sort by") {
                        ForEach(ArchiveSortMode.allCases) { mode in
                            Button {
                                sortMode = mode
                            } label: {
                                Label(mode.rawValue, systemImage: sortMode == mode ? "checkmark" : "")
                            }
                        }
                    }
                    Section("Type") {
                        ForEach(ArchiveTypeFilter.allCases) { filter in
                            Button {
                                typeFilter = filter
                            } label: {
                                Label(filter.rawValue, systemImage: typeFilter == filter ? "checkmark" : "")
                            }
                        }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease")
                        .font(.system(size: 22))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }

            if filteredItems.isEmpty {
                VStack(spacing: 8) {
                    Text("No results found.")
                        .archiveFont(24, weight: .medium)
                    Text("We can't find any media matching your search.")
                        .archiveFont(14)
                        .foregroundStyle(.white.opacity(0.45))
                    Button("Reset search") {
                        searchText = ""
                        typeFilter = .all
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white.opacity(0.25))
                }
                .foregroundStyle(.white.opacity(0.72))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 60)
            } else {
                ArchiveMediaPager(pages: allMediaPages, onOpenMedia: onOpenMedia)
                    .id(filteredItems.map(\.id))
            }
        }
    }

    static func artworkPixelSize(width: CGFloat, height: CGFloat, displayScale: CGFloat) -> Int {
        // SwiftUI layout uses points; the image decoder requires physical pixels.
        // A 240-point card needs 720 pixels on a 3x display, not a thumbnail.
        Int(ceil(max(width, height) * displayScale))
    }

    private func archiveImage(_ media: CWorldMedia, width: CGFloat, height: CGFloat) -> some View {
        Button {
            onOpenMedia(media.id)
        } label: {
            CatalogImage(
                url: media.artwork.preferredCard ?? media.artwork.poster,
                maxPixelSize: Self.artworkPixelSize(width: width, height: height, displayScale: displayScale)
            )
                .frame(width: width, height: height)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(alignment: .topLeading) {
                    if !media.metadata.rating.isEmpty {
                        ArchiveRatingBadge(rating: media.metadata.rating)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private func placeholderURL(for item: ContinueWatchingItem) -> URL? {
        let media = item.media
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")

        if media.type == "movie" {
            let version = cleanID == "thegrey" ? "?v=53e47519f8c3" : ""
            return URL(string: "https://cearaworld.com/images/\(cleanID)/placeholders/\(cleanID)_placeholder.png\(version)")
        }

        let season = item.progress.season ?? 1
        let episode = item.progress.episode ?? 1
        let seasonLabel = "S\(season)"
        let path = "https://d20honz3pkzrs8.cloudfront.net/\(cleanID)/placeholders/season\(season)/\(seasonLabel)E\(episode)_\(cleanID)_placeholder.png"
        return URL(string: path)
    }

}

private struct ArchiveRatingBadge: View {
    let rating: String

    private var shape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            cornerRadii: .init(
                topLeading: 16,
                bottomLeading: 0,
                bottomTrailing: 16,
                topTrailing: 0
            ),
            style: .continuous
        )
    }

    var body: some View {
        Text(rating)
            .archiveFont(20, weight: .semibold)
            .foregroundStyle(.white)
            .frame(width: 48, height: 48)
            .background(badgeSurface)
            .overlay {
                shape.stroke(.white.opacity(0.3), lineWidth: 1)
            }
            .clipShape(shape)
    }

    @ViewBuilder
    private var badgeSurface: some View {
        if #available(iOS 26.0, *) {
            shape
                .fill(.clear)
                .glassEffect(.clear.interactive(), in: shape)
        } else {
            shape
                .fill(.black.opacity(0.2))
                .background(.ultraThinMaterial, in: shape)
        }
    }
}

private struct ArchiveBackdropPickerView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedPage = 0
    @State private var photoItem: PhotosPickerItem?

    private let backdropsPerPage = 4

    private var backdropOptions: [CWorldMedia] {
        var seen = Set<String>()
        return appModel.catalog
            .filter { $0.artwork.preferredBackdrop != nil }
            .filter { media in
                guard let url = media.artwork.preferredBackdrop else { return false }
                return seen.insert(url.absoluteString).inserted
            }
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
    }

    private var pages: [[CWorldMedia]] {
        let options = backdropOptions
        return stride(from: 0, to: options.count, by: backdropsPerPage).map { start in
            Array(options[start..<min(start + backdropsPerPage, options.count)])
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                CWorldTheme.background.ignoresSafeArea()

                VStack(spacing: 18) {
                    Text("Choose Backdrop")
                        .archiveFont(26, weight: .semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if pages.isEmpty {
                        ContentUnavailableView(
                            "No backdrops available",
                            systemImage: "photo.on.rectangle.angled",
                            description: Text("Refresh the catalog and try again.")
                        )
                        .foregroundStyle(.white.opacity(0.7))
                    } else {
                        TabView(selection: $selectedPage) {
                            ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                                LazyVGrid(
                                    columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                                    spacing: 12
                                ) {
                                    ForEach(page) { media in
                                        backdropButton(media)
                                    }
                                }
                                .padding(.horizontal, 1)
                                .tag(pageIndex)
                            }
                        }
                        .tabViewStyle(.page(indexDisplayMode: .never))
                        .frame(height: 360)

                        HStack(spacing: 8) {
                            ForEach(pages.indices, id: \.self) { index in
                                Capsule()
                                    .fill(index == selectedPage ? .white : .white.opacity(0.3))
                                    .frame(width: index == selectedPage ? 24 : 8, height: 8)
                            }
                        }
                    }

                    HStack(spacing: 12) {
                        PhotosPicker(selection: $photoItem, matching: .images) {
                            Label("Choose Your Own", systemImage: "arrow.up.doc")
                                .archiveFont(14, weight: .semibold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(.white.opacity(0.12), in: Capsule())
                        }

                        Button {
                            Task {
                                await appModel.updateArchiveBackdrop("")
                                dismiss()
                            }
                        } label: {
                            Text("Use Default")
                                .archiveFont(14, weight: .semibold)
                                .foregroundStyle(.white.opacity(0.75))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(.white.opacity(0.08), in: Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
            .onChange(of: photoItem) { _, item in
                guard let item else { return }
                Task { await saveCustomBackdrop(item) }
            }
        }
    }

    private func backdropButton(_ media: CWorldMedia) -> some View {
        let url = media.artwork.preferredBackdrop
        let isSelected = url?.absoluteString == appModel.activeProfile?.archiveBackdrop

        return Button {
            guard let url else { return }
            Task {
                await appModel.updateArchiveBackdrop(url.absoluteString)
                dismiss()
            }
        } label: {
            ZStack(alignment: .bottomLeading) {
                CatalogImage(url: url, showsBorder: false)
                    .frame(height: 165)

                LinearGradient(
                    colors: [.clear, .black.opacity(0.86)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                Text(media.title)
                    .archiveFont(13, weight: .semibold)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .padding(10)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 21, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(9)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? .white : .white.opacity(0.16), lineWidth: isSelected ? 2 : 1)
            }
        }
        .buttonStyle(.plain)
    }

    private func saveCustomBackdrop(_ item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data),
              let jpeg = image.jpegData(compressionQuality: 0.82) else { return }

        await appModel.updateArchiveBackdrop("data:image/jpeg;base64,\(jpeg.base64EncodedString())")
        dismiss()
    }
}

/// Own page selection here so a swipe does not rebuild every Library section.
private struct ArchiveMediaPager: View {
    let pages: [[CWorldMedia]]
    let onOpenMedia: (String) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var allMediaPage = 0

    var body: some View {
        VStack(spacing: 10) {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(alignment: .center, spacing: 0) {
                        ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                            ArchiveMediaPage(
                                items: page,
                                onSelect: { onOpenMedia($0.id) }
                            )
                            .containerRelativeFrame(.horizontal)
                            .id(pageIndex)
                        }
                    }
                    .scrollTargetLayout()
                }
                // Native scrolling follows the finger continuously. Stable lazy
                // pages avoid swapping the destination's content during a swipe.
                .scrollTargetBehavior(.paging)
                .scrollPosition(id: Binding<Int?>(
                    get: { allMediaPage },
                    set: { page in
                        if let page, pages.indices.contains(page) { allMediaPage = page }
                    }
                ))
                .frame(height: CGFloat(6 * 96 + (6 - 1) * 8))

                if pages.count > 1 {
                    HStack(spacing: 8) {
                        ForEach(pages.indices, id: \.self) { index in
                            Button {
                                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.35)) {
                                    allMediaPage = index
                                }
                            } label: {
                                Capsule()
                                    .fill(index == allMediaPage ? .white : .white.opacity(0.35))
                                    .frame(width: index == allMediaPage ? 24 : 8, height: 8)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Go to archive page \(index + 1)")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 6)
                    // Animate the indicator only, not every card/glass surface.
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: allMediaPage)
                }
        }
        .task(id: allMediaPage) {
            // Cancel obsolete work on another swipe; let visible images load
            // first, then prepare at most the two neighboring six-item pages.
            do { try await Task.sleep(for: .milliseconds(300)) } catch { return }
            for index in [allMediaPage + 1, allMediaPage - 1] where pages.indices.contains(index) {
                for media in pages[index] {
                    guard !Task.isCancelled else { return }
                    guard let url = media.artwork.preferredCard ?? media.artwork.poster else { continue }
                    let resolved = MobileArtwork.bundledURL(for: url, maxPixelSize: 240) ?? url
                    guard resolved.pathExtension.lowercased() != "svg" else { continue }
                    // Match the actual row decode size and reuse the existing
                    // bounded image cache. Never retain whole pages here.
                    _ = await ImageCache.shared.image(for: resolved, maxPixelSize: 240)
                }
            }
        }
    }
}

private struct ArchiveMediaPage: View {
    let items: [CWorldMedia]
    let onSelect: (CWorldMedia) -> Void

    var body: some View {
        VStack(spacing: 8) {
            ForEach(items) { media in
                Button {
                    onSelect(media)
                } label: {
                    HStack(spacing: 10) {
                            CatalogImage(
                                url: media.artwork.preferredCard ?? media.artwork.poster,
                                maxPixelSize: 240
                            )
                            .frame(width: 80, height: 80)
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                        VStack(alignment: .leading, spacing: 4) {
                            Text(media.title)
                                .archiveFont(20, weight: .bold)
                                .foregroundStyle(.white)
                                .lineLimit(1)
                            HStack(spacing: 6) {
                                Text(media.metadata.creator)
                                if !media.metadata.rating.isEmpty {
                                    Label(media.metadata.rating, systemImage: "star.fill")
                                }
                            }
                            .archiveFont(13)
                            .foregroundStyle(.white.opacity(0.62))
                            .lineLimit(1)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(8)
                    .background(archiveGlassSurface)
                    .overlay {
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(.white.opacity(0.2), lineWidth: 1)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    @ViewBuilder
    private var archiveGlassSurface: some View {
        if #available(iOS 26.0, *) {
            RoundedRectangle(cornerRadius: 16)
                .fill(.clear)
                .glassEffect(.clear.interactive(), in: .rect(cornerRadius: 16))
        } else {
            RoundedRectangle(cornerRadius: 16)
                .fill(.thinMaterial)
                .overlay {
                    LinearGradient(
                        colors: [.white.opacity(0.14), .white.opacity(0.04), .clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
        }
    }

}

private extension View {
    func archiveFont(_ size: CGFloat, weight: Font.Weight = .regular) -> some View {
        font(.custom(CWorldFonts.alexandria(weight), size: size))
    }
}
