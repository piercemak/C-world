#if targetEnvironment(macCatalyst)
import SwiftUI
import AVFoundation

struct MacReviewsView: View {
    @EnvironmentObject private var appModel: AppModel
    let catalog: [CWorldMedia]
    @ObservedObject var preferences: MacDesktopPreferences
    let onOpen: (CWorldMedia) -> Void
    let onBack: () -> Void
    @State private var selectedID: String?
    @State private var text = ""
    @State private var rating = 0
    @State private var date = ""
    @State private var tags: [String] = []
    @State private var tagInput = ""
    @State private var filter: ArchiveTypeFilter = .all
    @State private var editing = true
    @State private var films = false
    @State private var choosingFilms = false
    @State private var filmQuery = ""
    @State private var choosingDate = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let genres = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"]
    private var suggestedTags: [String] { Array(genres.filter { $0.lowercased().hasPrefix(tagInput.lowercased()) && !tags.contains($0) }.prefix(5)) }
    private var items: [CWorldMedia] { MacDesktopCatalog.ordered(catalog, reference: preferences.settings.reviewOrder) }
    private var selected: CWorldMedia? { items.first { $0.id == selectedID } ?? items.first }
    private var watchlist: [CWorldMedia] {
        items.filter { preferences.settings.reviews[$0.id]?.watchlisted == true && (filter == .all || $0.type == (filter == .movies ? "movie" : "show")) }
    }
    private var collection: [CWorldMedia] { (preferences.settings.filmGrid ?? []).compactMap { id in catalog.first { $0.id == id } } }
    private var transition: Animation? { reduceMotion ? nil : .easeInOut(duration: 0.4) }
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color(white: 0.08)
                if let selected {
                    CatalogImage(url: MacDesktopCatalog.cover(selected), showsBorder: false, maxPixelSize: 2048)
                        .frame(width: geometry.size.width, height: geometry.size.height).clipped().blur(radius: 16).opacity(0.32)
                }
                MacReviewsAmbientVideo().allowsHitTesting(false).accessibilityHidden(true)
                HStack(spacing: 32) {
                    Group {
                        if films { filmCollection }
                        else if let selected { reviewPanel(selected) }
                        else { ContentUnavailableView("No titles", systemImage: "star") }
                    }.frame(width: (geometry.size.width - 160) * (geometry.size.width < 1536 ? 0.60 : 0.45))
                        .frame(height: min(790, geometry.size.height * 0.88))
                        .background(.black.opacity(0.30), in: RoundedRectangle(cornerRadius: 16))
                        .overlay { RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.30)) }
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .id(films).transition(.opacity.combined(with: .offset(x: films ? 60 : -60)))
                    reviewList.frame(maxWidth: .infinity)
                }.padding(.horizontal, 80)
                VStack(spacing: 24) {
                    Button(action: onBack) { Image(systemName: "house.fill") }.help("Back to Library").keyboardShortcut(.escape, modifiers: [])
                    Button { withAnimation(transition) { films = false } } label: { Image(systemName: "star.fill").foregroundStyle(films ? .white : .mint) }.help("Reviews")
                    Button { withAnimation(transition) { films = true } } label: { Image(systemName: "checkmark.rectangle.portrait.fill").foregroundStyle(films ? .mint : .white) }.help("Watched films")
                }.font(.system(size: 22)).padding(10).background(.ultraThinMaterial, in: Capsule())
                    .overlay { Capsule().stroke(.white.opacity(0.4)) }.frame(maxWidth: .infinity, alignment: .trailing).padding(.trailing, 10)
            }
        }.foregroundStyle(.white).font(.custom(CWorldFonts.poppins(), size: 14))
            .buttonStyle(MacInteractiveButtonStyle()).onAppear { load() }.onChange(of: selected?.id) { _, _ in load() }
            .overlay { if choosingFilms { filmPicker } }
    }
    private func reviewPanel(_ media: CWorldMedia) -> some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                CatalogImage(url: MacDesktopCatalog.cover(media), showsBorder: false, maxPixelSize: 2048)
                    .frame(width: geometry.size.width, height: geometry.size.height * 0.55).clipped()
                    .overlay(alignment: .bottom) {
                        Text(media.title).font(.custom(CWorldFonts.poppins(.bold), size: 54)).lineLimit(2).minimumScaleFactor(0.6)
                            .shadow(color: .black.opacity(0.6), radius: 5, x: 2, y: 2).padding(12)
                            .id(media.id).transition(.opacity.combined(with: .offset(y: 20)))
                    }
                HStack(alignment: .top, spacing: 24) {
                    editor(media)
                    VStack(spacing: 12) {
                        HStack { Text("Watchlist"); Spacer(); Menu("Filter", systemImage: "line.3.horizontal.decrease") {
                            Picker("Type", selection: $filter) { ForEach(ArchiveTypeFilter.allCases) { Text($0.rawValue).tag($0) } }
                        }.labelsHidden().help("Filter watchlist") }
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(watchlist) { item in
                                    HStack(spacing: 8) {
                                        Button { selectedID = item.id } label: {
                                            CatalogImage(url: item.artwork.card, maxPixelSize: 160).frame(width: 40, height: 40).clipped().clipShape(RoundedRectangle(cornerRadius: 6))
                                            Text(item.title).font(.system(size: 12, weight: .medium)).lineLimit(2)
                                        }
                                        Spacer(); Button { toggleWatchlist(item) } label: { Image(systemName: "checkmark.circle.fill").foregroundStyle(.mint) }.help("Remove from watchlist")
                                    }.padding(8).background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                                }
                            }.padding(8)
                        }.frame(maxWidth: .infinity, maxHeight: .infinity).background(.white.opacity(0.20), in: RoundedRectangle(cornerRadius: 12))
                    }.font(.system(size: 14, weight: .semibold)).foregroundStyle(.white.opacity(0.75)).padding(8).background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                }.padding(18).frame(maxHeight: .infinity)
            }
        }.animation(transition, value: media.id)
    }
    private func editor(_ media: CWorldMedia) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 6) {
                Text("Watched on").lineLimit(1)
                if editing {
                    Button(date.isEmpty ? "Not set" : date) { choosingDate = true }.foregroundStyle(.blue.opacity(0.8)).font(.system(size: 12))
                        .popover(isPresented: $choosingDate) {
                            VStack(spacing: 12) {
                                DatePicker("Watched on", selection: Binding(get: { Self.dateFormatter.date(from: date) ?? Date() }, set: { date = Self.dateFormatter.string(from: $0) }), displayedComponents: .date).datePickerStyle(.graphical)
                                HStack { Button("Clear") { date = ""; choosingDate = false }; Spacer(); Button("Done") { if date.isEmpty { date = Self.dateFormatter.string(from: Date()) }; choosingDate = false } }
                            }.padding(16).frame(width: 310)
                        }
                } else { Text(date.isEmpty ? "Not set" : date).foregroundStyle(.blue.opacity(0.8)).font(.system(size: 12)) }
                Spacer(minLength: 0)
                Button { editing = true } label: { Image(systemName: "square.and.pencil") }.help("Edit review")
            }.font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
            VStack(spacing: 8) {
                if editing {
                    TextEditor(text: $text).scrollContentBackground(.hidden).font(.system(size: 14)).frame(maxHeight: .infinity)
                        .overlay(alignment: .topLeading) { if text.isEmpty { Text("Add a review…").foregroundStyle(.white.opacity(0.45)).padding(.top, 8).padding(.leading, 5).allowsHitTesting(false) } }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            TextField("Add tags…", text: $tagInput).textFieldStyle(.plain).padding(6).frame(width: 110).background(.black.opacity(0.25), in: Capsule())
                            ForEach(suggestedTags, id: \.self) { genre in
                                Button(genre) { if tags.count < 3 { withAnimation(transition) { tags.append(genre); tagInput = "" } } }
                                    .padding(5).background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 6)).disabled(tags.count >= 3)
                            }
                        }.font(.system(size: 11))
                    }
                } else {
                    ScrollView { Text(text).font(.system(size: 14, weight: .bold)).italic().multilineTextAlignment(.center).padding(12) }.frame(maxHeight: .infinity)
                }
                HStack(spacing: 6) {
                    ForEach(tags, id: \.self) { tag in
                        Button { if editing { withAnimation(transition) { tags.removeAll { $0 == tag } } } } label: {
                            Text(tag + (editing ? " ×" : "")).font(.system(size: 10, weight: .bold)).padding(5).background(.mint.opacity(0.2), in: RoundedRectangle(cornerRadius: 6))
                        }.transition(.scale.combined(with: .opacity))
                    }
                }
                HStack {
                    stars(rating: rating) { value in rating = value; saveRating(media, value) }
                    Spacer(minLength: 2)
                    if editing { Button("Save") { save(media) }.padding(.horizontal, 16).padding(.vertical, 6).background(.white.opacity(0.20), in: Capsule()) }
                }
            }.padding(8).frame(maxWidth: .infinity, maxHeight: .infinity).background(.white.opacity(0.20), in: RoundedRectangle(cornerRadius: 12))
        }.padding(8).frame(maxWidth: .infinity).background(.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 16))
    }
    private var reviewList: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, media in
                    HStack(spacing: 16) {
                        Text("\(index + 1)").font(.system(size: 14, weight: .bold)).frame(width: 18)
                        Button { withAnimation(transition) { selectedID = media.id; films = false } } label: {
                            CatalogImage(url: media.artwork.card, maxPixelSize: 320).frame(width: 112, height: 112).clipped().clipShape(RoundedRectangle(cornerRadius: 8))
                        }.buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.02, pressedScale: 0.9))
                        VStack(alignment: .leading, spacing: 14) {
                            Button { onOpen(media) } label: { Text(media.title).font(.custom(CWorldFonts.poppins(.semibold), size: 16)).lineLimit(2) }
                            HStack { Text(media.metadata.genres.prefix(2).joined(separator: " / ")).font(.system(size: 11)).foregroundStyle(.white.opacity(0.6)); Spacer(); Button { toggleWatchlist(media) } label: { Image(systemName: preferences.settings.reviews[media.id]?.watchlisted == true ? "checkmark.circle.fill" : "plus.circle") }.help("Toggle watchlist") }
                            stars(rating: preferences.settings.reviews[media.id]?.rating ?? 0) { value in saveRating(media, value); if selected?.id == media.id { rating = value } }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        Image(systemName: "line.3.horizontal").foregroundStyle(.white.opacity(0.5)).font(.system(size: 12))
                    }.frame(height: 174).padding(.horizontal, 4).contentShape(Rectangle())
                        .draggable(media.id).dropDestination(for: String.self) { ids, _ in
                            guard let source = ids.first, source != media.id, items.contains(where: { $0.id == source }) else { return false }
                            var order = items.map(\.id); order.removeAll { $0 == source }
                            guard let index = order.firstIndex(of: media.id) else { return false }; order.insert(source, at: index)
                            withAnimation(transition) { preferences.update { $0.reviewOrder = order } }; return true
                        }
                }
            }.padding(.vertical, 32)
        }
    }
    private var filmCollection: some View {
        VStack(spacing: 20) {
            HStack { Text("Watched films").font(.title2.bold()); Spacer(); if !collection.isEmpty { Button { preferences.update { $0.filmGrid?.removeLast() } } label: { Image(systemName: "minus") }.help("Remove last film") }; Button { choosingFilms = true } label: { Image(systemName: "plus") }.help("Add film") }
            if collection.isEmpty {
                Spacer(); Text("Select films or TV shows and add them to your collection here").multilineTextAlignment(.center).foregroundStyle(.white.opacity(0.6))
                Button { choosingFilms = true } label: { VStack(spacing: 28) { Image(systemName: "plus.circle.fill").font(.system(size: 70)).foregroundStyle(.mint); Text("Add Film").font(.title.bold()) }.frame(width: 260, height: 260).background(.white.opacity(0.20), in: RoundedRectangle(cornerRadius: 16)).overlay { RoundedRectangle(cornerRadius: 16).stroke(.mint.opacity(0.6), lineWidth: 3) } }
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 20), count: 3), spacing: 20) {
                        ForEach(collection) { media in
                            VStack(spacing: 8) {
                                Button { onOpen(media) } label: { CatalogImage(url: media.artwork.card, maxPixelSize: 640).aspectRatio(1, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 12)) }
                                HStack { Text(media.title).font(.system(size: 12, weight: .semibold)).lineLimit(2); Spacer(); Button { withAnimation(transition) { preferences.update { $0.filmGrid?.removeAll { $0 == media.id } } } } label: { Image(systemName: "minus.circle") }.help("Remove \(media.title) from collection") }
                            }.transition(.opacity.combined(with: .scale(scale: 0.9)))
                        }
                    }
                }
            }
        }.padding(24)
    }
    private var filmPicker: some View {
        MacDialog(width: 680, close: { choosingFilms = false }) {
            VStack(spacing: 18) {
                HStack { Text("Select from your library").font(.title2.bold()); Spacer(); Button("Done") { choosingFilms = false } }
                TextField("Search titles…", text: $filmQuery).textFieldStyle(.roundedBorder)
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 16) {
                        ForEach(items.filter { filmQuery.isEmpty || $0.title.localizedCaseInsensitiveContains(filmQuery) }) { media in
                            Button {
                                preferences.update { settings in var ids = settings.filmGrid ?? []; if ids.contains(media.id) { ids.removeAll { $0 == media.id } } else { ids.append(media.id) }; settings.filmGrid = ids }
                            } label: {
                                VStack { CatalogImage(url: media.artwork.card, maxPixelSize: 320).frame(height: 115).clipped().clipShape(RoundedRectangle(cornerRadius: 10)).overlay(alignment: .topTrailing) { if collection.contains(where: { $0.id == media.id }) { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).padding(5) } }; Text(media.title).font(.system(size: 11)).lineLimit(2) }
                            }
                        }
                    }
                }.frame(height: 420)
            }
        }
    }
    private func stars(rating: Int, action: @escaping (Int) -> Void) -> some View {
        HStack(spacing: 7) { ForEach(1...5, id: \.self) { value in Button { action(rating == value ? 0 : value) } label: { Image(systemName: value <= rating ? "star.fill" : "star").font(.system(size: 14)).foregroundStyle(value <= rating ? .mint : .white.opacity(0.8)) }.accessibilityLabel("\(value) stars") } }
    }
    private func toggleWatchlist(_ media: CWorldMedia) { withAnimation(transition) { preferences.update { var review = $0.reviews[media.id] ?? .init(); review.watchlisted.toggle(); $0.reviews[media.id] = review } } }
    private func saveRating(_ media: CWorldMedia, _ value: Int) { preferences.update { var review = $0.reviews[media.id] ?? .init(); review.rating = value; $0.reviews[media.id] = review } }
    private func save(_ media: CWorldMedia) { preferences.update { var review = $0.reviews[media.id] ?? .init(); review.text = text; review.rating = rating; review.watchedDate = date; review.genres = tags; $0.reviews[media.id] = review }; editing = false }
    private func load() { let review = selected.flatMap { preferences.settings.reviews[$0.id] } ?? .init(); text = review.text; rating = review.rating; date = review.watchedDate; tags = review.genres ?? []; editing = text.isEmpty; tagInput = "" }
    private static let dateFormatter: DateFormatter = { let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"; return formatter }()
}

private struct MacReviewsAmbientVideo: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?
    var body: some View {
        GeometryReader { geometry in
            if let player {
                MacAmbientSurface(player: player).frame(width: geometry.size.width, height: geometry.size.height).clipped().blur(radius: 3)
            }
        }.task(id: reduceMotion) {
            stop()
            guard !reduceMotion, let url = await appModel.signedMediaURL(key: "misc/waterfallLoop.mp4"), !Task.isCancelled else { return }
            let item = AVPlayerItem(url: url); item.preferredPeakBitRate = 2_000_000
            let queue = AVQueuePlayer(); queue.isMuted = true; queue.allowsExternalPlayback = false
            looper = AVPlayerLooper(player: queue, templateItem: item); player = queue
            if scenePhase == .active { queue.play() }
        }.onChange(of: scenePhase) { _, value in if value == .active { player?.play() } else { player?.pause() } }
            .onDisappear { stop() }
    }
    private func stop() { player?.pause(); looper?.disableLooping(); player?.removeAllItems(); looper = nil; player = nil }
}
private struct MacAmbientSurface: UIViewRepresentable {
    let player: AVPlayer
    final class Surface: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    }
    func makeUIView(context: Context) -> Surface { let view = Surface(); view.playerLayer.videoGravity = .resizeAspectFill; return view }
    func updateUIView(_ view: Surface, context: Context) { view.playerLayer.player = player }
    static func dismantleUIView(_ view: Surface, coordinator: ()) { view.playerLayer.player = nil }
}
#endif
