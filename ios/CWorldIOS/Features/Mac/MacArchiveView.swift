#if targetEnvironment(macCatalyst)
import SwiftUI

struct MacArchiveView: View {
    @EnvironmentObject private var appModel: AppModel
    let onBack: () -> Void
    let onOpen: (CWorldMedia) -> Void
    let onPlay: (MacPlaybackSelection) -> Void
    @State private var query = ""
    @State private var type: ArchiveTypeFilter = .all
    @State private var sort: ArchiveSortMode = .newest
    @State private var snapshot = ArchiveCatalogSnapshot()
    @State private var page = 0
    @State private var backdropPicker = false
    @State private var searchOpen = false
    @State private var profilesOpen = false
    @FocusState private var searchFocused: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var backdrop: URL? {
        appModel.activeProfile?.archiveBackdrop.flatMap(URL.init(string:)) ?? appModel.catalog.first.flatMap { MacDesktopCatalog.cover($0) }
    }
    private var resume: [ContinueWatchingItem] {
        ContinueWatchingItem.make(catalog: appModel.catalog, records: Array(appModel.watchProgress.values))
    }
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                CatalogImage(url: backdrop, showsBorder: false, maxPixelSize: 2048)
                    .frame(width: geometry.size.width, height: geometry.size.height).clipped().blur(radius: 10)
                Color.black.opacity(0.48)
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        HStack {
                            Button(action: onBack) { Image(systemName: "house.fill").frame(width: 40, height: 40).background(.white.opacity(0.15), in: Circle()) }
                                .keyboardShortcut(.escape, modifiers: [])
                            Spacer()
                            Button { profilesOpen = true } label: {
                                HStack(spacing: 8) { if let profile = appModel.activeProfile { ProfileAvatar(profile: profile, size: 30) }; Circle().fill(.green).frame(width: 9, height: 9) }
                                    .padding(.horizontal, 8).frame(height: 40).background(.white.opacity(0.2), in: Capsule())
                            }.help("Users")
                            if searchOpen { TextField("Search archive…", text: $query).textFieldStyle(.plain).focused($searchFocused).frame(width: 230).padding(10).macPanel().transition(.opacity.combined(with: .move(edge: .trailing))) }
                            Button { withAnimation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.9)) { searchOpen.toggle(); if !searchOpen { query = "" } }; searchFocused = searchOpen } label: { Image(systemName: searchOpen ? "xmark" : "magnifyingglass").font(.system(size: 23)).frame(width: 32, height: 40) }.help("Search archive")
                        }
                        if query.isEmpty {
                            HStack { Text("New Media").font(.custom(CWorldFonts.alexandria(.semibold), size: 24)); Spacer(); Button { backdropPicker = true } label: { Label("Recently added", systemImage: "folder.badge.plus").font(.custom(CWorldFonts.poppins(.semibold), size: 14)) }.help("Change archive backdrop") }
                            HStack(spacing: 10) {
                                if let first = snapshot.latest.first { artwork(first, size: 240) }
                                VStack(spacing: 10) { ForEach(Array(snapshot.latest.dropFirst().prefix(2))) { artwork($0, size: 120) } }
                            }.frame(maxWidth: .infinity).padding(.bottom, 12)
                            if !resume.isEmpty {
                                Text("Continue Watching").font(.custom(CWorldFonts.alexandria(.semibold), size: 24))
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(resume) { item in
                                            Button { onPlay(.resume(item)) } label: {
                                                VStack(alignment: .leading, spacing: 8) {
                                                    CatalogImage(url: MacDesktopCatalog.placeholder(item.media, season: item.progress.season, episode: item.progress.episode), maxPixelSize: 640)
                                                        .frame(width: 230, height: 130).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
                                                        .overlay { CWorldTVPlaybackHighlight(mediaID: item.playbackID, season: item.progress.season, episode: item.progress.episode, cornerRadius: 12) }
                                                    Text(item.media.title).font(.headline).lineLimit(1)
                                                    ProgressView(value: min(1, item.progress.currentTime / max(1, item.progress.duration))).tint(.white)
                                                }.frame(width: 230)
                                            }.contextMenu {
                                                Button("Remove from Continue Watching", role: .destructive) { Task { await appModel.removeFromContinueWatching(item.media) } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        HStack {
                            Text("All Media").font(.custom(CWorldFonts.alexandria(.semibold), size: 24))
                            Spacer()
                            Menu {
                                Picker("Type", selection: $type) { ForEach(ArchiveTypeFilter.allCases) { Text($0.rawValue).tag($0) } }
                                Picker("Sort", selection: $sort) { ForEach(ArchiveSortMode.allCases) { Text($0.rawValue).tag($0) } }
                            } label: { Image(systemName: "line.3.horizontal.decrease").font(.title2) }
                        }.padding(.top, 6)
                        LazyVStack(spacing: 8) {
                            ForEach(MacDesktopCatalog.page(snapshot.items, index: page, size: 5)) { media in
                                Button { onOpen(media) } label: {
                                    HStack(spacing: 12) {
                                        CatalogImage(url: media.artwork.card, maxPixelSize: 320).frame(width: 80, height: 80).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
                                        VStack(alignment: .leading, spacing: 5) {
                                            Text(media.title).font(.custom(CWorldFonts.poppins(.bold), size: 18))
                                            Text("\(media.metadata.creator)  ★ \(media.metadata.rating)").font(.system(size: 14)).foregroundStyle(.white.opacity(0.65))
                                        }
                                        Spacer()
                                    }.padding(9).frame(maxWidth: .infinity, alignment: .leading).frame(minHeight: 106)
                                        .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
                                        .overlay { RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.23)) }
                                }
                            }
                            if snapshot.items.isEmpty { ContentUnavailableView.search(text: query) }
                        }.id("\(page):\(type.rawValue):\(sort.rawValue)").transition(.opacity.combined(with: .offset(y: 8)))
                        HStack {
                            Button("Previous", systemImage: "chevron.left") { page = max(0, page - 1) }.disabled(page == 0)
                            Spacer()
                            Text("Page \(page + 1) of \(max(1, (snapshot.items.count + 4) / 5))").font(.caption)
                            Spacer()
                            Button("Next", systemImage: "chevron.right") { page += 1 }.disabled((page + 1) * 5 >= snapshot.items.count)
                        }.padding(.vertical, 12)
                    }.padding(24)
                }
            }
        }
        .foregroundStyle(.white).buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.005, pressedScale: 0.99))
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: page)
        .onAppear { rebuild() }
        .onChange(of: appModel.catalogRevision) { _, _ in rebuild() }
        .onChange(of: query) { _, _ in rebuild() }
        .onChange(of: type) { _, _ in rebuild() }
        .onChange(of: sort) { _, _ in rebuild() }
        .sheet(isPresented: $backdropPicker) { MacBackdropPicker() }
        .fullScreenCover(isPresented: $profilesOpen) { MacProfilePicker(isSwitching: true) }
    }
    private func artwork(_ media: CWorldMedia, size: CGFloat) -> some View {
        Button { onOpen(media) } label: {
            CatalogImage(url: media.artwork.card, maxPixelSize: Int(size * 2))
                .frame(width: size, height: size).clipped().clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(alignment: .topLeading) {
                    Text(media.metadata.rating).font(.system(size: size > 150 ? 20 : 16, weight: .semibold))
                        .padding(10).background(.black.opacity(0.45), in: UnevenRoundedRectangle(topLeadingRadius: 16, bottomTrailingRadius: 16))
                }
        }
    }
    private func rebuild() {
        snapshot = ArchiveCatalogSnapshot(catalog: appModel.catalog, query: query, type: type, sort: sort, pageSize: 5)
        page = 0
    }
}
#endif
