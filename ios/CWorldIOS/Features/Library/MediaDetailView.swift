import AVFoundation
import AVKit
import SwiftUI
import Combine
import MediaPlayer
import CoreMedia

/// Best-effort native WebVTT styling; the AirPlay receiver and accessibility
/// preferences retain final control. Do not override authored cue positioning.
enum AirPlayCaptionAppearance {
    static func rules(defaults: UserDefaults = .standard, useMacPreferences: Bool) -> [AVTextStyleRule] {
        let prefix = "cworld.mac.captions."
        func number(_ key: String, fallback: Double) -> Double {
            let value = defaults.object(forKey: prefix + key) as? Double ?? fallback
            return value.isFinite ? value : fallback
        }
        let font = useMacPreferences ? defaults.string(forKey: prefix + "font") ?? "Helvetica Neue" : "Helvetica Neue"
        let size = useMacPreferences ? min(48, max(18, number("size", fallback: 30))) : 30
        let bold = useMacPreferences ? defaults.object(forKey: prefix + "bold") as? Bool ?? true : true
        let shadow = useMacPreferences ? defaults.object(forKey: prefix + "shadow") as? Bool ?? true : true
        let background = useMacPreferences ? min(0.85, max(0, number("background", fallback: 0))) : 0
        let color = useMacPreferences ? defaults.string(forKey: prefix + "color") : nil
        let foreground: [Double] = color == "Yellow" ? [1, 1, 1, 0] : color == "Warm White" ? [1, 1, 0.95, 0.83] : [1, 1, 1, 1]
        let attributes: [String: Any] = [
            kCMTextMarkupAttribute_FontFamilyName as String: font,
            kCMTextMarkupAttribute_RelativeFontSize as String: size / 30 * 100,
            kCMTextMarkupAttribute_BoldStyle as String: bold,
            kCMTextMarkupAttribute_ForegroundColorARGB as String: foreground,
            kCMTextMarkupAttribute_BackgroundColorARGB as String: [background, 0, 0, 0],
            kCMTextMarkupAttribute_CharacterEdgeStyle as String: shadow ? kCMTextMarkupCharacterEdgeStyle_DropShadow : kCMTextMarkupCharacterEdgeStyle_None
        ]
        return AVTextStyleRule(textMarkupAttributes: attributes).map { [$0] } ?? []
    }
}

/// The root retains the playback surface across navigation and minimization.
@MainActor
final class CWorldPlaybackHost: ObservableObject {
    static let shared = CWorldPlaybackHost()
    @Published var surface: AnyView?
    @Published var minimized = false
    @Published var title = ""
    @Published var mediaID: String?
    @Published var season: Int?
    @Published var episode: Int?
    @Published var queue: [CWorldQueueEntry] = [] {
        didSet { publishLockScreen() }
    }
    @Published var remotePresented = false
    @Published var playerControlsVisible = true
    @Published var connectionLost = false
    @Published var isIntermission = false
    @Published var artworkImage: UIImage?
    @Published var showTitle = ""
    @Published var subtitlesOn = true
    @Published var hasSubtitles = false
    @Published var hasAutomaticNext = false
    var selectQueued: ((PlayerSelection) -> Void)?
    var skipNext: (() -> Void)?
    var skipPrevious: (() -> Void)?
    var toggleCaptions: (() -> Void)?
    var remoteSkipIntro: (() -> Void)?
    var remoteSkipOutro: (() -> Void)?
    var remoteSetVolume: ((Float) -> Void)?
    private var connectionSubscriptions = Set<AnyCancellable>()
    private var wasConnectedToTV = false
    @Published private(set) var isPlaying = false
    @Published private(set) var isAirPlay = false
    private var playerSubscriptions = Set<AnyCancellable>()
    private var artworkTask: Task<Void, Never>?
    private var metadataID = UUID()
    private var nowPlayingMetadata: [String: Any] = [:]
    private var nowPlayingSession: MPNowPlayingSession?
    private var commandTargets: [(MPRemoteCommand, Any)] = []
    private var infoCenter: MPNowPlayingInfoCenter { nowPlayingSession?.nowPlayingInfoCenter ?? .default() }

    func configureLockScreen(title: String, showTitle: String?, artworkURL: URL?, fallbackURL: URL?) {
        self.showTitle = showTitle ?? title
        artworkImage = nil
        CWorldLiveActivityController.shared.setArtwork(nil)
        artworkTask?.cancel()
        let request = UUID()
        metadataID = request
        nowPlayingMetadata = [MPMediaItemPropertyTitle: title,
                              MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.video.rawValue]
        if let showTitle { nowPlayingMetadata[MPMediaItemPropertyArtist] = showTitle }
        infoCenter.nowPlayingInfo = nowPlayingMetadata
        artworkTask = Task { @MainActor [weak self] in
            for url in [artworkURL, fallbackURL].compactMap({ $0 }) {
                guard !Task.isCancelled else { return }
                let resolved = MobileArtwork.bundledURL(for: url, maxPixelSize: 800) ?? url
                guard let image = await ImageCache.shared.image(for: resolved, maxPixelSize: 800) else { continue }
                guard !Task.isCancelled, let self, self.metadataID == request else { return }
                self.nowPlayingMetadata[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                self.artworkImage = image
                CWorldLiveActivityController.shared.setArtwork(image)
                self.publishLockScreen()
                return
            }
        }
    }

    func publishLockScreen() {
        guard let player else { return }
        let seconds = player.currentTime().seconds
        let duration = player.currentItem?.duration.seconds ?? 0
        if seconds.isFinite { nowPlayingMetadata[MPNowPlayingInfoPropertyElapsedPlaybackTime] = seconds }
        if duration.isFinite && duration > 0 { nowPlayingMetadata[MPMediaItemPropertyPlaybackDuration] = duration }
        nowPlayingMetadata[MPNowPlayingInfoPropertyPlaybackRate] = player.rate
        infoCenter.nowPlayingInfo = nowPlayingMetadata
        CWorldLiveActivityController.shared.update(host: self)
    }
    var player: AVPlayer? {
        didSet {
            if oldValue !== player {
                for (command, target) in commandTargets { command.removeTarget(target) }
                commandTargets.removeAll()
                nowPlayingSession?.nowPlayingInfoCenter.nowPlayingInfo = nil
                nowPlayingSession = nil
                if let player {
                    let session = MPNowPlayingSession(players: [player])
                    session.automaticallyPublishesNowPlayingInfo = false
                    nowPlayingSession = session
                    installRemoteCommands(session.remoteCommandCenter)
                    session.nowPlayingInfoCenter.nowPlayingInfo = nowPlayingMetadata
                    session.becomeActiveIfPossible { _ in }
                }
            }
            playerSubscriptions.removeAll()
            isPlaying = false
            isAirPlay = player?.isExternalPlaybackActive ?? false
            guard let player else { return }
            player.publisher(for: \.timeControlStatus).receive(on: DispatchQueue.main)
                .sink { [weak self, weak player] status in
                    guard let self, let player, self.player === player else { return }
                    self.isPlaying = status == .playing
                    if status == .playing { self.isIntermission = false }
                    self.publishLockScreen()
                    if status == .playing, self.nowPlayingSession?.isActive == false {
                        self.nowPlayingSession?.becomeActiveIfPossible { _ in }
                    }
                }.store(in: &playerSubscriptions)
            player.publisher(for: \.isExternalPlaybackActive).receive(on: DispatchQueue.main)
                .sink { [weak self, weak player] active in
                    guard let self, let player, self.player === player else { return }
                    self.isAirPlay = active
                    self.updateTVConnection()
                }.store(in: &playerSubscriptions)
        }
    }
    private init() {
        ExternalDisplaySession.shared.$displayID.receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateTVConnection() }
            .store(in: &connectionSubscriptions)
        NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateTVConnection() }
            .store(in: &connectionSubscriptions)
    }

    private func updateTVConnection() {
        // External-video activity can briefly drop during an item handoff while
        // the AirPlay output route is still connected to the same receiver.
        let stillRoutedToAirPlay = wasConnectedToTV && AVAudioSession.sharedInstance().currentRoute.outputs.contains { $0.portType == .airPlay }
        let connected = isAirPlay || ExternalDisplaySession.shared.isConnected || stillRoutedToAirPlay
        if wasConnectedToTV && !connected && player != nil {
            player?.pause()
            connectionLost = true
        }
        wasConnectedToTV = connected
        if connected { connectionLost = false }
        if connected && isAirPlay {
            // A route handoff can reset the audio session even though the video
            // remains external. Re-activate it on the main queue after AVRoute
            // Picker has finished changing the route.
            DispatchQueue.main.async { [weak self] in
                guard let self, self.isAirPlay, self.player != nil else { return }
                self.configurePlaybackAudioSession()
            }
        }
        publishLockScreen()
    }

    /// Keep the audio route eligible for direct video AirPlay. Some assets expose
    /// video playback immediately but leave their audio on the phone unless the
    /// session is explicitly configured with allowAirPlay after route changes.
    func configurePlaybackAudioSession() {
        let audio = AVAudioSession.sharedInstance()
        do {
            try audio.setCategory(.playback, mode: .moviePlayback, options: [.allowAirPlay])
            try audio.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            // Playback can still proceed on devices that reject a category change.
        }
    }

    func play() {
        guard player != nil else { return }
        configurePlaybackAudioSession()
        connectionLost = false
        isIntermission = false
        player?.play()
        publishLockScreen()
    }

    func togglePlaybackFromRemote() {
        if player?.timeControlStatus == .paused { play() }
        else { player?.pause(); publishLockScreen() }
    }

    func toggleIntermission() {
        guard ExternalDisplaySession.shared.isConnected, !isAirPlay else { return }
        if isIntermission { play() }
        else { isIntermission = true; player?.pause(); publishLockScreen() }
    }

    private func installRemoteCommands(_ commands: MPRemoteCommandCenter) {
        func bind(_ command: MPRemoteCommand, action: @escaping @MainActor (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus) {
            command.isEnabled = true
            let target = command.addTarget { event in
                // Return success only after the active player has received the command.
                if Thread.isMainThread { return MainActor.assumeIsolated { action(event) } }
                return DispatchQueue.main.sync { MainActor.assumeIsolated { action(event) } }
            }
            commandTargets.append((command, target))
        }
        bind(commands.playCommand) { [weak self] _ in
            guard let self, self.player != nil else { return .noSuchContent }
            self.configurePlaybackAudioSession()
            self.play(); return .success
        }
        bind(commands.pauseCommand) { [weak self] _ in
            guard let self, let player = self.player else { return .noSuchContent }
            player.pause(); self.publishLockScreen(); return .success
        }
        bind(commands.togglePlayPauseCommand) { [weak self] _ in
            guard let self, self.player != nil else { return .noSuchContent }
            self.togglePlaybackFromRemote(); return .success
        }
        commands.skipForwardCommand.preferredIntervals = [15]
        commands.skipBackwardCommand.preferredIntervals = [15]
        bind(commands.skipForwardCommand) { [weak self] event in
            guard let self, let event = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
            return self.remoteSeek(to: (self.player?.currentTime().seconds ?? 0) + event.interval)
        }
        bind(commands.skipBackwardCommand) { [weak self] event in
            guard let self, let event = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
            return self.remoteSeek(to: (self.player?.currentTime().seconds ?? 0) - event.interval)
        }
        bind(commands.changePlaybackPositionCommand) { [weak self] event in
            guard let self, let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            return self.remoteSeek(to: event.positionTime)
        }
        commands.nextTrackCommand.isEnabled = false
        commands.previousTrackCommand.isEnabled = false
    }

    @discardableResult func remoteSeek(to seconds: Double) -> MPRemoteCommandHandlerStatus {
        guard let player, let duration = player.currentItem?.duration.seconds,
              duration.isFinite, duration > 0, seconds.isFinite else { return .commandFailed }
        player.seek(to: CMTime(seconds: min(max(0, seconds), max(0, duration - 0.1)), preferredTimescale: 600)) { [weak self] _ in
            Task { @MainActor [weak self] in self?.publishLockScreen() }
        }
        return .success
    }
    func stop(clearQueue: Bool = true) {
        wasConnectedToTV = false
        connectionLost = false
        isIntermission = false
        remotePresented = false
        playerControlsVisible = true
        artworkImage = nil
        title = ""
        showTitle = ""
        hasSubtitles = false
        if clearQueue { queue.removeAll() }
        selectQueued = nil
        skipNext = nil
        hasAutomaticNext = false
        skipPrevious = nil
        toggleCaptions = nil
        remoteSkipIntro = nil
        remoteSkipOutro = nil
        remoteSetVolume = nil
        CWorldLiveActivityController.shared.stop()
        artworkTask?.cancel()
        artworkTask = nil
        metadataID = UUID()
        nowPlayingMetadata = [:]
        player?.pause()
        if let player { ExternalDisplaySession.shared.detach(player) }
        player = nil
        mediaID = nil
        season = nil
        episode = nil
        surface = nil
        minimized = false
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

struct NativeVideoPlayerView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appModel: AppModel
    private let surface: PersistentVideoPlayerView
    private let onClose: (() -> Void)?
    private let remoteSelection: PlayerSelection
    init(mediaID: String, season: Int? = nil, episode: Int? = nil, title: String,
         subtitleURL: URL? = nil, skipIntroStart: Double? = nil, skipIntroEnd: Double? = nil, skipOutroStart: Double? = nil,
         onClose: (() -> Void)? = nil) {
        self.onClose = onClose
        remoteSelection = PlayerSelection(mediaID: mediaID, season: season, episode: episode, title: title,
            subtitleURL: subtitleURL, skipIntroStart: skipIntroStart, skipIntroEnd: skipIntroEnd, skipOutroStart: skipOutroStart)
        surface = PersistentVideoPlayerView(mediaID: mediaID, season: season, episode: episode,
            title: title, subtitleURL: subtitleURL, skipIntroStart: skipIntroStart, skipIntroEnd: skipIntroEnd,
            skipOutroStart: skipOutroStart, onClose: { CWorldPlaybackHost.shared.stop() })
    }
    var body: some View {
        Color.black.ignoresSafeArea().onAppear {
            if DesktopRemote.shared.controllingMac {
                DesktopRemote.shared.sendSelection(remoteSelection, enqueue: false)
                if let onClose { onClose() } else { dismiss() }
                return
            }
            let host = CWorldPlaybackHost.shared
            host.stop(clearQueue: false)
            host.surface = AnyView(surface.environmentObject(appModel).id(UUID()))
            if let onClose { onClose() } else { dismiss() }
        }
    }
}

struct CWorldPlaybackOverlay: View {
    @ObservedObject private var host = CWorldPlaybackHost.shared
    private var showConnectionBanner: Bool {
        #if targetEnvironment(macCatalyst)
        true
        #else
        host.minimized
        #endif
    }
    var body: some View {
        ZStack(alignment: .bottom) {
            if let surface = host.surface {
                surface.opacity(host.minimized ? 0 : 1)
                    .allowsHitTesting(!host.minimized)
                    .accessibilityHidden(host.minimized)
                if host.minimized {
                    HStack {
                        Button { host.minimized = false } label: {
                            Label(host.title.isEmpty ? "Now Playing" : host.title, systemImage: "tv")
                                .lineLimit(1)
                        }
                        Spacer()
                        Button { host.remotePresented = true } label: { Image(systemName: "appletvremote.gen4.fill") }.accessibilityLabel("TV remote and Up Next")
                        Button { if host.player?.rate == 0 { host.player?.play() } else { host.player?.pause() } } label: {
                            Image(systemName: "playpause.fill")
                        }.accessibilityLabel("Play or pause")
                        Button { host.stop() } label: { Image(systemName: "xmark") }.accessibilityLabel("Stop playback")
                    }.padding().background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14)).padding()
                }
            }
        }.foregroundStyle(.white)
            .sheet(isPresented: $host.remotePresented) { CWorldTVRemoteView() }
            .overlay(alignment: .top) {
                if host.connectionLost && showConnectionBanner {
                    Button { host.remotePresented = true } label: {
                        Label("TV disconnected · Reconnect or continue on phone", systemImage: "wifi.exclamationmark")
                            .font(.caption.bold()).padding(12).background(.black.opacity(0.9), in: Capsule())
                    }.padding(.top, 12).foregroundStyle(.orange)
                }
            }
    }


}

struct CWorldTVPlaybackHighlight: View {
    let mediaID: String
    let season: Int?
    let episode: Int?
    var cornerRadius: CGFloat = 16
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @ObservedObject private var display = ExternalDisplaySession.shared
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var glowing = false

    private var active: Bool {
        host.mediaID == mediaID && host.season == season && host.episode == episode &&
        host.isPlaying && (host.isAirPlay || display.isConnected)
    }
    var body: some View {
        ZStack(alignment: .topLeading) {
            if active {
                RoundedRectangle(cornerRadius: cornerRadius).strokeBorder(
                    LinearGradient(colors: [.mint, .cyan.opacity(glowing ? 0.45 : 0.95), .mint], startPoint: .topLeading, endPoint: .bottomTrailing),
                    lineWidth: 2)
                    .opacity(reduceMotion ? 1 : glowing ? 1 : 0.6)
                Label {
                    Text("Playing on TV")
                } icon: {
                    Image(systemName: "tv.fill")
                        .scaleEffect(reduceMotion ? 1 : glowing ? 1.1 : 1)
                        .opacity(reduceMotion ? 1 : glowing ? 1 : 0.72)
                }
                    .font(.system(size: 11, weight: .semibold)).foregroundStyle(.mint)
                    .padding(.horizontal, 9).padding(.vertical, 6)
                    .background(.black.opacity(0.8), in: Capsule()).padding(9)
            }
        }
        .allowsHitTesting(false)
        .task(id: active && !reduceMotion) {
            glowing = false
            guard active, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) { glowing = true }
        }
    }
}

struct CWorldAirPlayPicker: UIViewRepresentable {
    func makeUIView(context: Context) -> AVRoutePickerView {
        let view = AVRoutePickerView()
        view.prioritizesVideoDevices = true
        view.tintColor = .white
        return view
    }
    func updateUIView(_ view: AVRoutePickerView, context: Context) { }
}

struct CWorldMediaLaunchDestination: View {
    let media: CWorldMedia
    let onBack: (() -> Void)?

    init(media: CWorldMedia, onBack: (() -> Void)? = nil) {
        self.media = media
        self.onBack = onBack
    }

    var body: some View {
        MediaDetailView(media: media, onBack: onBack)
    }
}

struct MediaDetailView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    let media: CWorldMedia
    private let onBack: (() -> Void)?
    @State private var selectedSeason: Int
    @State private var seasonDropdownOpen = false
    private let initialEpisode: Int?
    private let initialSeason: Int?

    private enum DetailLayout {
        static let horizontalInset: CGFloat = 15
        static let topGap: CGFloat = 60
        static let bottomGap: CGFloat = 30
        static let moviePlaceholderWidth: CGFloat = 350
        static let moviePlaceholderHeight: CGFloat = 286
    }

    init(media: CWorldMedia, onBack: (() -> Void)? = nil, initialSeason: Int? = nil, initialEpisode: Int? = nil) {
        self.media = media
        self.onBack = onBack
        self.initialEpisode = initialEpisode
        self.initialSeason = initialSeason
        _selectedSeason = State(initialValue: initialSeason ?? media.seasons?.first?.number ?? 1)
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
        .task(id: "availability:\(detailPrefetchKey)") {
            await appModel.monitorEpisodeAvailability(mediaID: media.id, season: media.type == "movie" ? 1 : selectedSeason)
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
        ScrollViewReader { reader in
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
            .onAppear {
                if let initialEpisode { reader.scrollTo("episode-\(initialEpisode)", anchor: .top) }
            }
        }
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

    private var movieMissing: Bool { appModel.episodeIsAvailable(mediaID: media.id, season: nil, episode: nil) == false }

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
                .disabled(movieMissing)
                .opacity(movieMissing ? 0.5 : 1)
                .overlay(alignment: .bottom) {
                    if movieMissing {
                        Text("Not uploaded yet").font(.caption).padding(8)
                            .background(.black.opacity(0.65), in: Capsule()).padding(.bottom, 16)
                            .allowsHitTesting(false)
                    }
                }
                .contextMenu {
                    Button("Add movie to Up Next", systemImage: "text.badge.plus") {
                        CWorldPlaybackHost.shared.enqueue(CWorldQueueEntry(media: media))
                    }.disabled(movieMissing)
                }

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
                            let missing = appModel.episodeIsAvailable(mediaID: media.id, season: selectedSeason, episode: episode.number) == false
                            NavigationLink {
                                NativeVideoPlayerView(
                                    mediaID: episode.playbackRef.mediaId,
                                    season: selectedSeason,
                                    episode: episode.number,
                                    title: "S\(String(format: "%02d", selectedSeason))E\(String(format: "%02d", episode.number)) · \(displayTitle(for: episode))",
                                    subtitleURL: episode.subtitles.first,
                                    skipIntroStart: episode.skipIntroStart, skipIntroEnd: episode.skipIntroEnd,
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
                                .overlay {
                                    if selectedSeason == initialSeason && episode.number == initialEpisode {
                                        RoundedRectangle(cornerRadius: 16).stroke(CWorldTheme.accent, lineWidth: 2)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                            .id("episode-\(episode.number)")
                            .disabled(missing).opacity(missing ? 0.5 : 1)
                            .overlay(alignment: .bottomLeading) {
                                if missing {
                                    Text("Not uploaded yet").font(.caption).padding(8)
                                        .background(.black.opacity(0.85), in: RoundedRectangle(cornerRadius: 8))
                                }
                            }
                            .contextMenu {
                                Button("Add to Up Next", systemImage: "text.badge.plus") {
                                    CWorldPlaybackHost.shared.enqueue(CWorldQueueEntry(media: media, season: selectedSeason, episode: episode))
                                }
                                .disabled(missing)
                            }
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
        let version = cleanID == "thegrey" ? "?v=53e47519f8c3" : ""
        return URL(string: "https://cearaworld.com/images/\(cleanID)/placeholders/\(cleanID)_placeholder.png\(version)")
    }

    private func episodePlaceholderURL(for episode: CWorldEpisode, season: Int) -> URL? {
        let cleanID = media.id.replacingOccurrences(of: "-", with: "")
        let seasonLabel = "S\(season)"
        return URL(string: "https://d20honz3pkzrs8.cloudfront.net/\(cleanID)/placeholders/season\(season)/\(seasonLabel)E\(episode.number)_\(cleanID)_placeholder.png")
    }

    private func displayTitle(for episode: CWorldEpisode) -> String {
        episode.title
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
                Text(episode.title)
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
                        skipIntroStart: episode.skipIntroStart, skipIntroEnd: episode.skipIntroEnd,
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

// Shared by iPhone and Catalyst controls. The HLS package keeps stereo and
// original surround separate; selecting an option never changes the source file.
struct CWorldAudioTrackMenu: View {
    let player: AVPlayer?
    var touchTarget: CGFloat? = nil
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @State private var group: AVMediaSelectionGroup?
    @State private var options: [AVMediaSelectionOption] = []
    @State private var selected: AVMediaSelectionOption?
    @State private var preferred: AVMediaSelectionOption?
    @State private var loadedItem: AVPlayerItem?

    var body: some View {
        Menu {
            if options.isEmpty { Text("No alternate audio tracks") }
            ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                Button {
                    preferred = option
                    select(option)
                } label: {
                    if selected == option { Label(option.displayName, systemImage: "checkmark") }
                    else { Text(option.displayName) }
                }
            }
            if host.isAirPlay { Text("AAC Stereo is the compatibility default for AirPlay.") }
        } label: {
            Image(systemName: "waveform")
                .frame(width: touchTarget, height: touchTarget)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Audio track")
        .help("Choose stereo or surround audio")
        .task(id: player?.currentItem) {
            group = nil; options = []; selected = nil; preferred = nil
            guard let item = player?.currentItem else { return }
            loadedItem = item
            do {
                let audioGroup = try await item.asset.loadMediaSelectionGroup(for: .audible)
                guard !Task.isCancelled, player?.currentItem === item else { return }
                group = audioGroup
                options = audioGroup.map { AVMediaSelectionGroup.playableMediaSelectionOptions(from: $0.options) } ?? []
                if let audioGroup { selected = item.currentMediaSelection.selectedMediaOption(in: audioGroup) }
                if let stereo = options.first(where: { $0.displayName == "AAC Stereo" }) { select(stereo) }
            } catch { options = [] }
        }
        .onChange(of: host.isAirPlay) { _, active in
            if active, let stereo = options.first(where: { $0.displayName == "AAC Stereo" }) { select(stereo) }
            else if !active, let preferred { select(preferred) }
        }
    }

    private func select(_ option: AVMediaSelectionOption) {
        guard let group, let item = player?.currentItem, item === loadedItem else { return }
        item.select(option, in: group)
        selected = option
    }
}

struct PlayerSelection: Equatable {
    let mediaID: String
    let season: Int?
    let episode: Int?
    let title: String
    let subtitleURL: URL?
    let skipIntroStart: Double?
    let skipIntroEnd: Double?
    let skipOutroStart: Double?

    var key: String {
        "\(mediaID)-\(season.map(String.init) ?? "movie")-\(episode.map(String.init) ?? "")"
    }
}

struct CWorldPlayerSurface: UIViewControllerRepresentable {
    let player: AVPlayer
    let onReadyForDisplay: (Bool) -> Void

    final class Coordinator {
        var observation: NSKeyValueObservation?
        var onReadyForDisplay: (Bool) -> Void

        init(onReadyForDisplay: @escaping (Bool) -> Void) {
            self.onReadyForDisplay = onReadyForDisplay
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onReadyForDisplay: onReadyForDisplay)
    }

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.updatesNowPlayingInfoCenter = false
        controller.player = player
        controller.showsPlaybackControls = false
        controller.videoGravity = .resizeAspect
        controller.view.backgroundColor = .black
        context.coordinator.observation = controller.observe(\.isReadyForDisplay, options: [.initial, .new]) { [weak coordinator = context.coordinator] controller, _ in
            let ready = controller.isReadyForDisplay
            Task { @MainActor [weak coordinator] in coordinator?.onReadyForDisplay(ready) }
        }
        return controller
    }

    func updateUIViewController(_ controller: AVPlayerViewController, context: Context) {
        context.coordinator.onReadyForDisplay = onReadyForDisplay
        if controller.player !== player { controller.player = player }
    }

    static func dismantleUIViewController(_ controller: AVPlayerViewController, coordinator: Coordinator) {
        coordinator.observation?.invalidate()
        coordinator.observation = nil
        controller.player = nil
    }
}

/// Read window protection even when an ancestor ignores SwiftUI safe areas.
struct CWorldWindowSafeAreaReader: UIViewRepresentable {
    let onChange: (EdgeInsets) -> Void

    func makeUIView(context: Context) -> ReaderView {
        let view = ReaderView()
        view.isUserInteractionEnabled = false
        view.onChange = onChange
        return view
    }

    func updateUIView(_ uiView: ReaderView, context: Context) {
        uiView.onChange = onChange
        uiView.setNeedsLayout()
    }

    final class ReaderView: UIView {
        var onChange: ((EdgeInsets) -> Void)?
        private var lastInsets: EdgeInsets?

        override func layoutSubviews() {
            super.layoutSubviews()
            reportInsets()
        }

        override func safeAreaInsetsDidChange() {
            super.safeAreaInsetsDidChange()
            setNeedsLayout()
        }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            setNeedsLayout()
        }

        private func reportInsets() {
            guard let window, bounds.width > 0, bounds.height > 0 else { return }
            let safeRect = convert(window.bounds.inset(by: window.safeAreaInsets), from: window)
            let insets = EdgeInsets(
                top: max(0, safeRect.minY - bounds.minY),
                leading: max(0, safeRect.minX - bounds.minX),
                bottom: max(0, bounds.maxY - safeRect.maxY),
                trailing: max(0, bounds.maxX - safeRect.maxX)
            )
            guard insets != lastInsets else { return }
            lastInsets = insets
            DispatchQueue.main.async { [weak self] in self?.onChange?(insets) }
        }
    }
}

enum PlaybackDisplayState: Equatable {
    case preparing, buffering, playing, paused, failed

    static func resolve(itemStatus: AVPlayerItem.Status, transport: AVPlayer.TimeControlStatus,
                        hasFirstFrame: Bool, isSeekingToResume: Bool) -> Self {
        if itemStatus == .failed { return .failed }
        guard itemStatus == .readyToPlay, hasFirstFrame, !isSeekingToResume else { return .preparing }
        switch transport {
        case .playing: return .playing
        case .waitingToPlayAtSpecifiedRate: return .buffering
        case .paused: return .paused
        @unknown default: return .preparing
        }
    }
}

struct PersistentVideoPlayerView: View {
    @Environment(\.accessibilityReduceMotion) private var reducePlayerMotion
    @State private var closingPlayer = false
    @State private var mobileSafeArea = EdgeInsets()
    @State private var showMobileBuffering = false
    private let onClose: (() -> Void)?
    @ObservedObject private var externalDisplay = ExternalDisplaySession.shared
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    @State private var selection: PlayerSelection
    @State private var player: AVPlayer?
    @State private var playbackState: PlaybackDisplayState = .preparing
    @State private var errorMessage: String?
    @State private var hasFirstFrame = false
    @State private var isSeekingToResume = false
    @State private var retryID = UUID()
    @State private var activeAttempt = UUID()
    @State private var isVisible = false
    @State private var controlsVisible = true
    @State private var currentTime = 0.0
    @State private var duration = 0.0
    @State private var hasReachedOutro = false
    @State private var isScrubbing = false
    @State private var isMuted = false
    @State private var volume: Float = 1
    @State private var volumeControlVisible = false
    @State private var subtitlesEnabled = true
    @State private var subtitleSettingsPresented = false
    @State private var subtitleCues: [SubtitleCue] = []
    @State private var activeSubtitle = ""
    @State private var subtitleError: String?
    @State private var progressTask: Task<Void, Never>?
    @State private var subtitleTask: Task<Void, Never>?
    @State private var nativeSubtitleTask: Task<Void, Never>?
    @State private var nativeSubtitlesAvailable = false
    @State private var hideControlsTask: Task<Void, Never>?
    @State private var timeObserver: Any?
    @State private var endObserver: NSObjectProtocol?
    @State private var failureObserver: NSObjectProtocol?
    @State private var itemObservation: NSKeyValueObservation?
    @State private var transportObservation: NSKeyValueObservation?
    @State private var waitingTimeoutTask: Task<Void, Never>?
    @State private var tvHelpVisible = false
    @State private var outroCountdown: Int?
    @AppStorage("cworld.playback.autoSkipOutro") private var autoSkipOutro = true
    @State private var outroCancelled = false
    @State private var preparedNext: (key: String, url: URL, date: Date)?
    @State private var prefetchTask: Task<Void, Never>?
    @ObservedObject private var playbackHost = CWorldPlaybackHost.shared

    init(
        mediaID: String,
        season: Int? = nil,
        episode: Int? = nil,
        title: String,
        subtitleURL: URL? = nil,
        skipIntroStart: Double? = nil, skipIntroEnd: Double? = nil,
        skipOutroStart: Double? = nil,
        onClose: (() -> Void)? = nil
    ) {
        self.onClose = onClose
        _selection = State(initialValue: PlayerSelection(
            mediaID: mediaID,
            season: season,
            episode: episode,
            title: title,
            subtitleURL: subtitleURL,
            skipIntroStart: skipIntroStart, skipIntroEnd: skipIntroEnd,
            skipOutroStart: skipOutroStart
        ))
    }

    private var playbackKey: String { selection.key }
    private var isLoading: Bool { playbackState == .preparing }
    private var isPlaying: Bool { playbackState == .playing }

    private var skipMarkers: EpisodeSkipMarkers {
        EpisodeSkipCatalog.markers(mediaID: selection.mediaID, season: selection.season,
                                   episode: selection.episode, introStart: selection.skipIntroStart, introEnd: selection.skipIntroEnd,
                                   outroStart: selection.skipOutroStart)
    }
    private var canSkipIntro: Bool { skipMarkers.introTarget(at: currentTime, duration: duration) != nil }
    private var canSkipOutro: Bool { skipMarkers.canSkipOutro(at: currentTime, duration: duration) }

    private var nextSelection: PlayerSelection? { playbackHost.queue.first?.selection ?? adjacentSelection(offset: 1) }
    private var previousSelection: PlayerSelection? { adjacentSelection(offset: -1) }

    private var tvPresentation: ExternalDisplaySession.Presentation {
        .init(title: selection.title,
              subtitle: subtitlesEnabled ? activeSubtitle : "",
              state: playbackState,
              message: subtitleError == nil ? nil : "Subtitles unavailable · Retry on your iPhone",
              nextTitle: autoSkipOutro && canSkipOutro && !outroCancelled ? nextSelection.map { "\($0.title) · starting in \(outroCountdown ?? 5)s" } : nil)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                if externalDisplay.isConnected {
                    VStack(spacing: 10) {
                        Image(systemName: "tv.fill").font(.system(size: 32))
                        Text("Playing on your TV").font(.headline)
                        Text("You can minimize the player and browse CWorld. Screen mirroring may require your phone to stay unlocked.")
                            .font(.caption).foregroundStyle(.white.opacity(0.65))
                    }
                    .foregroundStyle(.white)
                    .offset(y: -80)
                } else if scenePhase != .background && !playbackHost.minimized {
                CWorldPlayerSurface(player: player) { ready in
                    guard isVisible, !externalDisplay.isConnected, self.player === player, playbackState != .failed else { return }
                    hasFirstFrame = ready
                    updatePlaybackState(for: player)
                }
                    .id(ObjectIdentifier(player))
                    .ignoresSafeArea()
                }

                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        #if targetEnvironment(macCatalyst)
                        togglePlayback()
                        #else
                        toggleControls()
                        #endif
                    }

                #if targetEnvironment(macCatalyst)
                if !externalDisplay.isConnected && !playbackHost.isAirPlay && !activeSubtitle.isEmpty && subtitlesEnabled {
                    VStack {
                        Spacer()
                        MacSubtitleText(text: activeSubtitle)
                            .padding(.horizontal, 24)
                            .padding(.bottom, controlsVisible ? 128 : (canSkipIntro || canSkipOutro ? 96 : 34))
                    }
                    .allowsHitTesting(false)
                }

                if controlsVisible && playbackState != .failed && !isLoading {
                    playerControls
                        .transition(.opacity)
                }
                #endif
            }

            if playbackState == .failed {
                Color.black.ignoresSafeArea()
                playbackError
            } else if isLoading {
                ProgressView("Preparing playback…")
                    .tint(.white)
                    .foregroundStyle(.white)
                    .allowsHitTesting(false)
            } else if playbackState == .buffering {
                #if targetEnvironment(macCatalyst)
                ProgressView("Buffering…")
                    .tint(.white)
                    .foregroundStyle(.white)
                    .padding(16)
                    .background(.black.opacity(0.8), in: RoundedRectangle(cornerRadius: 12))
                    .allowsHitTesting(false)
                #endif
            }
        }
        .overlay {
            #if !targetEnvironment(macCatalyst)
            mobilePlayerChrome
            #endif
        }
        .overlay(alignment: .bottomTrailing) {
            #if targetEnvironment(macCatalyst)
            if player != nil && !isLoading && playbackState != .failed && (canSkipIntro || canSkipOutro) {
                HStack(spacing: 8) {
                    if canSkipIntro {
                        Button("Skip Intro", action: skipIntro).buttonStyle(MacSkipButtonStyle())
                    }
                    if canSkipOutro && !outroCancelled {
                        if autoSkipOutro, let next = nextSelection {
                            MacOutroCard(artwork: appModel.media(for: next.mediaID).flatMap {
                                MacDesktopCatalog.placeholder($0, season: next.season, episode: next.episode)
                            }, player: player, countdownStart: skipMarkers.outroStart,
                               duration: duration, play: skipOutro, cancel: {
                                outroCancelled = true; outroCountdown = nil
                            })
                        } else {
                            Button(nextSelection == nil ? "Skip Outro" : "Next episode", action: skipOutro).buttonStyle(MacSkipButtonStyle())
                        }
                    }
                }
                .padding(.trailing, 16).padding(.bottom, 168)
                .transition(.opacity.combined(with: .offset(y: reducePlayerMotion ? 0 : 18)))
                .animation(reducePlayerMotion ? nil : .easeOut(duration: 0.25), value: canSkipIntro)
                .animation(reducePlayerMotion ? nil : .easeOut(duration: 0.25), value: canSkipOutro && !outroCancelled)
            }
            #endif
        }
        .overlay(alignment: .topTrailing) {
            #if targetEnvironment(macCatalyst)
            if let subtitleError, controlsVisible && !isLoading && playbackState != .failed {
                HStack(spacing: 8) {
                    Text(subtitleError).font(.caption).lineLimit(2)
                    Button("Retry") { loadSubtitles() }
                        .frame(minHeight: 44)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .background(.black.opacity(0.85), in: RoundedRectangle(cornerRadius: 12))
                .frame(maxWidth: 300)
                .padding(.horizontal, 18)
                .padding(.top, 66)
            }
            #endif
        }
        .overlay(alignment: .topLeading) {
            #if targetEnvironment(macCatalyst)
            if controlsVisible || isLoading || playbackState == .failed {
                Button(action: closePlayer) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .cworldLiquidGlass(in: Circle(), fallback: .white.opacity(0.07), interactive: true)
                }
                .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.06, pressedScale: 0.94))
                .help("Back to media details · Escape")
                .accessibilityLabel("Back to media details")
                .padding(.leading, 36).padding(.top, 30)
            }
            #endif
        }
        .statusBarHidden(true)
        #if targetEnvironment(macCatalyst)
        .modifier(MacPlayerInput(toggle: togglePlayback, seek: { seek(by: $0) }, close: closePlayer,
                                 controlsVisible: controlsVisible,
                                 showControls: { controlsVisible = true; scheduleControlsHide() }))
        #endif
        .alert("Watch on your TV", isPresented: $tvHelpVisible) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("For playback while your phone is locked or using another app, choose your TV with the AirPlay button above. For the custom TV interface and app-rendered subtitles, use Control Center → Screen Mirroring. Use the down arrow to browse CWorld while playback continues. Direct video AirPlay only carries subtitles included in the stream; separate app-rendered captions require mirroring. Screen mirroring may require CWorld to remain open and your phone unlocked.")
        }
        .onChange(of: tvPresentation) { _, presentation in
            if let player { externalDisplay.update(presentation, for: player) }
        }
        .onChange(of: externalDisplay.isConnected) { _, connected in
            hideControlsTask?.cancel()
            controlsVisible = true
            guard let player else { return }
            // Readiness belongs to the new surface, not the screen we just removed.
            hasFirstFrame = false
            updatePlaybackState(for: player)
            externalDisplay.update(tvPresentation, for: player)
            if connected { scheduleWaitingTimeout(attempt: activeAttempt) }
        }
        .onChange(of: controlsVisible) { _, visible in
            playbackHost.playerControlsVisible = visible
        }
        .persistentSystemOverlays(.hidden)
        .toolbar(.hidden, for: .navigationBar)
        .task(id: retryID) {
            isVisible = true
            playbackHost.playerControlsVisible = true
            await loadPlayback()
        }
        .onDisappear {
            isVisible = false
            playbackHost.playerControlsVisible = true
            activeAttempt = UUID()
            waitingTimeoutTask?.cancel()
            progressTask?.cancel()
            subtitleTask?.cancel()
            nativeSubtitleTask?.cancel()
            prefetchTask?.cancel()
            hideControlsTask?.cancel()
            removePlayerObservers()
            scheduleProgressSave()
            player?.pause()
            if let player { externalDisplay.detach(player) }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { scheduleProgressSave() }
            if phase == .active {
                updateNativeSubtitles()
                refreshActiveSubtitle()
                if subtitlesEnabled && subtitleCues.isEmpty && subtitleError != nil { loadSubtitles() }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: AVPlayerItem.mediaSelectionDidChangeNotification)) { notification in
            guard let item = notification.object as? AVPlayerItem,
                  item === player?.currentItem else { return }
            // AVFoundation can reset legible selection after a lock or route
            // transition without changing the app's caption toggle.
            updateNativeSubtitles()
        }
        .onChange(of: playbackHost.queue.map(\.id)) { _, _ in
            prefetchTask?.cancel(); prefetchTask = nil; preparedNext = nil
        }
        .onChange(of: volumeControlVisible) { _, presented in
            if presented { controlsVisible = true; hideControlsTask?.cancel() }
            else { scheduleControlsHide() }
        }
        .onChange(of: subtitlesEnabled) { _, enabled in
            playbackHost.subtitlesOn = enabled
            updateNativeSubtitles()
        }
        .onChange(of: subtitleSettingsPresented) { _, presented in
            if presented { controlsVisible = true; hideControlsTask?.cancel() }
            else { scheduleControlsHide() }
        }
        .onChange(of: playbackHost.isAirPlay) { _, active in
            updateNativeSubtitles()
        }
        .onReceive(NotificationCenter.default.publisher(for: UserDefaults.didChangeNotification)) { _ in
            updateNativeSubtitleAppearance()
        }
        .opacity(closingPlayer ? 0 : 1)
        .onChange(of: autoSkipOutro) { _, enabled in
            outroCountdown = nil
            if enabled { outroCancelled = false }
        }
        .scaleEffect(closingPlayer && !reducePlayerMotion ? 0.985 : 1)
        .allowsHitTesting(!closingPlayer)
    }

    private var playerControls: some View {
        #if targetEnvironment(macCatalyst)
        MacPlaybackControls(player: player, title: playerDisplayMediaTitle, episodeLabel: playerEpisodeLabel, isPlaying: isPlaying,
                            currentTime: $currentTime, duration: duration,
                            subtitlesEnabled: $subtitlesEnabled, hasSubtitles: selection.subtitleURL != nil || nativeSubtitlesAvailable,
                            subtitleSettingsPresented: $subtitleSettingsPresented,
                            autoSkipOutro: $autoSkipOutro,
                            volume: $volume, isMuted: $isMuted, close: closePlayer, toggle: togglePlayback,
                            restart: restartPlayback,
                            seek: { seek(by: $0) }, editing: { editing in
                                isScrubbing = editing
                                if !editing { seek(to: currentTime) }
                            }, mute: toggleMute,
                            previous: previousSelection.map { next in { switchTo(next) } },
                            next: nextSelection.map { next in { switchTo(next) } })
        #else
        mobilePlayerChrome
        #endif
    }


    #if !targetEnvironment(macCatalyst)
    /// A single layout owns controls, captions and messages within the safe area.
    private var mobilePlayerChrome: some View {
        GeometryReader { geometry in
            let compact = geometry.size.width > geometry.size.height
            let showTransport = controlsVisible && player != nil && !isLoading && playbackState != .failed
            let showHeader = controlsVisible || isLoading || playbackState == .failed
            ZStack {
                if showTransport {
                    LinearGradient(colors: [.black.opacity(0.7), .clear, .black.opacity(0.8)],
                                   startPoint: .top, endPoint: .bottom)
                        .ignoresSafeArea()
                        .allowsHitTesting(false)
                }
                VStack(spacing: compact ? 4 : 10) {
                    if showHeader { mobilePlayerHeader }
                    if showHeader { mobilePlayerStatus }
                    Spacer(minLength: 0)
                    if showTransport && !compact {
                        HStack(spacing: compact ? 28 : 38) {
                            mobileControl("gobackward.15", label: "Back 15 seconds") { seek(by: -15) }
                            Button(action: togglePlayback) {
                                Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                    .font(.system(size: 28, weight: .bold))
                                    .opacity(showMobileBuffering ? 0 : 1)
                                    .frame(width: compact ? 56 : 72, height: compact ? 56 : 72)
                                    .background(.white.opacity(0.18), in: Circle())
                                    .overlay {
                                        if showMobileBuffering {
                                            ProgressView().tint(.white).allowsHitTesting(false)
                                        }
                                    }
                            }
                            .accessibilityLabel(isPlaying ? "Pause" : "Play")
                            mobileControl("goforward.15", label: "Forward 15 seconds") { seek(by: 15) }
                        }
                        .font(.system(size: 25))
                    }
                    Spacer(minLength: 0)
                    if !externalDisplay.isConnected && !playbackHost.isAirPlay &&
                        subtitlesEnabled && !activeSubtitle.isEmpty {
                        Text(activeSubtitle)
                            .font(.custom("Helvetica Neue", size: compact ? 22 : 26).weight(.bold))
                            .multilineTextAlignment(.center)
                            .shadow(color: .black, radius: 3, x: 1, y: 1)
                            .frame(maxWidth: 760)
                            .fixedSize(horizontal: false, vertical: true)
                            .allowsHitTesting(false)
                    }
                    if player != nil && !isLoading && playbackState != .failed {
                        mobileSkipActions
                    }
                    if showTransport { mobileTimeline(compact: compact) }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, compact ? 4 : 8)
                .padding(EdgeInsets(
                    top: max(geometry.safeAreaInsets.top, mobileSafeArea.top),
                    leading: max(geometry.safeAreaInsets.leading, mobileSafeArea.leading),
                    bottom: max(geometry.safeAreaInsets.bottom, mobileSafeArea.bottom),
                    trailing: max(geometry.safeAreaInsets.trailing, mobileSafeArea.trailing)
                ))
                if showMobileBuffering && (compact || !showTransport) {
                    ProgressView().tint(.white).allowsHitTesting(false)
                }
            }
            .background(CWorldWindowSafeAreaReader { mobileSafeArea = $0 })
            .foregroundStyle(.white)
            .buttonStyle(.plain)
        }
        .task(id: playbackState) {
            showMobileBuffering = false
            guard playbackState == .buffering else { return }
            do { try await Task.sleep(for: .milliseconds(450)) } catch { return }
            guard !Task.isCancelled, playbackState == .buffering,
                  player?.timeControlStatus == .waitingToPlayAtSpecifiedRate else { return }
            showMobileBuffering = true
        }
    }

    private var mobilePlayerHeader: some View {
        HStack(spacing: 8) {
            mobileControl("chevron.left", label: "Back to media details", action: closePlayer)
            VStack(alignment: .leading, spacing: 2) {
                Text(playerDisplayMediaTitle).font(.headline).lineLimit(1)
                if let episode = playerEpisodeLabel {
                    Text(episode).font(.caption).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            CWorldAirPlayPicker().frame(width: 44, height: 44)
            mobileControl("chevron.down", label: "Minimize player and browse") {
                playbackHost.minimized = true
            }
        }
    }

    @ViewBuilder private var mobilePlayerStatus: some View {
        if playbackHost.connectionLost {
            Button { playbackHost.remotePresented = true } label: {
                Label("TV disconnected · Reconnect", systemImage: "wifi.exclamationmark")
                    .font(.caption).frame(minHeight: 44)
            }
        } else if let subtitleError, !isLoading && playbackState != .failed {
            HStack(spacing: 8) {
                Text(subtitleError).font(.caption).lineLimit(2)
                Button("Retry") { loadSubtitles() }.frame(minWidth: 44, minHeight: 44)
            }
            .padding(.horizontal, 10)
            .background(.black.opacity(0.7), in: RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder private var mobileSkipActions: some View {
        if canSkipIntro || canSkipOutro {
            HStack(spacing: 8) {
                Spacer(minLength: 0)
                if canSkipIntro {
                    Button("Skip Intro", action: skipIntro).playerActionStyle()
                }
                if canSkipOutro {
                    Button(action: skipOutro) {
                        Text(nextSelection == nil ? "Skip Outro" :
                             outroCountdown.map { "Next episode · \($0)s" } ?? "Next episode")
                    }
                    .playerActionStyle()
                }
            }
        }
    }

    private func mobileTimeline(compact: Bool) -> some View {
        VStack(spacing: 0) {
            Slider(value: Binding(
                get: { duration > 0 ? min(max(currentTime, 0), duration) : 0 },
                set: { currentTime = $0 }),
                   in: 0...max(duration, 1),
                   onEditingChanged: { editing in
                       isScrubbing = editing
                       if editing { hideControlsTask?.cancel() }
                       else { seek(to: currentTime); scheduleControlsHide() }
                   })
                .tint(.white)
                .accessibilityLabel("Playback position")
            HStack {
                Text(formatTime(currentTime))
                Spacer()
                Text(formatTime(duration))
            }
            .font(.caption.monospacedDigit())
            HStack(spacing: 8) {
                if compact {
                    mobileControl("gobackward.15", label: "Back 15 seconds") { seek(by: -15) }
                    mobileControl(isPlaying ? "pause.fill" : "play.fill", label: isPlaying ? "Pause" : "Play",
                                  action: togglePlayback)
                    mobileControl("goforward.15", label: "Forward 15 seconds") { seek(by: 15) }
                }
                if let previous = previousSelection {
                    mobileControl("backward.end.fill", label: "Previous episode") { switchTo(previous) }
                }
                if let next = nextSelection {
                    mobileControl("forward.end.fill", label: "Next episode") { switchTo(next) }
                }
                Spacer(minLength: 0)
                CWorldAudioTrackMenu(player: player, touchTarget: 44)
                if selection.subtitleURL != nil || nativeSubtitlesAvailable || !subtitleCues.isEmpty {
                    mobileControl(subtitlesEnabled ? "captions.bubble.fill" : "captions.bubble",
                                  label: subtitlesEnabled ? "Turn subtitles off" : "Turn subtitles on") {
                        subtitlesEnabled.toggle()
                    }
                }
                Menu {
                    Toggle("Auto-skip outro", systemImage: "forward.end.circle", isOn: $autoSkipOutro)
                    Button("Restart", systemImage: "arrow.counterclockwise", action: restartPlayback)
                    Button("TV remote and Up Next", systemImage: "appletvremote.gen4") {
                        playbackHost.remotePresented = true
                    }
                    Button("Watch on your TV", systemImage: "tv") { tvHelpVisible = true }
                    Button("Volume", systemImage: "speaker.wave.2") { volumeControlVisible = true }
                    Button(isMuted ? "Unmute" : "Mute", systemImage: isMuted ? "speaker.wave.2" : "speaker.slash",
                           action: toggleMute)
                } label: {
                    Image(systemName: "ellipsis").frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .accessibilityLabel("More playback options")
                .popover(isPresented: $volumeControlVisible) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Volume").font(.headline)
                        Slider(value: Binding(get: { Double(volume) }, set: {
                            volume = Float($0)
                            isMuted = volume == 0
                            player?.volume = volume
                        }), in: 0...1)
                        .accessibilityLabel("Player volume")
                    }
                    .padding(20).frame(width: 260)
                    .presentationCompactAdaptation(.popover)
                }
            }
            .font(.system(size: 18, weight: .semibold))
        }
    }

    private func mobileControl(_ icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).frame(width: 44, height: 44).contentShape(Rectangle())
        }
        .accessibilityLabel(label)
    }
    #endif

    private var playerDisplayMediaTitle: String { appModel.media(for: selection.mediaID)?.title ?? selection.title }
    private var playerEpisodeLabel: String? {
        guard let season = selection.season, let episodeNumber = selection.episode else { return nil }
        let episode = appModel.media(for: selection.mediaID)?.seasons?.first(where: { $0.number == season })?.episodes.first(where: { $0.number == episodeNumber })
        let name = episode?.title ?? "Episode \(episodeNumber)"
        return String(format: "S%02dE%02d", season, episodeNumber) + " • " + name
    }

    private func closePlayer() {
        #if targetEnvironment(macCatalyst)
        guard !closingPlayer else { return }
        // Route underneath the persistent overlay before revealing the detail page.
        NotificationCenter.default.post(name: .cworldMacPlayerBack, object: selection)
        hideControlsTask?.cancel()
        player?.pause()
        withAnimation(.easeInOut(duration: reducePlayerMotion ? 0.15 : 0.32)) {
            closingPlayer = true
        } completion: {
            if let onClose { onClose() } else { dismiss() }
        }
        #else
        if let onClose { onClose() } else { dismiss() }
        #endif
    }

    private var playbackError: some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.orange)
            Text("Playback unavailable")
                .cworldRoundedFont(19, weight: .semibold)
                .foregroundStyle(.white)
            if let errorMessage {
                Text(errorMessage)
                    .cworldRoundedFont(13)
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }
            Button("Try Again") { retryID = UUID() }
                .buttonStyle(.borderedProminent)
                .tint(CWorldTheme.accent)
        }
        .padding()
    }

    @MainActor
    private func loadPlayback() async {
        // Allow an episode handoff to finish its signing request while audio is between items.
        let handoffTask = UIApplication.shared.beginBackgroundTask(withName: "Episode handoff")
        defer {
            if handoffTask != .invalid { UIApplication.shared.endBackgroundTask(handoffTask) }
        }
        let attempt = UUID()
        activeAttempt = attempt
        let requestedSelection = selection
        removePlayerObservers()
        progressTask?.cancel()
        progressTask = nil
        hideControlsTask?.cancel()
        player?.pause()
        if let player { externalDisplay.detach(player) }
        player = nil
        errorMessage = nil
        playbackState = .preparing
        hasFirstFrame = false
        isSeekingToResume = false
        controlsVisible = true
        currentTime = 0
        duration = 0
        hasReachedOutro = false
        outroCountdown = nil
        outroCancelled = false
        playbackHost.title = requestedSelection.title
        playbackHost.mediaID = requestedSelection.mediaID
        playbackHost.season = requestedSelection.season
        playbackHost.episode = requestedSelection.episode
        let lockScreenMedia = appModel.media(for: requestedSelection.mediaID)
        playbackHost.configureLockScreen(title: requestedSelection.title,
            showTitle: requestedSelection.episode == nil ? nil : lockScreenMedia?.title,
            artworkURL: lockScreenMedia.flatMap { MacDesktopCatalog.placeholder($0, season: requestedSelection.season, episode: requestedSelection.episode) },
            fallbackURL: lockScreenMedia?.artwork.card ?? lockScreenMedia?.artwork.poster)
        activeSubtitle = ""
        subtitleCues = []
        subtitleError = nil
        subtitleTask?.cancel()
        scheduleWaitingTimeout(attempt: attempt)

        do {
            let url: URL
            if let preparedNext, preparedNext.key == requestedSelection.key,
               Date().timeIntervalSince(preparedNext.date) < 60 {
                url = preparedNext.url
            } else {
                let session = try await appModel.requestPlaybackSession(
                    mediaID: requestedSelection.mediaID,
                    season: requestedSelection.season,
                    episode: requestedSelection.episode)
                url = session.url
            }
            preparedNext = nil
            guard !Task.isCancelled, activeAttempt == attempt, playbackState != .failed else { return }

            let newPlayer = playbackHost.player ?? AVPlayer()
            let item = AVPlayerItem(url: url)
            if requestedSelection.subtitleURL != nil {
                // Install before attaching the item. Unlike selecting nil before asset
                // loading completes, this also suppresses later-discovered HLS/MP4
                // captions and automatic subtitle selection by AVKit.
                let legibleOutput = AVPlayerItemLegibleOutput()
                legibleOutput.suppressesPlayerRendering = !newPlayer.isExternalPlaybackActive
                item.add(legibleOutput)
            }
            newPlayer.replaceCurrentItem(with: item)
            // Video AirPlay is distinct from the custom mirrored display.
            newPlayer.allowsExternalPlayback = true
            newPlayer.audiovisualBackgroundPlaybackPolicy = .continuesIfPossible
            newPlayer.usesExternalPlaybackWhileExternalScreenIsActive = false
            playbackHost.configurePlaybackAudioSession()
            newPlayer.volume = volume
            newPlayer.isMuted = isMuted

            let resumeTime = appModel.progress(
                for: requestedSelection.mediaID,
                season: requestedSelection.season,
                episode: requestedSelection.episode
            )?.currentTime ?? 0
            isSeekingToResume = resumeTime > 5
            player = newPlayer
            playbackHost.player = newPlayer
            externalDisplay.attach(newPlayer) { [weak newPlayer] ready in
                guard let newPlayer, isVisible, externalDisplay.isConnected,
                      player === newPlayer, playbackState != .failed else { return }
                hasFirstFrame = ready
                updatePlaybackState(for: newPlayer)
            }
            externalDisplay.update(tvPresentation, for: newPlayer)
            installPlayerObservers(for: newPlayer)
            if resumeTime > 5 {
                await newPlayer.seek(to: CMTime(seconds: resumeTime, preferredTimescale: 600))
            }
            guard !Task.isCancelled, activeAttempt == attempt, player === newPlayer,
                  playbackState != .failed else {
                newPlayer.pause()
                return
            }
            isSeekingToResume = false
            loadSubtitles()
            playbackHost.queue.removeAll { $0.selection.key == requestedSelection.key }
            playbackHost.selectQueued = { next in switchTo(next) }
            playbackHost.skipNext = { if let nextSelection { switchTo(nextSelection) } }
            playbackHost.hasAutomaticNext = adjacentSelection(offset: 1) != nil
            playbackHost.skipPrevious = previousSelection.map { previous in { switchTo(previous) } }
            playbackHost.toggleCaptions = { subtitlesEnabled.toggle() }
            playbackHost.remoteSkipIntro = { skipIntro() }
            playbackHost.remoteSkipOutro = { skipOutro() }
            playbackHost.remoteSetVolume = { value in volume = value; player?.volume = value }
            playbackHost.subtitlesOn = subtitlesEnabled
            playbackHost.hasSubtitles = requestedSelection.subtitleURL != nil
            updateNativeSubtitles()
            if !playbackHost.connectionLost { newPlayer.play() }
            updatePlaybackState(for: newPlayer)
        } catch {
            guard !Task.isCancelled, activeAttempt == attempt else { return }
            failPlayback(error.localizedDescription)
        }
    }

    @MainActor
    private func updatePlaybackState(for observedPlayer: AVPlayer) {
        guard isVisible, player === observedPlayer, playbackState != .failed else { return }
        let state = PlaybackDisplayState.resolve(
            itemStatus: observedPlayer.currentItem?.status ?? .unknown,
            transport: observedPlayer.timeControlStatus,
            hasFirstFrame: hasFirstFrame || observedPlayer.isExternalPlaybackActive, isSeekingToResume: isSeekingToResume
        )
        if state == .failed {
            failPlayback(observedPlayer.currentItem?.error?.localizedDescription ?? "The video could not be loaded.")
            return
        }
        guard state != playbackState else { return }
        playbackState = state
        if state == .playing {
            waitingTimeoutTask?.cancel()
            if progressTask == nil { startProgressSync() }
            scheduleControlsHide()
        } else {
            hideControlsTask?.cancel()
            controlsVisible = true
            if state == .preparing || state == .buffering {
                scheduleWaitingTimeout(attempt: activeAttempt)
            } else {
                waitingTimeoutTask?.cancel()
            }
        }
    }

    @MainActor
    private func scheduleWaitingTimeout(attempt: UUID) {
        waitingTimeoutTask?.cancel()
        waitingTimeoutTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 30_000_000_000)
            guard !Task.isCancelled, activeAttempt == attempt,
                  playbackState == .preparing || playbackState == .buffering else { return }
            failPlayback("The video is taking too long to load. Check your connection and try again.")
        }
    }

    @MainActor
    private func failPlayback(_ message: String) {
        playbackState = .failed
        errorMessage = message
        controlsVisible = true
        waitingTimeoutTask?.cancel()
        hideControlsTask?.cancel()
        progressTask?.cancel()
        progressTask = nil
        subtitleTask?.cancel()
        player?.pause()
    }

    @MainActor
    private func installPlayerObservers(for newPlayer: AVPlayer) {
        let attempt = activeAttempt
        itemObservation = newPlayer.currentItem?.observe(\.status, options: [.initial, .new]) { _, _ in
            Task { @MainActor in
                guard activeAttempt == attempt else { return }
                updatePlaybackState(for: newPlayer)
                if newPlayer.currentItem?.status == .readyToPlay { updateNativeSubtitles() }
            }
        }
        transportObservation = newPlayer.observe(\.timeControlStatus, options: [.initial, .new]) { _, _ in
            Task { @MainActor in
                guard activeAttempt == attempt else { return }
                updatePlaybackState(for: newPlayer)
            }
        }
        timeObserver = newPlayer.addPeriodicTimeObserver(
            forInterval: CMTime(seconds: 0.25, preferredTimescale: 600),
            queue: .main
        ) { time in
            Task { @MainActor in
                guard isVisible, activeAttempt == attempt, player == newPlayer else { return }
                handleTimeUpdate(time.seconds)
            }
        }

        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: newPlayer.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in
                guard isVisible, activeAttempt == attempt, player === newPlayer, playbackState != .failed else { return }
                handlePlaybackEnded()
            }
        }
        failureObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime, object: newPlayer.currentItem, queue: .main
        ) { notification in
            let message = (notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error)?.localizedDescription
            Task { @MainActor in
                guard isVisible, activeAttempt == attempt, player === newPlayer else { return }
                failPlayback(message ?? "Playback was interrupted. Please try again.")
            }
        }
    }

    @MainActor
    private func removePlayerObservers() {
        itemObservation?.invalidate()
        transportObservation?.invalidate()
        itemObservation = nil
        transportObservation = nil
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        if let endObserver {
            NotificationCenter.default.removeObserver(endObserver)
        }
        if let failureObserver { NotificationCenter.default.removeObserver(failureObserver) }
        failureObserver = nil
        timeObserver = nil
        endObserver = nil
    }

    @MainActor
    private func handleTimeUpdate(_ seconds: Double) {
        guard seconds.isFinite else { return }
        guard playbackState != .failed else { return }
        if let player, seconds > 0, player.rate > 0,
           scenePhase == .background || playbackHost.minimized || player.isExternalPlaybackActive {
            hasFirstFrame = true
            updatePlaybackState(for: player)
        }
        if !isScrubbing { currentTime = max(seconds, 0) }
        if let itemDuration = player?.currentItem?.duration.seconds,
           itemDuration.isFinite,
           itemDuration > 0 {
            duration = itemDuration
        }
        playbackHost.publishLockScreen()
        if let next = nextSelection, let start = skipMarkers.outroStart,
           seconds >= start - 30, prefetchTask == nil {
            prefetchTask = Task { @MainActor in
                do {
                    let session = try await appModel.requestPlaybackSession(mediaID: next.mediaID, season: next.season, episode: next.episode)
                    guard !Task.isCancelled else { return }
                    preparedNext = (next.key, session.url, Date())
                } catch { /* Normal episode loading retries if preparation fails. */ }
            }
        }
        activeSubtitle = subtitleCues.filter { seconds >= $0.start && seconds < $0.end }.map(\.text).joined(separator: "\n")
        if selection.episode != nil, !hasReachedOutro,
           skipMarkers.hasReachedOutro(at: seconds, duration: duration) {
            hasReachedOutro = true
            scheduleProgressSave()
        }
        if autoSkipOutro, !outroCancelled, nextSelection != nil, let countdown = skipMarkers.nextEpisodeCountdown(at: seconds, duration: duration) {
            outroCountdown = countdown
            if outroCountdown == 0, let nextSelection {
                switchTo(nextSelection, completingEpisode: true)
            }
        } else { outroCountdown = nil }
    }

    @MainActor
    private func handlePlaybackEnded() {
        if selection.episode != nil {
            hasReachedOutro = true
            scheduleProgressSave()
        }
        playbackState = .paused
        waitingTimeoutTask?.cancel()
        // Canceling the outro also cancels automatic advancement at the actual end.
        // loadPlayback resets this choice for the next episode; manual Next still works.
        if autoSkipOutro, !outroCancelled, let nextSelection {
            switchTo(nextSelection, completingEpisode: true)
        } else {
            outroCountdown = nil
            hideControlsTask?.cancel()
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

        if hasReachedOutro {
            await appModel.clearWatchProgress(showID: selection.mediaID, season: selection.season,
                                               episode: selection.episode, duration: total)
            return
        }

        await appModel.saveWatchProgress(
            showID: selection.mediaID,
            season: selection.season,
            episode: selection.episode,
            currentTime: min(max(current, 0), total),
            duration: total
        )
    }

    @MainActor
    private func scheduleProgressSave(completed: Bool = false) {
        guard let player else { return }
        let total = player.currentItem?.duration.seconds ?? duration
        let current = completed ? total : player.currentTime().seconds
        guard current.isFinite, total.isFinite, total > 0 else { return }
        // Capture the outgoing episode before selection/player are replaced.
        let outgoing = selection
        let clearing = hasReachedOutro || (completed && outgoing.episode != nil)
        Task {
            if clearing {
                await appModel.clearWatchProgress(showID: outgoing.mediaID, season: outgoing.season,
                                                   episode: outgoing.episode, duration: total)
                return
            }
            await appModel.saveWatchProgress(showID: outgoing.mediaID, season: outgoing.season,
                                             episode: outgoing.episode, currentTime: min(max(current, 0), total), duration: total)
        }
    }

    @MainActor
    private func togglePlayback() {
        guard let player else { return }
        if player.timeControlStatus != .paused {
            player.pause()
        } else {
            player.play()
        }
        updatePlaybackState(for: player)
        controlsVisible = true
        scheduleControlsHide()
    }

    @MainActor
    private func restartPlayback() {
        guard let player else { return }
        outroCountdown = nil
        outroCancelled = false
        seek(to: 0)
        player.play()
        updatePlaybackState(for: player)
        controlsVisible = true
        scheduleControlsHide()
    }

    @MainActor
    private func seek(by seconds: Double) {
        seek(to: currentTime + seconds)
    }

    @MainActor
    private func seek(to seconds: Double) {
        guard let player else { return }
        let target = min(max(seconds, 0), max(duration - 0.1, 0))
        player.seek(to: CMTime(seconds: target, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        currentTime = target
    }

    @MainActor
    private func skipIntro() {
        guard let target = skipMarkers.introTarget(at: currentTime, duration: duration) else { return }
        seek(to: target)
        controlsVisible = true
        scheduleControlsHide()
    }

    @MainActor
    private func skipOutro() {
        guard canSkipOutro else { return }
        if let nextSelection {
            switchTo(nextSelection, completingEpisode: true)
            return
        }
        seek(to: duration)
        player?.pause()
        handlePlaybackEnded()
        scheduleProgressSave(completed: true)
        controlsVisible = true
    }

    @MainActor
    private func toggleMute() {
        isMuted.toggle()
        player?.isMuted = isMuted
    }

    @MainActor
    private func toggleControls() {
        guard !externalDisplay.isConnected else { controlsVisible = true; return }
        withAnimation(.easeInOut(duration: 0.2)) {
            controlsVisible.toggle()
        }
        if controlsVisible { scheduleControlsHide() } else { hideControlsTask?.cancel() }
    }

    @MainActor
    private func scheduleControlsHide() {
        hideControlsTask?.cancel()
        guard isPlaying, !externalDisplay.isConnected, !subtitleSettingsPresented, !volumeControlVisible, !isScrubbing else { return }
        hideControlsTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            guard !Task.isCancelled, !subtitleSettingsPresented, !volumeControlVisible, !isScrubbing else { return }
            withAnimation(.easeInOut(duration: 0.25)) { controlsVisible = false }
        }
    }

    @MainActor
    private func switchTo(_ next: PlayerSelection, completingEpisode: Bool = false) {
        guard selection != next else { return }
        activeAttempt = UUID()
        prefetchTask?.cancel()
        prefetchTask = nil
        scheduleProgressSave(completed: completingEpisode)
        progressTask?.cancel()
        player?.pause()
        selection = next
        controlsVisible = true
        playbackState = .preparing
        Task { @MainActor in await loadPlayback() }
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

    private func makeSelection(media: CWorldMedia, season: CWorldSeason, episode: CWorldEpisode) -> PlayerSelection? {
        guard appModel.episodeIsAvailable(mediaID: media.id, season: season.number, episode: episode.number) != false else { return nil }
        return PlayerSelection(
            mediaID: episode.playbackRef.mediaId,
            season: season.number,
            episode: episode.number,
            title: "S\(String(format: "%02d", season.number))E\(String(format: "%02d", episode.number)) · \(episode.title)",
            subtitleURL: episode.subtitles.first,
            skipIntroStart: episode.skipIntroStart, skipIntroEnd: episode.skipIntroEnd,
            skipOutroStart: episode.skipOutroStart
        )
    }

    @MainActor
    private func updateNativeSubtitleAppearance() {
        guard let player, let item = player.currentItem else { return }
        #if targetEnvironment(macCatalyst)
        let useMacPreferences = true
        #else
        let useMacPreferences = false
        #endif
        item.textStyleRules = player.isExternalPlaybackActive
            ? AirPlayCaptionAppearance.rules(useMacPreferences: useMacPreferences) : nil
    }

    @MainActor
    private func updateNativeSubtitles() {
        nativeSubtitleTask?.cancel()
        guard let currentPlayer = player, let item = currentPlayer.currentItem else { return }
        updateNativeSubtitleAppearance()
        nativeSubtitleTask = Task { @MainActor in
            do {
                let group = try await item.asset.loadMediaSelectionGroup(for: .legible)
                guard !Task.isCancelled, player === currentPlayer, currentPlayer.currentItem === item else { return }
                // Read the current intent and route AFTER the suspension point.
                let useNative = subtitlesEnabled && (currentPlayer.isExternalPlaybackActive || selection.subtitleURL == nil)
                updateNativeSubtitleAppearance()
                for output in item.outputs {
                    (output as? AVPlayerItemLegibleOutput)?.suppressesPlayerRendering = !useNative
                }
                nativeSubtitlesAvailable = !(group?.options.isEmpty ?? true)
                playbackHost.hasSubtitles = selection.subtitleURL != nil || nativeSubtitlesAvailable
                if let group {
                    let english = group.options.first { ($0.extendedLanguageTag ?? $0.locale?.languageCode ?? "").hasPrefix("en") }
                    let desired = useNative ? (english ?? group.defaultOption ?? group.options.first) : nil
                    // Avoid a media-selection notification feedback loop.
                    if item.currentMediaSelection.selectedMediaOption(in: group) != desired {
                        item.select(desired, in: group)
                    }
                }
            } catch {
                guard !Task.isCancelled, currentPlayer.currentItem === item else { return }
                nativeSubtitlesAvailable = false
            }
        }
    }

    private func refreshActiveSubtitle() {
        guard let seconds = player?.currentTime().seconds, seconds.isFinite else { return }
        activeSubtitle = subtitleCues.filter { seconds >= $0.start && seconds < $0.end }.map(\.text).joined(separator: "\n")
    }

    private func loadSubtitles() {
        guard let subtitleURL = selection.subtitleURL else { return }
        subtitleTask?.cancel()
        subtitleError = nil
        let attempt = activeAttempt
        let key = playbackKey
        subtitleTask = Task { @MainActor in
            do {
                let cues = try await SubtitleLoader.load(subtitleURL)
                guard !Task.isCancelled, isVisible, activeAttempt == attempt, playbackKey == key else { return }
                subtitleCues = cues
                refreshActiveSubtitle()
            } catch {
                guard !Task.isCancelled, isVisible, activeAttempt == attempt, playbackKey == key else { return }
                subtitleError = error.localizedDescription
            }
        }
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
            .frame(minHeight: 44)
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
