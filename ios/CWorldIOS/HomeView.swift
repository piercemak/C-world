import AVKit
import SwiftUI

struct CWorldIntroView: View {
    let onFinished: () -> Void

    @State private var player: AVPlayer?
    @State private var didFinish = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                FullScreenVideoPlayer(player: player)
                    .ignoresSafeArea()
            }
        }
        .onAppear {
            guard player == nil, let url = introURL else {
                NSLog("CWorld intro animation could not be found in the app bundle: %@", introResourceName)
                finish()
                return
            }

            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try? AVAudioSession.sharedInstance().setActive(true)

            let introPlayer = AVPlayer(url: url)
            player = introPlayer
            introPlayer.play()
        }
        .onDisappear {
            player?.pause()
            player = nil
        }
        .onReceive(NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime)) { notification in
            guard let player, notification.object as? AVPlayerItem === player.currentItem else { return }
            finish()
        }
        .onDisappear {
            player?.pause()
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    private func finish() {
        guard !didFinish else { return }
        didFinish = true
        withAnimation(.easeInOut(duration: 1.2)) {
            onFinished()
        }
    }

    private var introResourceName: String {
        #if targetEnvironment(macCatalyst)
        return "CatalystAnimation"
        #else
        return "IOSAnimation"
        #endif
    }

    private var introURL: URL? {
        // XcodeGen may preserve the folder, while an existing Xcode project
        // can flatten resources into the main bundle. Support both layouts so
        // profile switching does not silently skip the ident.
        Bundle.main.url(
            forResource: introResourceName,
            withExtension: "mp4",
            subdirectory: "IntroAnimations"
        ) ?? Bundle.main.url(forResource: introResourceName, withExtension: "mp4")
    }
}

struct FullScreenVideoPlayer: UIViewControllerRepresentable {
    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspectFill
        controller.view.backgroundColor = .black
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        controller.player = player
    }
}

private enum MobileLibraryTab: String {
    case movies = "Movies"
    case shows = "Shows"

    var mediaType: String { self == .movies ? "movie" : "show" }
}

struct CWorldHomeView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @GestureState(resetTransaction: Transaction(animation: .spring(response: 0.32, dampingFraction: 0.85))) private var carouselDrag: CGFloat = 0
    @State private var activeTab: MobileLibraryTab = .shows
    @State private var currentIndex = 0
    @State private var activePage = 0
    @State private var searchText = ""
    @State private var isSearchOpen = false
    @State private var showingProfiles = false
    @State private var showingArchive = false
    @State private var libraryNavigationCompact = false
    @State private var homeSafeArea = EdgeInsets()
    @State private var selectedMediaID: String?

    private var filteredItems: [CWorldMedia] {
        appModel.catalog.filter { media in
            media.type == activeTab.mediaType
                && (searchText.isEmpty || media.title.localizedCaseInsensitiveContains(searchText))
        }
    }

    private var pages: [[CWorldMedia]] {
        let items = filteredItems
        return stride(from: 0, to: items.count, by: 2).map { start in
            Array(items[start..<min(start + 2, items.count)])
        }
    }

    private var currentMedia: CWorldMedia? {
        guard !filteredItems.isEmpty else { return nil }
        return filteredItems[currentIndex % filteredItems.count]
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                ZStack {
                ZStack {
                    Color.black.ignoresSafeArea()

                    if let currentMedia {
                        FullScreenCatalogBackdrop(url: currentMedia.artwork.preferredBackdrop)
                            .id(currentMedia.id)
                            .transition(.opacity)
                    }

                    Color.black.opacity(0.24)
                        .ignoresSafeArea()

                    VStack(spacing: 0) {
                        if let currentMedia {
                            GeometryReader { contentGeometry in
                                let artworkHeight = max(0, contentGeometry.size.height - 100)
                                let featuredSize = min(320, geometry.size.width * 0.82, artworkHeight * 0.57)
                                let posterWidth = min(geometry.size.width * 0.40, artworkHeight * 0.43 * 2 / 3)
                                VStack(spacing: 12) {
                                    featuredCarousel(for: currentMedia, size: featuredSize)

                                    VStack(spacing: 4) {
                                        Text(currentMedia.title)
                                            .cworldRoundedFont(24)
                                            .foregroundStyle(.white)
                                            .lineLimit(1)
                                        Text(currentMedia.metadata.creator)
                                            .font(.system(size: 15))
                                            .foregroundStyle(.white.opacity(0.6))
                                    }

                                    mobileLibraryPages(posterWidth: posterWidth)
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                            }
                        } else if appModel.catalog.isEmpty && appModel.isRefreshingCatalog {
                            ProgressView("Loading titles…")
                                .tint(.white)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else if appModel.catalog.isEmpty, let error = appModel.errorMessage {
                            ContentUnavailableView {
                                Label("Titles couldn't load", systemImage: "wifi.exclamationmark")
                            } description: {
                                Text(error)
                            } actions: {
                                Button("Try Again") { Task { await appModel.retryConnection() } }
                            }
                        } else {
                            ContentUnavailableView(
                                "No results found.",
                                systemImage: "magnifyingglass",
                                description: Text("We can't find any media matching your search.")
                            )
                            .foregroundStyle(.white.opacity(0.72))
                        }
                    }
                    .padding(.bottom, 64 + max(geometry.safeAreaInsets.bottom, homeSafeArea.bottom))
                }
                .animation(.easeInOut(duration: 0.45), value: currentMedia?.id)
                .opacity(showingArchive ? 0 : 1)
                .animation(.easeOut(duration: reduceMotion ? 0.1 : 0.16), value: showingArchive)
                .allowsHitTesting(!showingArchive)
                .accessibilityHidden(showingArchive)

                ArchiveView(
                    contentBottomInset: 64 + max(geometry.safeAreaInsets.bottom, homeSafeArea.bottom),
                    onOpenMedia: { selectedMediaID = $0 },
                    onNavigationCompactChange: { libraryNavigationCompact = $0 }
                )
                    .opacity(showingArchive ? 1 : 0)
                    .animation(.easeOut(duration: reduceMotion ? 0.1 : 0.16), value: showingArchive)
                    .allowsHitTesting(showingArchive)
                    .accessibilityHidden(!showingArchive)
                }
                .overlay(alignment: .bottom) {
                    mobileBottomNavigation
                        .scaleEffect(
                            x: showingArchive && libraryNavigationCompact ? 0.86 : 1,
                            y: showingArchive && libraryNavigationCompact ? 0.94 : 1,
                            anchor: .bottom
                        )
                        .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.88),
                                   value: showingArchive && libraryNavigationCompact)
                        .padding(.horizontal, 16)
                        .padding(.bottom, max(0, max(geometry.safeAreaInsets.bottom, homeSafeArea.bottom) - 10))
                }
                .background(CWorldWindowSafeAreaReader { homeSafeArea = $0 })
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(item: $selectedMediaID) { mediaID in
                if let media = appModel.catalog.first(where: { $0.id == mediaID }) {
                    CWorldMediaLaunchDestination(media: media, onBack: {
                        selectedMediaID = nil
                    })
                } else {
                    ContentUnavailableView("Title unavailable", systemImage: "film.stack")
                }
            }
            .sheet(isPresented: $showingProfiles) {
                ProfilePickerView()
            }
            .sheet(isPresented: $isSearchOpen) {
                CatalogSearchView()
                    .presentationDragIndicator(.visible)
            }
            .onChange(of: activeTab) { _, _ in resetCarousel() }
            .onChange(of: searchText) { _, _ in resetCarousel() }
            .task(id: homePrefetchKey) {
                await ImageCache.shared.prefetchImages(homePrefetchURLs)
            }
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    guard !Task.isCancelled, !showingArchive, !isSearchOpen, !showingProfiles,
                          selectedMediaID == nil, filteredItems.count > 1 else { continue }
                    withAnimation(.easeInOut(duration: 0.45)) {
                        currentIndex = (currentIndex + 1) % filteredItems.count
                    }
                }
            }
        }
    }

    private var homePrefetchKey: String {
        "\(activeTab.rawValue):\(searchText):\(currentIndex)"
    }

    private var homePrefetchURLs: [URL] {
        guard !filteredItems.isEmpty else { return [] }

        let count = filteredItems.count
        let indexes = Set([
            currentIndex % count,
            (currentIndex + 1) % count,
            (currentIndex - 1 + count) % count
        ])

        return indexes.flatMap { index in
            let media = filteredItems[index]
            return [
                media.artwork.preferredBackdrop,
                media.artwork.preferredCard,
                media.artwork.poster
            ].compactMap { $0 }
        }
    }


    private var selectedNavigationIndex: Int {
        if showingProfiles { return 3 }
        if isSearchOpen { return 2 }
        if showingArchive { return 1 }
        return 0
    }

    private var mobileBottomNavigation: some View {
        Picker("Navigation", selection: Binding(
            get: { selectedNavigationIndex },
            set: { index in
                switch index {
                case 0: showingArchive = false
                case 1: showingArchive = true
                case 2: isSearchOpen = true
                case 3: showingProfiles = true
                default: break
                }
            }
        )) {
            Text(" ").tag(0).accessibilityLabel(showingArchive ? "Return home" : "Shows or movies")
            Text(" ").tag(1).accessibilityLabel("Open library")
            Text(" ").tag(2).accessibilityLabel("Search titles and episodes")
            Text(" ").tag(3).accessibilityLabel("Choose profile")
        }
        .pickerStyle(.segmented)
        .controlSize(.large)
        .labelsHidden()
        .modifier(HomeNativeNavigationGlass())
        .overlay {
            HStack(spacing: 0) {
                bottomNavigationIcon(showingArchive ? "house.fill" : activeTab == .shows ? "tv.fill" : "film.fill", index: 0)
                bottomNavigationIcon("square.stack.fill", index: 1)
                bottomNavigationIcon("magnifyingglass", index: 2)
                ProfileHeaderImage(profile: appModel.activeProfile)
                    .modifier(HomeNavigationIconBounce(selected: selectedNavigationIndex == 3, reduceMotion: reduceMotion))
                    .frame(maxWidth: .infinity)
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
        .overlay {
            if !showingArchive {
                HStack(spacing: 0) {
                    Menu {
                        Button { activeTab = .shows } label: {
                            Label("Shows", systemImage: activeTab == .shows ? "checkmark" : "tv")
                        }
                        Button { activeTab = .movies } label: {
                            Label("Movies", systemImage: activeTab == .movies ? "checkmark" : "film")
                        }
                    } label: {
                        Color.clear.frame(maxWidth: .infinity).frame(height: 48).contentShape(Capsule())
                    }
                    .accessibilityLabel("Browse shows or movies")
                    ForEach(0..<3) { _ in
                        Color.clear.frame(maxWidth: .infinity).allowsHitTesting(false)
                    }
                }
            }
        }
        .frame(height: 48)
        .frame(maxWidth: 540)
        .foregroundStyle(.white)
        .tint(.white)
        .environment(\.colorScheme, .dark)
    }

    private func bottomNavigationIcon(_ icon: String, index: Int) -> some View {
        Image(systemName: icon)
            .font(.system(size: 22, weight: .medium))
            .foregroundStyle(.white.opacity(0.9))
            .modifier(HomeNavigationIconBounce(selected: selectedNavigationIndex == index, reduceMotion: reduceMotion))
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .contentShape(Capsule())
    }

    private func featuredCarousel(for media: CWorldMedia, size: CGFloat) -> some View {
        ZStack {
            ForEach(Array(filteredItems.enumerated()), id: \.element.id) { index, item in
                let distance = circularDistance(index, from: currentIndex, total: filteredItems.count)
                let isCurrent = distance == 0
                let isNext = distance == 1
                let isPrevious = distance == filteredItems.count - 1

                if isCurrent || isNext || isPrevious {
                    Button {
                        if isCurrent {
                            selectedMediaID = item.id
                        } else if isNext {
                            advanceCarousel(by: 1)
                        } else {
                            advanceCarousel(by: -1)
                        }
                    } label: {
                        ZStack {
                            CatalogImage(url: item.artwork.preferredCard ?? item.artwork.poster)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                        .frame(width: size, height: size)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .shadow(color: .black.opacity(0.7), radius: 18, y: 10)
                    }
                    .buttonStyle(.plain)
                    .contentShape(RoundedRectangle(cornerRadius: 24))
                    .scaleEffect(isCurrent ? 1.0 : 0.54)
                    .opacity(isCurrent ? 1 : 0.62)
                    .offset(x: (isCurrent ? 0 : (isNext ? size * 0.35 : -size * 0.35)) + (reduceMotion ? 0 : carouselDrag * 0.35))
                    .zIndex(isCurrent ? 3 : 2)
                    .rotation3DEffect(
                        .degrees(isCurrent ? 0 : (isNext ? -18 : 18)),
                        axis: (x: 0, y: 1, z: 0)
                    )
                    .animation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.78), value: currentIndex)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: size + 20)
        .contentShape(Rectangle())
        .simultaneousGesture(
            DragGesture(minimumDistance: 12)
                .updating($carouselDrag) { value, offset, _ in
                    guard filteredItems.count > 1,
                          abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                    offset = min(220, max(-220, value.translation.width))
                }
                .onEnded { value in
                    guard filteredItems.count > 1,
                          abs(value.translation.width) > abs(value.translation.height) * 1.2 else { return }
                    let distance = value.translation.width
                    // Short flicks use momentum; slower drags need only a modest distance.
                    guard abs(distance) >= 32 || abs(value.predictedEndTranslation.width) >= 80 else { return }
                    advanceCarousel(by: distance < 0 ? 1 : -1)
                }
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Featured title \(media.title)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: advanceCarousel(by: 1)
            case .decrement: advanceCarousel(by: -1)
            @unknown default: break
            }
        }
    }

    private func mobileLibraryPages(posterWidth: CGFloat) -> some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 0) {
                ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                    HStack(spacing: 10) {
                        ForEach(Array(page.enumerated()), id: \.element.id) { cardIndex, media in
                            Button {
                                selectedMediaID = media.id
                            } label: {
                            CatalogImage(url: media.artwork.poster ?? media.artwork.preferredCard, showsBorder: false)
                                    .frame(width: posterWidth)
                                    .aspectRatio(2 / 3, contentMode: .fit)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .overlay {
                                        MobileArtworkGlassRim()
                                    }
                            }
                            .buttonStyle(.plain)
                            .contentShape(RoundedRectangle(cornerRadius: 16))
                            .modifier(MobileLogoArrival(
                                isActive: activePage == pageIndex,
                                index: cardIndex,
                                reduceMotion: reduceMotion
                            ))
                        }
                    }
                    .containerRelativeFrame(.horizontal)
                    .scrollTransition(.interactive, axis: .horizontal) { [reduceMotion] content, phase in
                        content
                            .opacity(reduceMotion ? 1 : 1 - 0.25 * abs(phase.value))
                    }
                    .id(pageIndex)
                }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.paging)
            .scrollPosition(id: Binding<Int?>(
                get: { activePage },
                set: { page in
                    if let page, pages.indices.contains(page) { activePage = page }
                }
            ))
            .frame(height: posterWidth * 1.5 + 8)

        }
    }

    private func circularDistance(_ index: Int, from current: Int, total: Int) -> Int {
        guard total > 0 else { return 0 }
        return (index - current + total) % total
    }

    private func advanceCarousel(by amount: Int) {
        guard !filteredItems.isEmpty else { return }
        withAnimation(reduceMotion ? nil : .spring(response: 0.45, dampingFraction: 0.78)) {
            currentIndex = (currentIndex + amount + filteredItems.count) % filteredItems.count
        }
    }

    private func resetCarousel() {
        currentIndex = 0
        activePage = 0
    }
}

/// Mask only the glass overlay, not the artwork underneath it.
struct MobileArtworkGlassRim: View {
    var fallbackOpacity: Double = 0.4
    private let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                shape
                    .fill(.clear)
                    .glassEffect(.clear, in: .rect(cornerRadius: 16))
                    .mask {
                        shape.strokeBorder(lineWidth: 3)
                    }
            } else {
                shape.stroke(.white.opacity(fallbackOpacity), lineWidth: 1)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// Transform-only entrance: no animated blur, shadows, or layout measurements.
private struct MobileLogoArrival: ViewModifier {
    let isActive: Bool
    let index: Int
    let reduceMotion: Bool

    func body(content: Content) -> some View {
        let settled = isActive || reduceMotion
        content
            .scaleEffect(settled ? 1 : 0.86)
            .rotation3DEffect(
                .degrees(settled ? 0 : (index.isMultiple(of: 2) ? 14 : -14)),
                axis: (x: 0, y: 1, z: 0),
                perspective: 0.45
            )
            .offset(y: settled ? 0 : 18)
            .opacity(settled ? 1 : 0.65)
            .animation(
                reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.84)
                    .delay(isActive ? Double(index) * 0.09 : 0),
                value: isActive
            )
    }
}

struct ProfileHeaderImage: View {
    let profile: CWorldProfile?

    var body: some View {
        Group {
            if let avatarURL = profile?.avatarURL,
               let url = URL(string: avatarURL),
               ["http", "https", "data"].contains(url.scheme?.lowercased() ?? "") {
                CachedRemoteImage(url: url) {
                    placeholder
                }
            } else {
                placeholder
            }
        }
        .frame(width: 30, height: 30)
        .clipShape(Circle())
        .overlay { Circle().stroke(.white.opacity(0.25), lineWidth: 1) }
    }

    private var placeholder: some View {
        Circle()
            .fill(.white.opacity(0.2))
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.white.opacity(0.8))
            }
    }
}

struct LoopingVideoBackground: UIViewControllerRepresentable {
    let url: URL

    final class Coordinator {
        var observer: NSObjectProtocol?
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = AVPlayer(url: url)
        controller.player?.actionAtItemEnd = .none
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspectFill
        controller.view.backgroundColor = .black
        context.coordinator.observer = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: controller.player?.currentItem,
            queue: .main
        ) { [weak controller] notification in
            guard let item = notification.object as? AVPlayerItem else { return }
            item.seek(to: .zero) { _ in controller?.player?.play() }
        }
        controller.player?.isMuted = true
        controller.player?.play()
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {}

    static func dismantleUIViewController(_ controller: AVPlayerViewController, coordinator: Coordinator) {
        controller.player?.pause()
        if let observer = coordinator.observer {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}

/// Apply the material at the picker's own bounds, before the icon overlays
/// and outer layout frame. No padded outer pill or additional border.
private struct HomeNativeNavigationGlass: ViewModifier {
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular.tint(.black.opacity(0.45)), in: .capsule)
                .environment(\.colorScheme, .dark)
        } else {
            content.background(.regularMaterial, in: Capsule())
                .environment(\.colorScheme, .dark)
        }
    }
}

private struct HomeNavigationGlass<S: Shape>: ViewModifier {
    let shape: S

    func body(content: Content) -> some View {
        content
            .background {
                surface
                    .transaction { $0.animation = nil }
                    .allowsHitTesting(false)
            }
            .overlay {
                shape.stroke(
                    LinearGradient(stops: [
                        .init(color: .white.opacity(0.35), location: 0),
                        .init(color: .white.opacity(0.12), location: 0.35),
                        .init(color: .white.opacity(0.10), location: 0.65),
                        .init(color: .white.opacity(0.24), location: 1)
                    ], startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 1
                )
                .allowsHitTesting(false)
            }
            .shadow(color: .black.opacity(0.35), radius: 16, x: 0, y: 8)
    }

    @ViewBuilder private var surface: some View {
        if #available(iOS 26.0, *) {
            shape
                .fill(.black.opacity(0.25))
                .glassEffect(.regular.tint(.black.opacity(0.45)), in: shape)
                .environment(\.colorScheme, .dark)
        } else {
            shape
                .fill(.regularMaterial)
                .overlay { shape.fill(.black.opacity(0.35)) }
                .environment(\.colorScheme, .dark)
        }
    }
}


private struct HomeNavigationIconBounce: ViewModifier {
    let selected: Bool
    let reduceMotion: Bool

    func body(content: Content) -> some View {
        content.keyframeAnimator(initialValue: CGFloat(1), trigger: selected) { icon, scale in
            icon
                .scaleEffect(reduceMotion ? 1 : scale)
                .offset(y: reduceMotion ? 0 : -12 * (scale - 1))
        } keyframes: { _ in
            CubicKeyframe(selected ? 1.18 : 1, duration: 0.16)
            SpringKeyframe(1, duration: 0.32, spring: .bouncy)
        }
    }
}

private struct HomeNavigationPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.91 : 1)
            .brightness(configuration.isPressed ? 0.12 : 0)
            .animation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.65),
                       value: configuration.isPressed)
    }
}
