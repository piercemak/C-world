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
            guard player == nil,
                  let url = Bundle.main.url(forResource: "CworldIntro", withExtension: "mp4") else {
                finish()
                return
            }

            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try? AVAudioSession.sharedInstance().setActive(true)

            let introPlayer = AVPlayer(url: url)
            player = introPlayer
            introPlayer.play()
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
    @State private var activeTab: MobileLibraryTab = .shows
    @State private var currentIndex = 0
    @State private var activePage = 0
    @State private var searchText = ""
    @State private var isSearchOpen = false
    @State private var showingProfiles = false
    @State private var showingArchive = false
    @State private var selectedMediaID: String?

    private var filteredItems: [CWorldMedia] {
        appModel.catalog.filter { media in
            media.type == activeTab.mediaType
                && (searchText.isEmpty || media.title.localizedCaseInsensitiveContains(searchText))
        }
    }

    private var pages: [[CWorldMedia]] {
        stride(from: 0, to: filteredItems.count, by: 2).map { start in
            Array(filteredItems[start..<min(start + 2, filteredItems.count)])
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
                    Color.black.ignoresSafeArea()

                    if let currentMedia {
                        FullScreenCatalogBackdrop(url: currentMedia.artwork.preferredBackdrop)
                            .id(currentMedia.id)
                            .transition(.opacity)
                    }

                    Color.black.opacity(0.24)
                        .ignoresSafeArea()

                    VStack(spacing: 0) {
                        mobileLibraryHeader

                        if let currentMedia {
                            ScrollView(.vertical, showsIndicators: false) {
                                VStack(spacing: 12) {
                                    featuredCarousel(for: currentMedia)

                                    VStack(spacing: 4) {
                                        Text(currentMedia.title)
                                            .cworldRoundedFont(24)
                                            .foregroundStyle(.white)
                                            .lineLimit(1)
                                        Text(currentMedia.metadata.creator)
                                            .font(.system(size: 15))
                                            .foregroundStyle(.white.opacity(0.6))
                                    }

                                    Button {
                                        showingArchive = true
                                    } label: {
                                        HStack(spacing: 4) {
                                            Text("View more")
                                            Image(systemName: "chevron.right")
                                        }
                                        .font(.system(size: 15, weight: .medium, design: .rounded))
                                        .foregroundStyle(.white.opacity(0.7))
                                        .frame(maxWidth: .infinity, alignment: .trailing)
                                    }
                                    .buttonStyle(.plain)
                                    .padding(.trailing, 14)

                                    mobileLibraryPages(geometry: geometry)
                                }
                                .padding(.top, 12)
                                .padding(.bottom, 8)
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
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $showingArchive) {
                ArchiveView()
            }
            .navigationDestination(item: $selectedMediaID) { mediaID in
                if let media = appModel.catalog.first(where: { $0.id == mediaID }) {
                    CWorldMediaLaunchDestination(media: media, onBack: {
                        selectedMediaID = nil
                        DispatchQueue.main.async {
                            showingArchive = true
                        }
                    })
                } else {
                    ContentUnavailableView("Title unavailable", systemImage: "film.stack")
                }
            }
            .sheet(isPresented: $showingProfiles) {
                ProfilePickerView()
            }
            .overlay(alignment: .top) {
                if isSearchOpen {
                    HStack {
                        TextField("Search...", text: $searchText)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .foregroundStyle(.white)
                            .tint(.white)
                        Button {
                            isSearchOpen = false
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark")
                                .foregroundStyle(.white.opacity(0.6))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 64)
                    .background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(10)
                }
            }
            .animation(.easeInOut(duration: 0.25), value: isSearchOpen)
            .animation(.easeInOut(duration: 0.45), value: currentMedia?.id)
            .onChange(of: activeTab) { _, _ in resetCarousel() }
            .onChange(of: searchText) { _, _ in resetCarousel() }
            .task(id: homePrefetchKey) {
                await ImageCache.shared.prefetchImages(homePrefetchURLs)
            }
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    guard !Task.isCancelled, filteredItems.count > 1 else { continue }
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

    private var mobileLibraryHeader: some View {
        HStack(spacing: 8) {
            HStack(spacing: 4) {
                tabButton(.movies, systemImage: "film")
                tabButton(.shows, systemImage: "tv")
            }

            Spacer()

            HStack(spacing: 10) {
                Button {
                    showingProfiles = true
                } label: {
                    HStack(spacing: 7) {
                        ProfileHeaderImage(profile: appModel.activeProfile)
                        Circle()
                            .fill(CWorldTheme.success)
                            .frame(width: 8, height: 8)
                    }
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.2), in: Capsule())
                }
                .buttonStyle(.plain)

                Button {
                    withAnimation { isSearchOpen.toggle() }
                } label: {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 25, weight: .regular))
                        .foregroundStyle(.white)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .padding(.top, 4)
        .foregroundStyle(.white)
    }

    private func tabButton(_ tab: MobileLibraryTab, systemImage: String) -> some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                activeTab = tab
            }
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: 21, weight: activeTab == tab ? .semibold : .regular))
                .foregroundStyle(.white.opacity(activeTab == tab ? 1 : 0.6))
                .frame(width: 40, height: 40)
                .background {
                    if activeTab == tab {
                        Capsule().fill(.white.opacity(0.2))
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private func featuredCarousel(for media: CWorldMedia) -> some View {
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
                        .frame(width: 320, height: 320)
                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .shadow(color: .black.opacity(0.7), radius: 18, y: 10)
                    }
                    .buttonStyle(.plain)
                    .contentShape(RoundedRectangle(cornerRadius: 24))
                    .scaleEffect(isCurrent ? 1.0 : 0.54)
                    .opacity(isCurrent ? 1 : 0.62)
                    .offset(x: isCurrent ? 0 : (isNext ? 112 : -112))
                    .zIndex(isCurrent ? 3 : 2)
                    .rotation3DEffect(
                        .degrees(isCurrent ? 0 : (isNext ? -18 : 18)),
                        axis: (x: 0, y: 1, z: 0)
                    )
                    .animation(.spring(response: 0.45, dampingFraction: 0.78), value: currentIndex)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 350)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 20)
                .onEnded { value in
                    if value.translation.width < -60 {
                        advanceCarousel(by: 1)
                    } else if value.translation.width > 60 {
                        advanceCarousel(by: -1)
                    }
                }
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Featured title \(media.title)")
    }

    private func mobileLibraryPages(geometry: GeometryProxy) -> some View {
        VStack(spacing: 8) {
            TabView(selection: $activePage) {
                ForEach(Array(pages.enumerated()), id: \.offset) { pageIndex, page in
                    HStack(spacing: 10) {
                        ForEach(page) { media in
                            Button {
                                selectedMediaID = media.id
                            } label: {
                            CatalogImage(url: media.artwork.poster ?? media.artwork.preferredCard)
                                    .frame(width: geometry.size.width * 0.40)
                                    .aspectRatio(2 / 3, contentMode: .fit)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .overlay {
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(.white.opacity(0.4), lineWidth: 1)
                                    }
                            }
                            .buttonStyle(.plain)
                            .contentShape(RoundedRectangle(cornerRadius: 16))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .tag(pageIndex)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: geometry.size.width * 0.40 * 1.5 + 8)

            HStack(spacing: 6) {
                ForEach(Array(pages.indices), id: \.self) { index in
                    Capsule()
                        .fill(index == activePage ? .white : .white.opacity(0.35))
                        .frame(width: index == activePage ? 24 : 8, height: 10)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.black.opacity(0.3), in: Capsule())
        }
    }

    private func circularDistance(_ index: Int, from current: Int, total: Int) -> Int {
        guard total > 0 else { return 0 }
        return (index - current + total) % total
    }

    private func advanceCarousel(by amount: Int) {
        guard !filteredItems.isEmpty else { return }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
            currentIndex = (currentIndex + amount + filteredItems.count) % filteredItems.count
        }
    }

    private func resetCarousel() {
        currentIndex = 0
        activePage = 0
    }
}

struct ProfileHeaderImage: View {
    let profile: CWorldProfile?

    var body: some View {
        Group {
            if let avatarURL = profile?.avatarURL,
               let url = URL(string: avatarURL),
               avatarURL.hasPrefix("http") {
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
