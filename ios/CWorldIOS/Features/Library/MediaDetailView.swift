import AVFoundation
import AVKit
import SwiftUI

struct CWorldMediaLaunchDestination: View {
    let media: CWorldMedia
    let onBack: (() -> Void)?

    init(media: CWorldMedia, onBack: (() -> Void)? = nil) {
        self.media = media
        self.onBack = onBack
    }

    var body: some View {
        if media.type == "movie" {
            NativeVideoPlayerView(
                mediaID: media.movieAsset?.mediaId ?? media.id,
                title: media.title,
                subtitleURL: media.subtitleTracks.first
            )
        } else {
            MediaDetailView(media: media, onBack: onBack)
        }
    }
}

struct MediaDetailView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    let media: CWorldMedia
    private let onBack: (() -> Void)?
    @State private var selectedSeason: Int
    @State private var seasonDropdownOpen = false

    private enum DetailLayout {
        static let horizontalInset: CGFloat = 15
        static let topGap: CGFloat = 60
        static let bottomGap: CGFloat = 30
        static let moviePlaceholderWidth: CGFloat = 350
        static let moviePlaceholderHeight: CGFloat = 286
    }

    init(media: CWorldMedia, onBack: (() -> Void)? = nil) {
        self.media = media
        self.onBack = onBack
        _selectedSeason = State(initialValue: media.seasons?.first?.number ?? 1)
    }

    private var season: CWorldSeason? {
        media.seasons?.first(where: { $0.number == selectedSeason })
    }

    private var isMovie: Bool { media.type == "movie" }

    private var ageRating: String {
        let value = media.metadata.ageRating.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty,
              value.caseInsensitiveCompare("NR") != .orderedSame,
              value.caseInsensitiveCompare("unrated") != .orderedSame else { return "13+" }
        return value.allSatisfy(\.isNumber) ? "\(value)+" : value
    }

    private func progress(for episode: CWorldEpisode) -> Double {
        guard let record = appModel.progress(for: media.id, season: selectedSeason, episode: episode.number),
              record.duration > 0 else { return 0 }
        return min(max(record.currentTime / record.duration, 0), 1)
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                Color.black.ignoresSafeArea()

                FullScreenCatalogBackdrop(
                    url: media.artwork.preferredBackdrop ?? media.artwork.poster
                )

                LinearGradient(
                    colors: [.black.opacity(0.08), .black.opacity(0.86)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .ignoresSafeArea()
                .allowsHitTesting(false)

                let topInset = DetailLayout.topGap
                let bottomInset = DetailLayout.bottomGap
                let panelWidth = max(proxy.size.width - (DetailLayout.horizontalInset * 2), 0)
                let panelHeight = max(proxy.size.height - topInset - bottomInset, 0)

                detailPanel(width: panelWidth, height: panelHeight)
                    .padding(.top, topInset)
                    .padding(.bottom, bottomInset)
            }
        }
        .ignoresSafeArea()
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .navigationBar)
        .task(id: detailPrefetchKey) {
            await ImageCache.shared.prefetchImages(detailPrefetchURLs)
        }
    }

    private var detailPrefetchKey: String {
        "\(media.id):\(selectedSeason)"
    }

    private var detailPrefetchURLs: [URL] {
        var urls = [
            media.artwork.preferredBackdrop,
            media.artwork.poster
        ].compactMap { $0 }

        if isMovie {
            if let placeholderURL { urls.append(placeholderURL) }
        } else if let season {
            urls.append(contentsOf: season.episodes.prefix(3).compactMap { episodePlaceholderURL(for: $0, season: selectedSeason) })
        }

        return urls
    }

    private func detailPanel(width: CGFloat, height: CGFloat) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            if isMovie {
                movieDetailContent
                    .padding(.bottom, 20)
            } else {
                detailPanelContent
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 20)
            }
        }
        .frame(width: width, height: height, alignment: .top)
        .background(panelSurface)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(.white.opacity(0.22), lineWidth: 1)
        }
        .clipped()
    }

    @ViewBuilder
    private var panelSurface: some View {
        if #available(iOS 26.0, *) {
            RoundedRectangle(cornerRadius: 18)
                .fill(.clear)
                .glassEffect(.clear.interactive(), in: .rect(cornerRadius: 18))
        } else {
            // Compatibility fallback for devices below iOS 26.
            RoundedRectangle(cornerRadius: 18)
                .fill(.thinMaterial)
                .overlay {
                    LinearGradient(
                        colors: [.white.opacity(0.16), .white.opacity(0.04), .clear],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                }
        }
    }

    private var detailPanelContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let seasons = media.seasons, !seasons.isEmpty {
                backButton

                mediaHeading

                showContent(seasons: seasons)
            }
        }
    }

    private var mediaHeading: some View {
        VStack(spacing: 0) {
            Text(media.title)
                .cworldRoundedFont(34, weight: .bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)

            if !media.metadata.creator.isEmpty {
                Text(media.metadata.creator)
                    .cworldRoundedFont(18)
                    .foregroundStyle(.white.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                    .padding(.top, 3)
            }

            metadataBadges
                .padding(.top, 12)
        }
        .padding(.top, 4)
    }

    private var backButton: some View {
        Image(systemName: "chevron.left")
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .background(backButtonSurface)
            .overlay {
                Circle()
                    .stroke(.white.opacity(0.3), lineWidth: 1)
            }
            .clipShape(Circle())
            .contentShape(Circle())
            .highPriorityGesture(TapGesture().onEnded {
                navigateBack()
            })
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel("Back")
    }

    private func navigateBack() {
            onBack?()
            dismiss()
    }

    @ViewBuilder
    private var backButtonSurface: some View {
        if #available(iOS 26.0, *) {
            Circle()
                .fill(.clear)
                .glassEffect(.clear.interactive(), in: .circle)
        } else {
            Circle()
                .fill(.black.opacity(0.18))
                .background(.ultraThinMaterial, in: Circle())
        }
    }

    private var metadataBadges: some View {
        HStack(spacing: 16) {
            Text(ageRating)
                .cworldRoundedFont(14)
                .foregroundStyle(.white)
                .frame(width: 42, height: 28)
                .overlay {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(.white.opacity(0.8), lineWidth: 1)
                }

            Text("HD")
                .cworldRoundedFont(16, weight: .bold)
                .foregroundStyle(.black)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(.white, in: RoundedRectangle(cornerRadius: 4))

            if !media.metadata.rating.isEmpty {
                HStack(spacing: 5) {
                    Image(systemName: "star")
                        .foregroundStyle(.yellow)
                    Text(media.metadata.rating)
                        .foregroundStyle(.white)
                }
                    .cworldRoundedFont(16)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var movieDetailContent: some View {
        VStack(spacing: 0) {
            moviePlaceholder

            VStack(spacing: 0) {
                mediaHeading

                if !media.description.isEmpty {
                    Text(media.description)
                        .cworldRoundedFont(16)
                        .foregroundStyle(.white.opacity(0.6))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 16)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
        }
        .frame(maxWidth: .infinity)
    }

    private var moviePlaceholder: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                NavigationLink {
                    NativeVideoPlayerView(
                        mediaID: media.movieAsset?.mediaId ?? media.id,
                        title: media.title,
                        subtitleURL: media.subtitleTracks.first
                    )
                } label: {
                    ZStack(alignment: .bottom) {
                        CatalogImage(url: placeholderURL)
                            .frame(width: proxy.size.width, height: proxy.size.height)
                            .overlay {
                                LinearGradient(
                                    colors: [.clear, .black.opacity(0.34)],
                                    startPoint: .center,
                                    endPoint: .bottom
                                )
                            }

                        if let progress = appModel.progress(for: media.id, season: nil, episode: nil), progress.duration > 0 {
                            ProgressView(value: min(max(progress.currentTime / progress.duration, 0), 1))
                                .tint(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.horizontal, 10)
                                .padding(.bottom, 8)
                        }
                    }
                    .frame(width: proxy.size.width, height: proxy.size.height)
                }
                .buttonStyle(.plain)

                backButton
                    .padding(14)
                    .zIndex(2)
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .frame(maxWidth: .infinity)
        .frame(height: DetailLayout.moviePlaceholderHeight)
        .clipShape(moviePlaceholderShape)
        .contentShape(Rectangle())
    }

    private var moviePlaceholderShape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(
            cornerRadii: .init(
                topLeading: 18,
                bottomLeading: 0,
                bottomTrailing: 0,
                topTrailing: 18
            ),
            style: .continuous
        )
    }

    private func showContent(seasons: [CWorldSeason]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                guard seasons.count > 1 else { return }
                withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
                    seasonDropdownOpen.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "square.stack.3d.up.fill")
                    Text("Season \(selectedSeason)")
                    if seasons.count > 1 {
                        Image(systemName: seasonDropdownOpen ? "chevron.up" : "chevron.down")
                    }
                }
                .cworldRoundedFont(24, weight: .semibold)
                .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
            .padding(.top, 10)

            if seasonDropdownOpen && seasons.count > 1 {
                VStack(spacing: 0) {
                    ForEach(seasons) { item in
                        Button {
                            withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) {
                                selectedSeason = item.number
                                seasonDropdownOpen = false
                            }
                        } label: {
                            Text("Season \(item.number)")
                                .cworldRoundedFont(28, weight: item.number == selectedSeason ? .bold : .regular)
                                .foregroundStyle(item.number == selectedSeason ? .white : .white.opacity(0.6))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .overlay {
                                    if item.number == selectedSeason {
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(.white.opacity(0.4), lineWidth: 1)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .transition(
                            .opacity
                                .combined(with: .move(edge: .leading))
                        )
                    }
                }
                .padding(6)
                .background {
                    LinearGradient(
                        colors: [.black.opacity(0.72), .black.opacity(0.38)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay {
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(.white.opacity(0.12), lineWidth: 1)
                }
                .transition(
                    .opacity
                        .combined(with: .scale(scale: 0.95, anchor: .top))
                        .combined(with: .offset(y: -20))
                )
            }

            if let season {
                ZStack(alignment: .top) {
                    VStack(spacing: 0) {
                        ForEach(season.episodes) { episode in
                            NavigationLink {
                                NativeVideoPlayerView(
                                    mediaID: episode.playbackRef.mediaId,
                                    season: selectedSeason,
                                    episode: episode.number,
                                    title: "S\(String(format: "%02d", selectedSeason))E\(String(format: "%02d", episode.number)) · \(displayTitle(for: episode))",
                                    subtitleURL: episode.subtitles.first,
                                    skipIntroEnd: episode.skipIntroEnd,
                                    skipOutroStart: episode.skipOutroStart
                                )
                            } label: {
                                MobileEpisodeCard(
                                    media: media,
                                    season: selectedSeason,
                                    episode: episode,
                                    title: displayTitle(for: episode),
                                    progress: progress(for: episode)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .id(selectedSeason)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
                .padding(.top, 10)
                .animation(.easeInOut(duration: 0.3), value: selectedSeason)
            }
        }
        .padding(.top, 12)
    }

    private var placeholderURL: URL? {
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")
        return URL(string: "https://cearaworld.com/images/\(cleanID)/placeholders/\(cleanID)_placeholder.png")
    }

    private func episodePlaceholderURL(for episode: CWorldEpisode, season: Int) -> URL? {
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")
        let seasonLabel = "S\(season)"
        return URL(string: "https://d20honz3pkzrs8.cloudfront.net/\(cleanID)/placeholders/season\(season)/\(seasonLabel)E\(episode.number)_\(cleanID)_placeholder.png")
    }

    private func displayTitle(for episode: CWorldEpisode) -> String {
        EpisodeTitleCatalog.displayTitle(
            mediaID: media.id,
            season: selectedSeason,
            episode: episode.number
        ) ?? episode.title
    }
}

private struct MobileEpisodeCard: View {
    let media: CWorldMedia
    let season: Int
    let episode: CWorldEpisode
    let title: String
    let progress: Double

    private enum Layout {
        static let placeholderHeight: CGFloat = 192
        static let titleHeight: CGFloat = 60
        static let titleHorizontalPadding: CGFloat = 8
        static let titleVerticalPadding: CGFloat = 5
        static let titleMinimumScale: CGFloat = 0.45
        static let titleToSeparatorSpacing: CGFloat = 0
        static let separatorToNextEpisodeSpacing: CGFloat = 25
        static let badgeTopInset: CGFloat = 0
        static let badgeLeadingInset: CGFloat = 0
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 0) {
                episodePlaceholder

                Text(title)
                    .cworldRoundedFont(38, weight: .semibold)
                    .foregroundStyle(.white.opacity(0.82))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .minimumScaleFactor(Layout.titleMinimumScale)
                    .allowsTightening(true)
                    .frame(
                        maxWidth: .infinity,
                        minHeight: Layout.titleHeight,
                        maxHeight: Layout.titleHeight,
                        alignment: .center
                    )
                    .padding(.horizontal, Layout.titleHorizontalPadding)
                    .padding(.vertical, Layout.titleVerticalPadding)
                    .padding(.bottom, Layout.titleToSeparatorSpacing)

                Rectangle()
                    .fill(.white.opacity(0.1))
                    .frame(height: 1)
                    .padding(.bottom, Layout.separatorToNextEpisodeSpacing)
            }

            EpisodeNumberBadge(number: episode.number)
                .padding(.top, Layout.badgeTopInset)
                .padding(.leading, Layout.badgeLeadingInset)
        }
        .contentShape(Rectangle())
    }

    private var episodePlaceholder: some View {
        GeometryReader { proxy in
            ZStack(alignment: .bottom) {
                CatalogImage(url: placeholderURL)
                    .frame(width: proxy.size.width, height: proxy.size.height)

                if progress > 0 {
                    ProgressView(value: progress)
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 5)
                }
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
        .frame(maxWidth: .infinity)
        .frame(height: Layout.placeholderHeight)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var placeholderURL: URL? {
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")
        let seasonLabel = "S\(season)"
        return URL(string: "https://d20honz3pkzrs8.cloudfront.net/\(cleanID)/placeholders/season\(season)/\(seasonLabel)E\(episode.number)_\(cleanID)_placeholder.png")
    }
}

private struct EpisodeNumberBadge: View {
    let number: Int

    private enum Layout {
        static let horizontalPadding: CGFloat = 20
        static let verticalPadding: CGFloat = 8
        static let minimumHeight: CGFloat = 58
    }

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
        Text("\(number)")
            .cworldRoundedFont(34)
            .foregroundStyle(.white)
            .padding(.horizontal, Layout.horizontalPadding)
            .padding(.vertical, Layout.verticalPadding)
            .frame(minHeight: Layout.minimumHeight, alignment: .topLeading)
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

struct EpisodeDetailView: View {
    let media: CWorldMedia
    let season: Int
    let episode: CWorldEpisode

    var body: some View {
        List {
            Section {
                Text(EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season, episode: episode.number) ?? episode.title)
                    .cworldRoundedFont(24, weight: .bold)
                    .foregroundStyle(.white)
                if !episode.description.isEmpty {
                    Text(episode.description)
                        .foregroundStyle(CWorldTheme.secondaryText)
                }
            }
            Section("Playback") {
                ReferenceCard(
                    title: "Episode ready",
                    detail: "S\(String(format: "%02d", season))E\(String(format: "%02d", episode.number)) · \(episode.playbackRef.mediaId)"
                )

                NavigationLink {
                    NativeVideoPlayerView(
                        mediaID: episode.playbackRef.mediaId,
                        season: season,
                        episode: episode.number,
                        title: "S\(String(format: "%02d", season))E\(String(format: "%02d", episode.number)) · \(episode.title)",
                        subtitleURL: episode.subtitles.first,
                        skipIntroEnd: episode.skipIntroEnd,
                        skipOutroStart: episode.skipOutroStart
                    )
                } label: {
                    Label("Play Episode", systemImage: "play.fill")
                }
                .buttonStyle(.borderedProminent)
                .tint(CWorldTheme.accent)
            }
        }
        .scrollContentBackground(.hidden)
        .background(CWorldTheme.background)
        .navigationTitle("S\(String(format: "%02d", season))E\(String(format: "%02d", episode.number))")
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

private struct ReferenceCard: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .cworldRoundedFont(17, weight: .semibold)
                .foregroundStyle(.white)
            Text(detail)
                .font(.caption)
                .foregroundStyle(CWorldTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .cworldGlass(cornerRadius: 14, fill: Color.white.opacity(0.06))
    }
}

private struct PlayerSelection: Equatable {
    let mediaID: String
    let season: Int?
    let episode: Int?
    let title: String
    let subtitleURL: URL?
    let skipIntroEnd: Double?
    let skipOutroStart: Double?

    var key: String {
        "\(mediaID)-\(season.map(String.init) ?? "movie")-\(episode.map(String.init) ?? "")"
    }
}

private struct SubtitleCue: Identifiable, Equatable {
    let id: Int
    let start: TimeInterval
    let end: TimeInterval
    let text: String
}

private struct CWorldPlayerSurface: UIViewControllerRepresentable {
    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspect
        controller.view.backgroundColor = .black
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        controller.player = player
    }
}

struct NativeVideoPlayerView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    @State private var selection: PlayerSelection
    @State private var player: AVPlayer?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isPlaying = false
    @State private var controlsVisible = true
    @State private var currentTime = 0.0
    @State private var duration = 0.0
    @State private var isScrubbing = false
    @State private var isMuted = false
    @State private var volume: Float = 1
    @State private var volumeControlVisible = false
    @State private var subtitlesEnabled = true
    @State private var subtitleCues: [SubtitleCue] = []
    @State private var activeSubtitle = ""
    @State private var progressTask: Task<Void, Never>?
    @State private var subtitleTask: Task<Void, Never>?
    @State private var hideControlsTask: Task<Void, Never>?
    @State private var timeObserver: Any?
    @State private var endObserver: NSObjectProtocol?

    init(
        mediaID: String,
        season: Int? = nil,
        episode: Int? = nil,
        title: String,
        subtitleURL: URL? = nil,
        skipIntroEnd: Double? = nil,
        skipOutroStart: Double? = nil
    ) {
        _selection = State(initialValue: PlayerSelection(
            mediaID: mediaID,
            season: season,
            episode: episode,
            title: title,
            subtitleURL: subtitleURL,
            skipIntroEnd: skipIntroEnd,
            skipOutroStart: skipOutroStart
        ))
    }

    private var playbackKey: String { selection.key }

    private var canSkipIntro: Bool {
        guard let end = selection.skipIntroEnd else { return false }
        return currentTime > 0.5 && currentTime < end - 0.5
    }

    private var canSkipOutro: Bool {
        guard let start = selection.skipOutroStart else { return false }
        return currentTime >= max(start - 8, 0) && currentTime < duration - 1
    }

    private var nextSelection: PlayerSelection? { adjacentSelection(offset: 1) }
    private var previousSelection: PlayerSelection? { adjacentSelection(offset: -1) }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                CWorldPlayerSurface(player: player)
                    .ignoresSafeArea()

                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { toggleControls() }

                if !activeSubtitle.isEmpty && subtitlesEnabled {
                    VStack {
                        Spacer()
                        Text(activeSubtitle)
                            .cworldRoundedFont(17, weight: .semibold)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.68), in: RoundedRectangle(cornerRadius: 6))
                            .padding(.horizontal, 24)
                            .padding(.bottom, controlsVisible ? 128 : 34)
                    }
                    .allowsHitTesting(false)
                }

                if controlsVisible {
                    playerControls
                        .transition(.opacity)
                }
            } else if isLoading {
                ProgressView("Preparing playback…")
                    .tint(.white)
                    .foregroundStyle(.white)
            } else {
                playbackError
            }
        }
        .ignoresSafeArea()
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
        .toolbar(.hidden, for: .navigationBar)
        .task(id: playbackKey) {
            await loadPlayback()
        }
        .onDisappear {
            progressTask?.cancel()
            subtitleTask?.cancel()
            hideControlsTask?.cancel()
            removePlayerObservers()
            Task { await saveCurrentProgress() }
            player?.pause()
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .background else { return }
            Task { await saveCurrentProgress() }
        }
    }

    private var playerControls: some View {
        ZStack {
            LinearGradient(
                colors: [.black.opacity(0.82), .clear, .black.opacity(0.9)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 17, weight: .bold))
                            .frame(width: 38, height: 38)
                            .background(.black.opacity(0.42), in: Circle())
                    }
                    .accessibilityLabel("Close player")

                    Text(selection.title)
                        .cworldRoundedFont(17, weight: .semibold)
                        .lineLimit(1)

                    Spacer()
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 18)
                .padding(.top, 18)

                Spacer()

                HStack(spacing: 34) {
                    Button { seek(by: -15) } label: {
                        Image(systemName: "gobackward.15")
                            .font(.system(size: 27, weight: .medium))
                    }
                    .accessibilityLabel("Back 15 seconds")

                    Button { togglePlayback() } label: {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 29, weight: .bold))
                            .frame(width: 72, height: 72)
                            .background(.white.opacity(0.18), in: Circle())
                    }
                    .accessibilityLabel(isPlaying ? "Pause" : "Play")

                    Button { seek(by: 15) } label: {
                        Image(systemName: "goforward.15")
                            .font(.system(size: 27, weight: .medium))
                    }
                    .accessibilityLabel("Forward 15 seconds")
                }
                .foregroundStyle(.white)

                Spacer()

                VStack(spacing: 8) {
                    if canSkipIntro || canSkipOutro || nextSelection != nil {
                        HStack(spacing: 10) {
                            if canSkipIntro {
                                Button("Skip Intro") { skipIntro() }
                                    .playerActionStyle()
                            }
                            if canSkipOutro {
                                Button("Skip Outro") { skipOutro() }
                                    .playerActionStyle()
                            }
                            if canSkipOutro, let nextSelection {
                                Button("Next Episode") { switchTo(nextSelection) }
                                    .playerActionStyle()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Slider(
                        value: Binding(
                            get: { duration > 0 ? min(max(currentTime, 0), duration) : 0 },
                            set: { currentTime = $0 }
                        ),
                        in: 0...max(duration, 1),
                        onEditingChanged: { editing in
                            isScrubbing = editing
                            if !editing { seek(to: currentTime) }
                        }
                    )
                    .tint(.white)

                    HStack {
                        Text(formatTime(currentTime))
                        Spacer()
                        Text(formatTime(duration))
                    }
                    .cworldRoundedFont(12, weight: .medium)

                    HStack(spacing: 20) {
                        Button { togglePlayback() } label: {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        }

                        Button { seek(by: -15) } label: {
                            Image(systemName: "gobackward.15")
                        }

                        Button { seek(by: 15) } label: {
                            Image(systemName: "goforward.15")
                        }

                        if previousSelection != nil {
                            Button { switchTo(previousSelection!) } label: {
                                Image(systemName: "backward.end.fill")
                            }
                            .accessibilityLabel("Previous episode")
                        }

                        if nextSelection != nil {
                            Button { switchTo(nextSelection!) } label: {
                                Image(systemName: "forward.end.fill")
                            }
                            .accessibilityLabel("Next episode")
                        }

                        Spacer()

                        if selection.subtitleURL != nil || !subtitleCues.isEmpty {
                            Button { subtitlesEnabled.toggle() } label: {
                                Image(systemName: subtitlesEnabled ? "captions.bubble.fill" : "captions.bubble")
                            }
                            .accessibilityLabel(subtitlesEnabled ? "Turn subtitles off" : "Turn subtitles on")
                        }

                        if volumeControlVisible {
                            Slider(
                                value: Binding(
                                    get: { Double(volume) },
                                    set: {
                                        volume = Float($0)
                                        isMuted = volume == 0
                                        player?.volume = volume
                                    }
                                ),
                                in: 0...1
                            )
                            .tint(.white)
                            .frame(width: 92)
                        }

                        Button { toggleMute() } label: {
                            Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        }
                        .accessibilityLabel(isMuted ? "Unmute" : "Mute")

                        Button { volumeControlVisible.toggle() } label: {
                            Image(systemName: "slider.horizontal.3")
                        }
                        .accessibilityLabel("Volume slider")
                    }
                    .font(.system(size: 18, weight: .semibold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 18)
                .padding(.bottom, 22)
            }
        }
    }

    private var playbackError: some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text("Playback could not start")
                .cworldRoundedFont(19, weight: .semibold)
                .foregroundStyle(.white)
            if let errorMessage {
                Text(errorMessage)
                    .cworldRoundedFont(13)
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }
            Button("Try Again") { Task { await loadPlayback() } }
                .buttonStyle(.borderedProminent)
                .tint(CWorldTheme.accent)
        }
        .padding()
    }

    @MainActor
    private func loadPlayback() async {
        removePlayerObservers()
        player?.pause()
        player = nil
        errorMessage = nil
        isLoading = true
        currentTime = 0
        duration = 0
        activeSubtitle = ""
        subtitleCues = []
        subtitleTask?.cancel()

        do {
            let session = try await appModel.requestPlaybackSession(
                mediaID: selection.mediaID,
                season: selection.season,
                episode: selection.episode
            )
            guard !Task.isCancelled else { return }

            let newPlayer = AVPlayer(url: session.url)
            newPlayer.volume = volume
            newPlayer.isMuted = isMuted

            let resumeTime = appModel.progress(
                for: selection.mediaID,
                season: selection.season,
                episode: selection.episode
            )?.currentTime ?? 0
            if resumeTime > 5 {
                await newPlayer.seek(to: CMTime(seconds: resumeTime, preferredTimescale: 600))
            }

            player = newPlayer
            isLoading = false
            installPlayerObservers(for: newPlayer)
            startProgressSync()
            loadSubtitles()
            newPlayer.play()
            isPlaying = true
            scheduleControlsHide()
        } catch {
            guard !Task.isCancelled else { return }
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    @MainActor
    private func installPlayerObservers(for newPlayer: AVPlayer) {
        timeObserver = newPlayer.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.25, preferredTimescale: 600),
            queue: .main
        ) { time in
            Task { @MainActor in
                guard player == newPlayer else { return }
                handleTimeUpdate(time.seconds)
            }
        }

        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: newPlayer.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in
                handlePlaybackEnded()
            }
        }
    }

    @MainActor
    private func removePlayerObservers() {
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        if let endObserver {
            NotificationCenter.default.removeObserver(endObserver)
        }
        timeObserver = nil
        endObserver = nil
    }

    @MainActor
    private func handleTimeUpdate(_ seconds: Double) {
        guard seconds.isFinite else { return }
        if !isScrubbing { currentTime = max(seconds, 0) }
        if let itemDuration = player?.currentItem?.duration.seconds,
           itemDuration.isFinite,
           itemDuration > 0 {
            duration = itemDuration
        }
        activeSubtitle = subtitleCues.first(where: { seconds >= $0.start && seconds <= $0.end })?.text ?? ""
    }

    @MainActor
    private func handlePlaybackEnded() {
        isPlaying = false
        if nextSelection != nil {
            controlsVisible = true
        }
    }

    @MainActor
    private func startProgressSync() {
        progressTask?.cancel()
        progressTask = Task { @MainActor in
            await appModel.recordWatchHistory(
                showID: selection.mediaID,
                season: selection.season,
                episode: selection.episode
            )
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 10_000_000_000)
                guard !Task.isCancelled else { return }
                await saveCurrentProgress()
            }
        }
    }

    @MainActor
    private func saveCurrentProgress() async {
        guard let player else { return }
        let current = player.currentTime().seconds
        let total = player.currentItem?.duration.seconds ?? duration
        guard current.isFinite, total.isFinite, total > 0 else { return }

        await appModel.saveWatchProgress(
            showID: selection.mediaID,
            season: selection.season,
            episode: selection.episode,
            currentTime: min(max(current, 0), total),
            duration: total
        )
    }

    @MainActor
    private func togglePlayback() {
        guard let player else { return }
        if isPlaying {
            player.pause()
        } else {
            player.play()
            scheduleControlsHide()
        }
        isPlaying.toggle()
        controlsVisible = true
    }

    @MainActor
    private func seek(by seconds: Double) {
        seek(to: currentTime + seconds)
    }

    @MainActor
    private func seek(to seconds: Double) {
        guard let player else { return }
        let target = min(max(seconds, 0), max(duration - 0.1, 0))
        player.seek(to: CMTime(seconds: target, preferredTimescale: 600))
        currentTime = target
    }

    @MainActor
    private func skipIntro() {
        guard let skipIntroEnd = selection.skipIntroEnd else { return }
        seek(to: skipIntroEnd)
        controlsVisible = true
    }

    @MainActor
    private func skipOutro() {
        seek(to: duration)
        controlsVisible = true
    }

    @MainActor
    private func toggleMute() {
        isMuted.toggle()
        player?.isMuted = isMuted
    }

    @MainActor
    private func toggleControls() {
        withAnimation(.easeInOut(duration: 0.2)) {
            controlsVisible.toggle()
        }
        if controlsVisible { scheduleControlsHide() } else { hideControlsTask?.cancel() }
    }

    @MainActor
    private func scheduleControlsHide() {
        hideControlsTask?.cancel()
        guard isPlaying else { return }
        hideControlsTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled else { return }
            withAnimation(.easeInOut(duration: 0.25)) { controlsVisible = false }
        }
    }

    @MainActor
    private func switchTo(_ next: PlayerSelection) {
        Task { await saveCurrentProgress() }
        selection = next
        controlsVisible = true
        isPlaying = false
    }

    private func adjacentSelection(offset: Int) -> PlayerSelection? {
        guard let season = selection.season,
              let episode = selection.episode,
              let media = appModel.media(for: selection.mediaID),
              let seasons = media.seasons,
              let seasonIndex = seasons.firstIndex(where: { $0.number == season }),
              let episodeIndex = seasons[seasonIndex].episodes.firstIndex(where: { $0.number == episode }) else {
            return nil
        }

        if offset > 0 {
            if episodeIndex + 1 < seasons[seasonIndex].episodes.count {
                return makeSelection(media: media, season: seasons[seasonIndex], episode: seasons[seasonIndex].episodes[episodeIndex + 1])
            }
            guard seasonIndex + 1 < seasons.count, let nextEpisode = seasons[seasonIndex + 1].episodes.first else { return nil }
            return makeSelection(media: media, season: seasons[seasonIndex + 1], episode: nextEpisode)
        }

        if episodeIndex > 0 {
            return makeSelection(media: media, season: seasons[seasonIndex], episode: seasons[seasonIndex].episodes[episodeIndex - 1])
        }
        guard seasonIndex > 0, let previousEpisode = seasons[seasonIndex - 1].episodes.last else { return nil }
        return makeSelection(media: media, season: seasons[seasonIndex - 1], episode: previousEpisode)
    }

    private func makeSelection(media: CWorldMedia, season: CWorldSeason, episode: CWorldEpisode) -> PlayerSelection {
        PlayerSelection(
            mediaID: episode.playbackRef.mediaId,
            season: season.number,
            episode: episode.number,
            title: "S\(String(format: "%02d", season.number))E\(String(format: "%02d", episode.number)) · \(EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season.number, episode: episode.number) ?? episode.title)",
            subtitleURL: episode.subtitles.first,
            skipIntroEnd: episode.skipIntroEnd,
            skipOutroStart: episode.skipOutroStart
        )
    }

    @MainActor
    private func loadSubtitles() {
        guard let subtitleURL = selection.subtitleURL else { return }
        subtitleTask = Task { @MainActor in
            guard let data = try? await URLSession.shared.data(from: subtitleURL).0,
                  let source = String(data: data, encoding: .utf8) else { return }
            subtitleCues = parseSubtitleCues(source)
        }
    }

    private func parseSubtitleCues(_ source: String) -> [SubtitleCue] {
        let lines = source.components(separatedBy: .newlines)
        var cues: [SubtitleCue] = []
        var index = 0

        while index < lines.count {
            let line = lines[index].trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty else {
                index += 1
                continue
            }

            let timingLine: String
            if line.contains("-->") {
                timingLine = line
            } else if index + 1 < lines.count, lines[index + 1].contains("-->") {
                index += 1
                timingLine = lines[index]
            } else {
                index += 1
                continue
            }

            let timingParts = timingLine.components(separatedBy: "-->")
            guard timingParts.count == 2,
                  let start = parseSubtitleTime(timingParts[0]),
                  let end = parseSubtitleTime(timingParts[1].split(separator: " ").first.map(String.init) ?? "") else {
                index += 1
                continue
            }

            index += 1
            var textLines: [String] = []
            while index < lines.count {
                let textLine = lines[index].trimmingCharacters(in: .whitespacesAndNewlines)
                if textLine.isEmpty { break }
                textLines.append(textLine)
                index += 1
            }
            let text = textLines.joined(separator: "\n")
                .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
            if !text.isEmpty { cues.append(SubtitleCue(id: cues.count, start: start, end: end, text: text)) }
        }

        return cues
    }

    private func parseSubtitleTime(_ value: String) -> TimeInterval? {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
        let parts = normalized.split(separator: ":")
        guard parts.count == 3,
              let hours = Double(parts[0]),
              let minutes = Double(parts[1]),
              let seconds = Double(parts[2]) else { return nil }
        return (hours * 3600) + (minutes * 60) + seconds
    }

    private func formatTime(_ value: Double) -> String {
        guard value.isFinite else { return "0:00" }
        let totalSeconds = max(Int(value.rounded(.down)), 0)
        return "\(totalSeconds / 3600 > 0 ? "\(totalSeconds / 3600):" : "")\(String(format: "%02d:%02d", (totalSeconds % 3600) / 60, totalSeconds % 60))"
    }
}

private struct PlayerActionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .cworldRoundedFont(13, weight: .semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 13)
            .padding(.vertical, 8)
            .background(.black.opacity(configuration.isPressed ? 0.72 : 0.5), in: Capsule())
            .overlay { Capsule().stroke(.white.opacity(0.3), lineWidth: 1) }
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
    }
}

private extension View {
    func playerActionStyle() -> some View {
        buttonStyle(PlayerActionButtonStyle())
    }
}
