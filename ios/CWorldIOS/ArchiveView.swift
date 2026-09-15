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

struct ArchiveView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.displayScale) private var displayScale
    @State private var searchText = ""
    @State private var isSearchOpen = false
    @State private var typeFilter: ArchiveTypeFilter = .all
    @State private var sortMode: ArchiveSortMode = .newest
    @State private var showingProfiles = false
    @State private var showingBackdropPicker = false
    @State private var profileExpanded = false
    @State private var selectedMediaID: String?
    @State private var resumeItem: ContinueWatchingItem?
    @State private var allMediaPage = 0
    @State private var catalogSnapshot = ArchiveCatalogSnapshot()

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
        allMediaPage = min(allMediaPage, max(catalogSnapshot.pages.count - 1, 0))
    }

    private var continueWatching: [ContinueWatchingItem] {
        Array(ContinueWatchingItem.make(catalog: appModel.catalog, records: Array(appModel.watchProgress.values)).prefix(10))
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.black.ignoresSafeArea()

                if archiveBackdropURL != nil {
                    FullScreenCatalogBackdrop(url: archiveBackdropURL)
                }

                Color.black.opacity(0.58)
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 60) {
                        if !latestItems.isEmpty && searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            newMediaSection
                        }

                        if !continueWatching.isEmpty && searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            continueWatchingSection
                        }

                        allMediaSection
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 72)
                    .padding(.bottom, 28)
                }

                archiveHeader
            }
            .toolbar(.hidden, for: .navigationBar)
            .task(id: archivePrefetchKey) {
                await ImageCache.shared.prefetchImages(archivePrefetchURLs)
            }
            .navigationDestination(item: $selectedMediaID) { mediaID in
                if let media = appModel.catalog.first(where: { $0.id == mediaID }) {
                    MediaDetailView(media: media, onBack: {
                        selectedMediaID = nil
                    })
                } else {
                    ContentUnavailableView("Title unavailable", systemImage: "film.stack")
                }
            }
            .sheet(isPresented: $showingProfiles) {
                ProfilePickerView()
            }
            .navigationDestination(item: $resumeItem) { item in
                NativeVideoPlayerView(
                    mediaID: item.playbackID,
                    season: item.progress.season,
                    episode: item.progress.episode,
                    title: item.episode.map { "S\(item.progress.season ?? 1)E\($0.number) · \($0.title)" } ?? item.media.title,
                    subtitleURL: item.episode?.subtitles.first ?? item.media.subtitleTracks.first,
                    skipIntroEnd: item.episode?.skipIntroEnd,
                    skipOutroStart: item.episode?.skipOutroStart
                )
            }
            .sheet(isPresented: $showingBackdropPicker) {
                ArchiveBackdropPickerView()
            }
            .sheet(isPresented: $isSearchOpen) {
                CatalogSearchView()
                    .presentationDragIndicator(.visible)
            }
            .animation(.easeInOut(duration: 0.25), value: isSearchOpen)
            .onReceive(appModel.$catalog) { updateCatalogSnapshot($0) }
            .onChange(of: searchText) { _, _ in
                allMediaPage = 0
                updateCatalogSnapshot(appModel.catalog)
            }
            .onChange(of: typeFilter) { _, _ in
                allMediaPage = 0
                updateCatalogSnapshot(appModel.catalog)
            }
            .onChange(of: sortMode) { _, _ in
                allMediaPage = 0
                updateCatalogSnapshot(appModel.catalog)
            }
        }
    }

    private var archivePrefetchKey: String {
        "\(appModel.catalogRevision):\(filteredItems.map(\.id).joined(separator: ",")):\(sortMode.rawValue):\(typeFilter.rawValue):\(searchText):\(allMediaPage)"
    }

    private var archivePrefetchURLs: [URL] {
        let currentPageItems = allMediaPages.indices.contains(allMediaPage)
            ? allMediaPages[allMediaPage]
            : []
        let visibleItems = latestItems + continueWatching.map(\.media) + currentPageItems

        var urls = visibleItems.flatMap { media in
            [
                media.artwork.preferredCard,
                media.artwork.poster,
                media.artwork.preferredBackdrop,
                placeholderURL(for: media)
            ].compactMap { $0 }
        }
        if let archiveBackdropURL {
            urls.append(archiveBackdropURL)
        }
        return urls
    }

    private var archiveHeader: some View {
        HStack(spacing: 10) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "house.fill")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.white.opacity(0.2), in: Circle())
            }
            .buttonStyle(.plain)

            Spacer()

            profileMenu

            Button {
                withAnimation { isSearchOpen.toggle() }
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 25))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Search titles and episodes")
        }
        .padding(.horizontal, 10)
        .padding(.top, 6)
    }

    private var profileMenu: some View {
        HStack(spacing: 7) {
            Button {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                    profileExpanded = true
                }
            } label: {
                HStack(spacing: 7) {
                    ProfileHeaderImage(profile: appModel.activeProfile)
                    Circle()
                        .fill(CWorldTheme.success)
                        .frame(width: 8, height: 8)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Current profile")

            if profileExpanded {
                Button {
                    showingProfiles = true
                } label: {
                    Image(systemName: "person.2.fill")
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Profiles")
                .transition(.opacity.combined(with: .offset(x: 8)))

                Button {
                    showingBackdropPicker = true
                } label: {
                    Image(systemName: "photo.on.rectangle.angled")
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Choose archive backdrop")
                .transition(.opacity.combined(with: .offset(x: 8)))

                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        profileExpanded = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .foregroundStyle(.white.opacity(0.55))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Collapse profile menu")
                .transition(.opacity)
            }
        }
        .foregroundStyle(.white)
        .font(.system(size: 18, weight: .semibold))
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .frame(width: profileExpanded ? 184 : 70, height: 42, alignment: .leading)
        .background(.white.opacity(0.2), in: Capsule())
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: profileExpanded)
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
                HStack(spacing: 12) {
                    ForEach(continueWatching) { item in
                        let media = item.media
                        Button {
                            resumeItem = item
                        } label: {
                            ZStack(alignment: .bottomLeading) {
                                CatalogImage(url: placeholderURL(for: media))
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

                                    if let progress = latestProgress(for: media),
                                       let season = progress.season,
                                       let episode = progress.episode {
                                        Text("S\(season) · E\(episode)\(episodeTitle(for: media, progress: progress).map { " · \($0)" } ?? "")")
                                            .archiveFont(13)
                                            .foregroundStyle(.white.opacity(0.7))
                                            .lineLimit(1)
                                    }

                                    ProgressView(value: progressFraction(for: media))
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
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(.white.opacity(0.15), lineWidth: 1)
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
                TabView(selection: $allMediaPage) {
                    ForEach(Array(allMediaPages.enumerated()), id: \.offset) { pageIndex, page in
                        ArchiveMediaPage(
                            items: page,
                            isActive: pageIndex == allMediaPage,
                            onSelect: { selectedMediaID = $0.id }
                        )
                        .tag(pageIndex)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: CGFloat(allMediaPerPage * 96 + (allMediaPerPage - 1) * 8))

                if allMediaPages.count > 1 {
                    HStack(spacing: 8) {
                        ForEach(allMediaPages.indices, id: \.self) { index in
                            Button {
                                allMediaPage = index
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
                }
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
            selectedMediaID = media.id
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

    private func placeholderURL(for media: CWorldMedia) -> URL? {
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")

        if media.type == "movie" {
            return URL(string: "https://cearaworld.com/images/\(cleanID)/placeholders/\(cleanID)_placeholder.png")
        }

        let progress = latestProgress(for: media)
        let season = progress?.season ?? 1
        let episode = progress?.episode ?? 1
        let seasonLabel = "S\(season)"
        let path = "https://d20honz3pkzrs8.cloudfront.net/\(cleanID)/placeholders/season\(season)/\(seasonLabel)E\(episode)_\(cleanID)_placeholder.png"
        return URL(string: path)
    }

    private func latestProgress(for media: CWorldMedia) -> WatchProgressRecord? {
        appModel.watchProgress.values
            .filter { appModel.media(for: $0.showID)?.id == media.id }
            .sorted { $0.updatedAt > $1.updatedAt }
            .first
    }

    private func progressFraction(for media: CWorldMedia) -> Double {
        guard let progress = latestProgress(for: media), progress.duration > 0 else { return 0 }
        return min(max(progress.currentTime / progress.duration, 0), 1)
    }

    private func episodeTitle(for media: CWorldMedia, progress: WatchProgressRecord) -> String? {
        guard let season = progress.season, let episode = progress.episode else { return nil }
        return media.seasons?
            .first(where: { $0.number == season })?
            .episodes
            .first(where: { $0.number == episode })?
            .title
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

private struct ArchiveMediaPage: View {
    let items: [CWorldMedia]
    let isActive: Bool
    let onSelect: (CWorldMedia) -> Void

    @State private var isVisible = false

    var body: some View {
        VStack(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, media in
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
                .opacity(isVisible ? 1 : 0)
                .offset(y: isVisible ? 0 : -22)
                .animation(
                    .easeOut(duration: 0.36).delay(Double(index) * 0.075),
                    value: isVisible
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
        .onAppear { animateIn() }
        .onChange(of: isActive) { _, active in
            if active { animateIn() } else { isVisible = false }
        }
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

    private func animateIn() {
        isVisible = false
        DispatchQueue.main.async {
            guard isActive else { return }
            isVisible = true
        }
    }
}

private extension View {
    func archiveFont(_ size: CGFloat, weight: Font.Weight = .regular) -> some View {
        font(.custom(CWorldFonts.alexandria(weight), size: size))
    }
}
