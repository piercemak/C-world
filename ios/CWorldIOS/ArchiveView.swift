import PhotosUI
import SwiftUI
import UIKit

private enum ArchiveTypeFilter: String, CaseIterable, Identifiable {
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

private enum ArchiveSortMode: String, CaseIterable, Identifiable {
    case newest = "Newest"
    case oldest = "Oldest"
    case highestRated = "Highest Rated"
    case lowestRated = "Lowest Rated"
    case alphabetical = "Alphabetical (A–Z)"

    var id: String { rawValue }
}

struct ArchiveView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var isSearchOpen = false
    @State private var typeFilter: ArchiveTypeFilter = .all
    @State private var sortMode: ArchiveSortMode = .newest
    @State private var showingProfiles = false
    @State private var showingBackdropPicker = false
    @State private var profileExpanded = false
    @State private var selectedMediaID: String?
    @State private var allMediaPage = 0

    private let allMediaPerPage = 6

    private var filteredItems: [CWorldMedia] {
        var items = appModel.catalog.filter { media in
            let matchesType = typeFilter.mediaType == nil || media.type == typeFilter.mediaType
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesSearch = query.isEmpty
                || media.title.localizedCaseInsensitiveContains(query)
                || media.metadata.creator.localizedCaseInsensitiveContains(query)
            return matchesType && matchesSearch
        }

        switch sortMode {
        case .newest:
            items = sortByAddedDate(items, newestFirst: true)
        case .oldest:
            items = sortByAddedDate(items, newestFirst: false)
        case .highestRated:
            items.sort { (Double($0.metadata.rating) ?? 0) > (Double($1.metadata.rating) ?? 0) }
        case .lowestRated:
            items.sort { (Double($0.metadata.rating) ?? 0) < (Double($1.metadata.rating) ?? 0) }
        case .alphabetical:
            items.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        }
        return items
    }

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

    private var latestItems: [CWorldMedia] {
        let datedItems = appModel.catalog.enumerated()
            .filter { parseAddedDate($0.element.dateAdded) != nil }
            .sorted { left, right in
                let leftDate = parseAddedDate(left.element.dateAdded) ?? .distantPast
                let rightDate = parseAddedDate(right.element.dateAdded) ?? .distantPast
                if leftDate != rightDate {
                    return leftDate > rightDate
                }
                return left.offset < right.offset
            }
            .prefix(3)
            .map(\.element)

        // Keep New Media visible when an older cached or remote catalog has not
        // received the new dateAdded field yet. The generated catalog uses the
        // date-sorted path above once it is deployed.
        // Older catalogs do not include dateAdded. Catalog entries are appended
        // as media is added to the project, so use the newest tail entries until
        // the date-aware catalog is available from the API.
        return datedItems.isEmpty ? Array(appModel.catalog.suffix(3).reversed()) : Array(datedItems)
    }

    private func sortByAddedDate(_ items: [CWorldMedia], newestFirst: Bool) -> [CWorldMedia] {
        let hasUsableDate = items.contains { parseAddedDate($0.dateAdded) != nil }
        guard hasUsableDate else {
            // Older cached catalogs omit dateAdded but retain catalog insertion order.
            return newestFirst ? Array(items.reversed()) : items
        }

        return items.enumerated()
            .sorted { left, right in
                let leftDate = parseAddedDate(left.element.dateAdded) ?? .distantPast
                let rightDate = parseAddedDate(right.element.dateAdded) ?? .distantPast
                if leftDate != rightDate {
                    return newestFirst ? leftDate > rightDate : leftDate < rightDate
                }
                return left.offset < right.offset
            }
            .map(\.element)
    }

    private func parseAddedDate(_ value: String?) -> Date? {
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

    private var allMediaPages: [[CWorldMedia]] {
        stride(from: 0, to: filteredItems.count, by: allMediaPerPage).map { start in
            Array(filteredItems[start..<min(start + allMediaPerPage, filteredItems.count)])
        }
    }

    private var continueWatching: [CWorldMedia] {
        let records = appModel.watchProgress.values
            .filter { $0.duration > 0 && $0.currentTime > 5 && $0.currentTime < $0.duration - 30 }
            .sorted { $0.updatedAt > $1.updatedAt }

        var seenMediaIDs = Set<String>()
        var mediaItems: [CWorldMedia] = []
        for record in records {
            guard let media = appModel.media(for: record.showID), seenMediaIDs.insert(media.id).inserted else {
                continue
            }
            mediaItems.append(media)
        }
        return Array(mediaItems.prefix(10))
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
            .sheet(isPresented: $showingBackdropPicker) {
                ArchiveBackdropPickerView()
            }
            .overlay(alignment: .top) {
                if isSearchOpen {
                    HStack(spacing: 12) {
                        TextField("Search...", text: $searchText)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .foregroundStyle(.white)
                            .tint(.white)

                        Button {
                            withAnimation { isSearchOpen = false }
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark")
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 58)
                    .background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal, 12)
                    .padding(.top, 6)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(5)
                }
            }
            .animation(.easeInOut(duration: 0.25), value: isSearchOpen)
            .onChange(of: searchText) { _, _ in allMediaPage = 0 }
            .onChange(of: typeFilter) { _, _ in allMediaPage = 0 }
            .onChange(of: sortMode) { _, _ in allMediaPage = 0 }
            .onChange(of: filteredItems.count) { _, _ in
                allMediaPage = min(allMediaPage, max(allMediaPages.count - 1, 0))
            }
        }
    }

    private var archivePrefetchKey: String {
        "\(sortMode.rawValue):\(typeFilter.rawValue):\(searchText):\(allMediaPage)"
    }

    private var archivePrefetchURLs: [URL] {
        let currentPageItems = allMediaPages.indices.contains(allMediaPage)
            ? allMediaPages[allMediaPage]
            : []
        let visibleItems = latestItems + continueWatching + currentPageItems

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
                    ForEach(continueWatching) { media in
                        Button {
                            selectedMediaID = media.id
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
                        }
                        .buttonStyle(.plain)
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

    private func archiveImage(_ media: CWorldMedia, width: CGFloat, height: CGFloat) -> some View {
        Button {
            selectedMediaID = media.id
        } label: {
            CatalogImage(
                url: media.artwork.preferredCard ?? media.artwork.poster,
                maxPixelSize: 240
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
            .filter { $0.showID == media.id }
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
        stride(from: 0, to: backdropOptions.count, by: backdropsPerPage).map { start in
            Array(backdropOptions[start..<min(start + backdropsPerPage, backdropOptions.count)])
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
