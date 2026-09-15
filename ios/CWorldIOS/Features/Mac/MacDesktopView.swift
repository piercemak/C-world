#if targetEnvironment(macCatalyst)
import SwiftUI
import UIKit

enum MacSection: String, CaseIterable, Identifiable {
    case library = "Library", archive = "Archive", history = "Recently Watched", reviews = "Reviews"
    var id: String { rawValue }
    var icon: String {
        switch self { case .library: "square.grid.2x2"; case .archive: "archivebox"; case .history: "clock.arrow.circlepath"; case .reviews: "star" }
    }
}

struct MacDesktopView: View {
    @EnvironmentObject private var appModel: AppModel
    @StateObject private var preferences = MacDesktopPreferences()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var section: MacSection = .library
    @State private var catalog: [CWorldMedia] = []
    @State private var searchIndex = CatalogSearchIndex()
    @State private var searchResults: [CatalogSearchResult] = []
    @State private var query = ""
    @State private var scope: CatalogSearchScope = .titles
    @State private var searchOpen = false
    @FocusState private var searchFocused: Bool
    @FocusState private var desktopFocused: Bool
    @State private var page = 0
    @State private var expandedID: String?
    @State private var detail: CWorldMedia?
    @State private var initialSeason: Int?
    @State private var initialEpisode: Int?
    @State private var playback: MacPlaybackSelection?
    @State private var sheet: DesktopSheet?
    @State private var type: ArchiveTypeFilter = .all
    @State private var sort: ArchiveSortMode = .newest
    @State private var archive = ArchiveCatalogSnapshot()
    @State private var showResume = false
    @State private var showingUsers = false
    @State private var showingColors = false
    @State private var showingRequest = false
    @State private var sidebarHover: String?
    @State private var editingName = false
    @State private var editingBio = false
    @State private var nameDraft = ""
    @State private var bioDraft = ""
    @State private var windowWidth: CGFloat = 1440
    @Namespace private var pageUnderline
    private enum DesktopSheet: String, Identifiable {
        case profiles, editProfile
        var id: String { rawValue }
    }

    private var searching: Bool { searchOpen && !query.trimmingCharacters(in: .whitespaces).isEmpty }
    private var identity: String { "\(appModel.apiBaseURL)|\(appModel.user?.id ?? 0)|\(appModel.activeProfile?.id ?? 0)" }
    private var items: [CWorldMedia] { section == .archive ? archive.items : catalog }
    private var searchPageSize: Int { scope == .episodes ? 9 : 6 }
    private var totalPages: Int { max(1, Int(ceil(Double(searching ? searchResults.count : items.count) / Double(searching ? searchPageSize : 6)))) }
    private var resumeItems: [ContinueWatchingItem] { ContinueWatchingItem.make(catalog: catalog, records: Array(appModel.watchProgress.values)) }
    private let initialExpandedID: String?
    init(initialSection: MacSection = .library, initialExpandedID: String? = nil, presentsColorPicker: Bool = false, presentsRecent: Bool = false) {
        _section = State(initialValue: initialSection); self.initialExpandedID = initialExpandedID
        _showingColors = State(initialValue: presentsColorPicker); _showResume = State(initialValue: presentsRecent)
    }

    var body: some View {
        ZStack {
            MacBackgroundFill(value: preferences.settings.visualBackground).ignoresSafeArea()
            if showingUsers {
                MacProfilePicker(isSwitching: true, onContinue: { showingUsers = false }).environmentObject(appModel).transition(.opacity)
            } else if let playback {
                NativeVideoPlayerView(mediaID: playback.playbackID, season: playback.season,
                                      episode: playback.episode?.number, title: playback.title,
                                      subtitleURL: playback.subtitleURL, skipIntroEnd: playback.episode?.skipIntroEnd,
                                      skipOutroStart: playback.episode?.skipOutroStart,
                                      onClose: { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.32)) { self.playback = nil } })
                    .id(playback.id)
                    .transition(.opacity.combined(with: .scale(scale: 0.94)))
            } else if let detail {
                MacTitleView(media: detail, initialSeason: initialSeason, initialEpisode: initialEpisode,
                             onBack: { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.32)) { self.detail = nil } }, onPlay: { selection in
                                 withAnimation(reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.92)) { playback = selection }
                             })
                    .id("\(detail.id):\(initialSeason ?? 0):\(initialEpisode ?? 0)")
            } else if section == .archive {
                MacArchiveView(onBack: { section = .library }, onOpen: { open($0) }, onPlay: { playback = $0 })
            } else if section == .reviews {
                MacReviewsView(catalog: catalog, preferences: preferences, onOpen: { open($0) }, onBack: { section = .library })
            } else {
                GeometryReader { geometry in
                    let panelHeight = min(900, max(620, geometry.size.height * 0.92))
                    HStack(spacing: 0) {
                        sidebar
                            .frame(width: 284)
                        VStack(spacing: 0) {
                            header
                            if searching { pageNavigation; searchGrid }
                            else if section == .history { historyContent }
                            else if showResume { continueContent }
                            else {
                                if section == .archive { archiveFilters }
                                pageNavigation
                                cardGrid
                            }
                        }
                        .padding(.leading, 20).padding(.trailing, 50).padding(.top, 50)
                    }
                    .frame(maxWidth: 1400).frame(height: panelHeight)
                    .background(.black.opacity(0.20), in: RoundedRectangle(cornerRadius: 20))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding(.horizontal, 32)
                    .onAppear { windowWidth = geometry.size.width }
                    .onChange(of: geometry.size.width) { _, value in windowWidth = value }
                }
            }
        }
        .foregroundStyle(.white)
        .font(.custom(CWorldFonts.poppins(), size: 14))
        .buttonStyle(MacInteractiveButtonStyle())
        .background(MacWindowConfiguration())
        .focusable().focused($desktopFocused)
        .onAppear { rebuild(); loadPreferences(); expandedID = initialExpandedID; desktopFocused = true }
        .onChange(of: appModel.catalogRevision) { _, _ in rebuild() }
        .onChange(of: appModel.catalog.count) { _, _ in rebuild() }
        .onChange(of: identity) { _, _ in
            playback = nil; detail = nil; sheet = nil; query = ""; page = 0
            showingColors = false; showingRequest = false; editingName = false; editingBio = false
            loadPreferences()
        }
        .onChange(of: type) { _, _ in rebuildArchive() }
        .onChange(of: sort) { _, _ in rebuildArchive() }
        .task(id: "\(query)|\(scope.rawValue)|\(appModel.catalogRevision)") {
            do { try await Task.sleep(for: .milliseconds(160)) } catch { return }
            guard !Task.isCancelled else { return }
            searchResults = searchIndex.search(query, scope: scope)
            page = 0
        }
        .onReceive(NotificationCenter.default.publisher(for: .cworldMacSearch)) { _ in
            guard playback == nil else { return }
            detail = nil; section = .library; searchOpen = true; searchFocused = true
        }
        .onKeyPress("/") {
            guard !searchFocused, !editingName, !editingBio, playback == nil, !showingColors, !showingUsers else { return .ignored }
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.26)) { searchOpen = true; expandedID = nil }
            searchFocused = true; return .handled
        }
        .onKeyPress(.escape) {
            if showingColors { showingColors = false; return .handled }
            if expandedID != nil { withAnimation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.85)) { expandedID = nil }; return .handled }
            if searchOpen { closeSearch(); return .handled }
            return .ignored
        }
        .onReceive(NotificationCenter.default.publisher(for: .cworldMacRefresh)) { _ in
            Task { await appModel.refreshCatalog(); await appModel.refreshSharedWatchData() }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active && playback == nil { Task { await appModel.refreshSharedWatchData() } }
        }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .profiles: MacProfilePicker(isSwitching: true).environmentObject(appModel)
            case .editProfile:
                if let profile = appModel.activeProfile { MacProfileEditor(profile: profile) }
            }
        }
        .blur(radius: showingColors || showingRequest ? 4 : 0)
        .overlay {
            if showingColors { MacColorPicker(preferences: preferences, close: { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { showingColors = false } }) }
            if showingRequest { MacDialog(width: 600, close: { showingRequest = false }) { MacRequestView(onClose: { showingRequest = false }) } }
        }
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { sheet = .editProfile } label: {
                if let profile = appModel.activeProfile {
                    ProfileAvatar(profile: profile, size: 54)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(alignment: .bottomTrailing) { Image(systemName: "pencil.circle.fill").foregroundStyle(.white).opacity(sidebarHover == "photo" ? 1 : 0).offset(x: 7, y: 5) }
                }
            }.help("Change profile picture").onHover { sidebarHover = $0 ? "photo" : nil }.padding(.bottom, 20)
            VStack(alignment: .leading, spacing: 4) {
                if editingName {
                    HStack(spacing: 5) {
                        TextField("Name", text: $nameDraft).textFieldStyle(.roundedBorder).onSubmit { saveName() }
                        Button(action: saveName) { Image(systemName: "checkmark") }.help("Save name")
                    }
                } else {
                    Button { nameDraft = appModel.activeProfile?.name ?? ""; editingName = true } label: {
                        HStack(spacing: 6) { Text(appModel.activeProfile?.name ?? "CWorld").lineLimit(1); Image(systemName: "pencil").font(.caption2).opacity(sidebarHover == "name" ? 1 : 0) }
                    }.onHover { sidebarHover = $0 ? "name" : nil }
                }
                Group {
                    if editingBio {
                        HStack(spacing: 5) {
                            TextField("User Bio", text: $bioDraft).textFieldStyle(.roundedBorder).onSubmit { saveBio() }
                            Button(action: saveBio) { Image(systemName: "checkmark") }.help("Save bio")
                        }
                    } else {
                        Button { bioDraft = preferences.settings.profileBio; editingBio = true } label: {
                            HStack(spacing: 6) { Text(preferences.settings.profileBio.isEmpty ? "Welcome to your world." : preferences.settings.profileBio).lineLimit(2); Image(systemName: "pencil").font(.caption2).opacity(sidebarHover == "bio" ? 1 : 0) }
                        }.foregroundStyle(Color(white: 0.36)).onHover { sidebarHover = $0 ? "bio" : nil }
                    }
                }.font(.custom(CWorldFonts.poppins(), size: 14)).padding(.top, 14)
            }
            .font(.custom(CWorldFonts.poppins(.semibold), size: 16))
            .padding(.bottom, windowWidth <= 1280 ? 40 : windowWidth < 1536 ? 16 : 64)
            Divider().overlay(Color(white: 0.145))
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: windowWidth <= 1280 ? 14 : 24) {
                  if searching && scope == .episodes {
                    ForEach(MacDesktopCatalog.page(searchResults, index: page, size: searchPageSize)) { result in
                        Button { closeSearch(); open(result.media, season: result.season, episode: result.episode) } label: {
                            VStack(alignment: .leading, spacing: 3) { Text(result.media.title).font(.system(size: 13, weight: .semibold)); Text("S\(result.season ?? 1)E\(result.episode ?? 1) — \(result.title)").font(.system(size: 12)).foregroundStyle(.white.opacity(0.6)) }.lineLimit(2)
                        }.buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.01))
                    }
                  } else {
                    ForEach(MacDesktopCatalog.page(searching ? searchResults.map(\.media) : items, index: page).enumerated().map { IndexedMedia(index: $0.offset, media: $0.element) }) { entry in
                        Button { selectCard(entry.media) } label: {
                            Text(entry.media.title).font(.custom(CWorldFonts.poppins(), size: windowWidth <= 1280 ? 19 : 20))
                                .foregroundStyle(expandedID == entry.media.id || sidebarHover == entry.media.id ? .white : Color(white: 0.36))
                                .multilineTextAlignment(.leading).lineLimit(2)
                        }.onHover { sidebarHover = $0 ? entry.media.id : nil }.buttonStyle(.plain)
                    }
                  }
                }.padding(.top, windowWidth <= 1280 ? 18 : windowWidth < 1536 ? 16 : 64)
                    .id("\(page):\(searching):\(scope.rawValue)").transition(.opacity)
            }
            Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { section = .library; showResume.toggle(); expandedID = nil; page = 0; closeSearch() } } label: {
                Label("Recently Watched", systemImage: "forward.end.fill").font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 10).padding(.vertical, 7).background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 9))
                    .overlay { RoundedRectangle(cornerRadius: 9).stroke(.white.opacity(0.10)) }.shadow(radius: 6, y: 4)
            }
        }
        .padding(.leading, 30).padding(.trailing, 50).padding(.vertical, 50)
    }

    private var header: some View {
        HStack(spacing: 14) {
            Menu {
                ForEach(MacSection.allCases) { target in
                    Button(target.rawValue, systemImage: target.icon) {
                        section = target; page = 0; expandedID = nil; showResume = false; closeSearch()
                    }
                }
            } label: { Text(section.rawValue).font(.custom(CWorldFonts.poppins(.semibold), size: 28)) }.help("Library, Archive, and Reviews")
            Group {
                HStack(spacing: -6) {
                    ForEach(0..<3) { _ in MacBackgroundFill(value: preferences.settings.visualBackground).frame(width: 36, height: 36).clipShape(Circle()) }
                }.accessibilityHidden(true)
                Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { showingRequest = true } } label: { Image(systemName: "plus.circle").font(.system(size: 20)) }.help("Request media")
                Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.4)) { showingUsers = true } } label: {
                    Image(systemName: "person.2.fill").font(.system(size: 18)).foregroundStyle(.white.opacity(0.7))
                }.help("Users").accessibilityIdentifier("mac.users")
            }
            Spacer(minLength: 8)
            HStack(spacing: 10) {
                Button {
                    if searchOpen { closeSearch() }
                    else { withAnimation(reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.95)) { searchOpen = true; showResume = false; expandedID = nil }; searchFocused = true }
                } label: { Image(systemName: searchOpen ? "xmark" : "magnifyingglass").frame(width: 22, height: 28) }
                if searchOpen {
                    TextField("What are you looking for?", text: $query)
                        .textFieldStyle(.plain).focused($searchFocused).frame(minWidth: 100)
                    ForEach([CatalogSearchScope.titles, .episodes], id: \.self) { target in
                        Button(target == .titles ? "Media" : "Episodes") { scope = target }
                            .font(.system(size: 12, weight: .semibold)).padding(.horizontal, 10).padding(.vertical, 6)
                            .background(.white.opacity(scope == target ? 0.15 : 0.05), in: RoundedRectangle(cornerRadius: 8))
                            .overlay { RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(scope == target ? 0.25 : 0.10)) }
                    }
                }
            }
            .padding(6).frame(width: searchOpen ? min(440, max(290, windowWidth - 940)) : 40)
            .background(.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).stroke(.white.opacity(0.13)) }
            Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { showingColors = true } } label: {
                Image(systemName: "paintpalette.fill").frame(width: 36, height: 36)
                    .background { MacBackgroundFill(value: preferences.settings.visualBackground).clipShape(RoundedRectangle(cornerRadius: 10)) }
            }.help("Pick a Color").accessibilityIdentifier("mac.colors")
        }.padding(.bottom, windowWidth <= 1280 ? 0 : 20)
    }

    private var pageNavigation: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 26) {
                ForEach(0..<totalPages, id: \.self) { index in
                    Button { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.4)) { page = index; expandedID = nil } } label: {
                        Text("Page \(index + 1)").foregroundStyle(page == index ? .white : Color(white: 0.36))
                            .padding(.vertical, 12)
                            .overlay(alignment: .bottom) { if page == index { Rectangle().fill(.white).frame(height: 1).matchedGeometryEffect(id: "pageUnderline", in: pageUnderline) } }
                    }
                }
            }
        }.fixedSize(horizontal: false, vertical: true).padding(.bottom, 28).padding(.top, 8)
    }

    private var cardGrid: some View {
        GeometryReader { geometry in
            let visible = MacDesktopCatalog.page(items, index: page)
            if items.isEmpty {
                ContentUnavailableView("No titles", systemImage: "film", description: Text("Try another filter or refresh the catalog."))
            } else {
                ZStack(alignment: .topLeading) {
                    Color.clear.contentShape(Rectangle()).onTapGesture { withAnimation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.85)) { expandedID = nil } }
                    ForEach(Array(visible.enumerated()), id: \.element.id) { index, media in
                        let selected = visible.firstIndex { $0.id == expandedID }
                        let rect = MacGalleryGeometry.frame(index: index, selected: selected, size: geometry.size, windowWidth: windowWidth)
                        MacArtworkCard(media: media, expanded: expandedID == media.id, dimmed: expandedID != nil && expandedID != media.id,
                                       onSelect: { selectCard(media) }, onOpen: { open(media) })
                            .frame(width: rect.width, height: rect.height).position(x: rect.midX, y: rect.midY)
                            .zIndex(expandedID == media.id ? 2 : 1)
                    }
                }.animation(reduceMotion ? nil : .interpolatingSpring(mass: 0.82, stiffness: 380, damping: 30), value: expandedID)
                    .overlay { MacSwipeCapture { delta in
                        guard totalPages > 1 else { return }
                        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.4)) {
                            page = min(max(0, page + (delta < 0 ? 1 : -1)), totalPages - 1); expandedID = nil
                        }
                    }.allowsHitTesting(true) }
                    .id(page).transition(.opacity)
                    .simultaneousGesture(DragGesture(minimumDistance: 45).onEnded { value in
                        guard abs(value.translation.width) > abs(value.translation.height) * 1.35,
                              totalPages > 1 else { return }
                        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.4)) {
                            page = min(max(0, page + (value.translation.width < 0 ? 1 : -1)), totalPages - 1)
                            expandedID = nil
                        }
                    })
            }
        }
    }

    private var searchGrid: some View {
        ScrollView {
            if searchResults.isEmpty {
                ContentUnavailableView.search(text: query).padding(.top, 80)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 24), count: 3), spacing: 24) {
                    ForEach(MacDesktopCatalog.page(searchResults, index: page, size: searchPageSize)) { result in
                        Button { open(result.media, season: result.season, episode: result.episode) } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                CatalogImage(url: result.episode == nil ? result.media.artwork.card : MacDesktopCatalog.placeholder(result.media, season: result.season, episode: result.episode), showsBorder: false, maxPixelSize: 800)
                                    .frame(height: scope == .episodes ? 125 : 200).clipped().clipShape(RoundedRectangle(cornerRadius: 16))
                                Text(result.title).font(.headline).lineLimit(2)
                                Text(result.subtitle).font(.caption).foregroundStyle(.white.opacity(0.55)).lineLimit(2)
                            }
                        }.padding(10).macPanel()
                    }
                }
            }
        }
    }

    private var archiveFilters: some View {
        HStack {
            Picker("Media", selection: $type) { ForEach(ArchiveTypeFilter.allCases) { Text($0.rawValue).tag($0) } }
                .pickerStyle(.segmented).frame(width: 260)
            Spacer()
            Picker("Sort", selection: $sort) { ForEach(ArchiveSortMode.allCases) { Text($0.rawValue).tag($0) } }.frame(width: 210)
        }.padding(.vertical, 5)
    }

    private var continueContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                MacCoverCarousel(catalog: catalog).frame(height: windowWidth <= 1280 ? 220 : 280)
                HStack {
                    Text("Recently Watched ›").font(.custom(CWorldFonts.poppins(.semibold), size: 20)); Spacer()
                    Button("Back") { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.25)) { showResume = false; page = 0 } }
                        .padding(.horizontal, 12).padding(.vertical, 5).macPanel()
                }
                if appModel.watchHistory.isEmpty { Text("No recently watched items yet.").foregroundStyle(.white.opacity(0.6)).padding(.vertical, 18) }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(appModel.watchHistory) { record in
                            if let media = appModel.media(for: record.showID) {
                                MacHistoryCard(media: media, season: record.season, episode: record.episode,
                                               onOpen: { open(media, season: record.season, episode: record.episode) },
                                               onRemove: { Task { await appModel.removeWatchHistory(record) } }, overlaysMetadata: true)
                            }
                        }
                    }.padding(.vertical, 4)
                }
                Text("New on CearaWorld").font(.custom(CWorldFonts.poppins(.semibold), size: 20)).padding(.top, 4)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(MacDesktopCatalog.newMedia) { item in
                            if let media = catalog.first(where: { MacDesktopCatalog.normalizedID($0.id) == MacDesktopCatalog.normalizedID(item.id) }) {
                                MacHistoryCard(media: media, season: item.season, episode: item.episode,
                                               onOpen: { open(media, season: item.season, episode: item.episode) }, onRemove: nil, overlaysMetadata: true)
                            }
                        }
                    }.padding(.vertical, 4)
                }
            }.padding(.top, 14).padding(.bottom, 18)
        }
    }

    private var historyContent: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if appModel.watchHistory.isEmpty { ContentUnavailableView("No watch history", systemImage: "clock") }
                ForEach(appModel.watchHistory) { record in
                    if let media = appModel.media(for: record.showID) {
                        HStack(spacing: 16) {
                            CatalogImage(url: media.artwork.card, maxPixelSize: 320).frame(width: 100, height: 66).clipped().clipShape(RoundedRectangle(cornerRadius: 10))
                            Button { open(media, season: record.season, episode: record.episode) } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(media.title).font(.headline)
                                    Text(record.episode.map { "Season \(record.season ?? 1) · Episode \($0)" } ?? "Movie")
                                        .font(.caption).foregroundStyle(.secondary)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                            }
                            Button { Task { await appModel.removeWatchHistory(record) } } label: { Image(systemName: "xmark.circle") }.help("Remove from history")
                        }.padding(12).macPanel()
                    }
                }
            }.padding(.vertical, 14)
        }
    }

    private func selectCard(_ media: CWorldMedia) {
        if searching { open(media); return }
        if expandedID == media.id { open(media) }
        else { withAnimation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.85)) { expandedID = media.id } }
    }
    private func open(_ media: CWorldMedia, season: Int? = nil, episode: Int? = nil) {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.35)) { initialSeason = season; initialEpisode = episode; detail = media }
    }
    private func closeSearch() {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.26)) { searchOpen = false; query = ""; scope = .titles; page = 0; searchFocused = false }
        desktopFocused = true
    }
    private func saveName() { Task { if await appModel.updateProfileName(nameDraft) { editingName = false } } }
    private func saveBio() { preferences.update { $0.profileBio = bioDraft }; editingBio = false }
    private func rebuild() {
        catalog = MacDesktopCatalog.ordered(appModel.catalog)
        searchIndex = CatalogSearchIndex(catalog: catalog)
        searchResults = searchIndex.search(query, scope: scope)
        rebuildArchive()
    }
    private func rebuildArchive() {
        archive = ArchiveCatalogSnapshot(catalog: appModel.catalog, type: type, sort: sort)
        page = 0; expandedID = nil
    }
    private func loadPreferences() {
        preferences.load(server: appModel.apiBaseURL, userID: appModel.user?.id, profileID: appModel.activeProfile?.id)
    }
    private struct IndexedMedia: Identifiable { let index: Int; let media: CWorldMedia; var id: Int { index } }
}

private struct MacSwipeCapture: UIViewRepresentable {
    let onSwipe: (CGFloat) -> Void
    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var onSwipe: (CGFloat) -> Void
        weak var region: UIView?
        init(onSwipe: @escaping (CGFloat) -> Void) { self.onSwipe = onSwipe }
        @objc func pan(_ recognizer: UIPanGestureRecognizer) {
            guard recognizer.state == .ended else { return }
            let translation = recognizer.translation(in: recognizer.view).x
            let velocity = recognizer.velocity(in: recognizer.view).x
            if abs(translation) > 50 || abs(velocity) > 250 { onSwipe(translation != 0 ? translation : velocity) }
        }
        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            guard let pan = gestureRecognizer as? UIPanGestureRecognizer else { return true }
            if let region, let window = region.window {
                let point = pan.location(in: window)
                guard region.convert(region.bounds, to: window).contains(point) else { return false }
            }
            let velocity = pan.velocity(in: pan.view)
            return abs(velocity.x) > abs(velocity.y) * 1.2
        }
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool { true }
    }
    func makeCoordinator() -> Coordinator { Coordinator(onSwipe: onSwipe) }
    func makeUIView(context: Context) -> UIView {
        let view = SwipeCaptureView(frame: .zero)
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = false
        context.coordinator.region = view
        view.installPan(target: context.coordinator)
        return view
    }
    func updateUIView(_ view: UIView, context: Context) { context.coordinator.onSwipe = onSwipe }
}

private final class SwipeCaptureView: UIView {
    private var coordinator: MacSwipeCapture.Coordinator?
    private weak var installedOn: UIView?
    func installPan(target: MacSwipeCapture.Coordinator) {
        coordinator = target
        DispatchQueue.main.async { [weak self] in
            guard let self, let parent = self.window, self.installedOn !== parent else { return }
            let pan = UIPanGestureRecognizer(target: target, action: #selector(MacSwipeCapture.Coordinator.pan(_:)))
            pan.cancelsTouchesInView = false
            pan.delaysTouchesBegan = false
            pan.delegate = target
            if #available(macCatalyst 13.0, *) { pan.allowedScrollTypesMask = [.continuous] }
            parent.addGestureRecognizer(pan)
            self.installedOn = parent
        }
    }
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool { false }
}

struct MacArtworkCard: View {
    let media: CWorldMedia
    let expanded: Bool
    let dimmed: Bool
    let onSelect: () -> Void
    let onOpen: () -> Void
    @State private var hovering = false
    @State private var shineOffset: CGFloat = -1.25
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        GeometryReader { geometry in
            Button(action: onSelect) {
                CatalogImage(url: media.artwork.card ?? media.artwork.poster, showsBorder: false,
                             maxPixelSize: Int(min(1600, max(640, geometry.size.width * 2))))
                    .frame(width: geometry.size.width, height: geometry.size.height).clipped()
            }
            .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1, pressedScale: expanded ? 1 : 0.99))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay {
                GeometryReader { proxy in
                    LinearGradient(colors: [.clear, .white.opacity(0.28), .clear],
                                   startPoint: .top, endPoint: .bottom)
                        .frame(width: max(70, proxy.size.width * 0.22), height: proxy.size.height * 1.5)
                        .rotationEffect(.degrees(18))
                        .offset(x: shineOffset * proxy.size.width)
                        .blendMode(.screen)
                        .opacity(hovering && !dimmed && !reduceMotion ? 1 : 0)
                        .allowsHitTesting(false)
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            .opacity(dimmed ? 0.42 : 1)
            .offset(y: hovering && !reduceMotion && !expanded && !dimmed ? -4 : 0)
            .shadow(color: .black.opacity(expanded ? 0.32 : hovering ? 0.28 : 0), radius: expanded ? 26 : 15, y: expanded ? 24 : 14)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: hovering)
            .onHover { isHovering in
                hovering = isHovering
                guard !reduceMotion else { return }
                if isHovering {
                    shineOffset = -1.25
                    withAnimation(.easeInOut(duration: 0.72)) { shineOffset = 1.25 }
                } else {
                    shineOffset = -1.25
                }
            }
            .allowsHitTesting(!dimmed)
            .contextMenu { Button("Open title", action: onOpen) }
            .accessibilityLabel(media.title)
            .accessibilityHint(expanded ? "Open title page" : "Show title details")
        }
    }
}

struct MacDesktopBackground: View {
    let palette: String
    static let palettes = ["Sky", "Midnight", "Rose", "Forest", "Violet"]
    var colors: [Color] {
        switch palette {
        case "Midnight": [.black, Color(red: 0.10, green: 0.18, blue: 0.25)]
        case "Rose": [Color(red: 0.50, green: 0.22, blue: 0.32), Color(red: 0.95, green: 0.75, blue: 0.66)]
        case "Forest": [Color(red: 0.07, green: 0.24, blue: 0.22), Color(red: 0.6, green: 0.78, blue: 0.58)]
        case "Violet": [Color(red: 0.26, green: 0.15, blue: 0.46), Color(red: 0.66, green: 0.68, blue: 0.96)]
        default: [Color(red: 0.68, green: 0.85, blue: 0.9), .white]
        }
    }
    var body: some View { AngularGradient(colors: colors + colors.reversed(), center: .bottom, startAngle: .degrees(180), endAngle: .degrees(540)).ignoresSafeArea() }
}

extension View {
    func macPanel() -> some View {
        background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 14))
            .overlay { RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.1)) }
    }
}
#endif
