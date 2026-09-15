import SwiftUI
import AVKit
import MediaPlayer

struct CWorldQueueEntry: Identifiable, Equatable {
    let id: UUID
    let selection: PlayerSelection
    let mediaTitle: String
    let artworkURL: URL?

    init(media: CWorldMedia, season: Int? = nil, episode: CWorldEpisode? = nil) {
        id = UUID()
        mediaTitle = media.title
        artworkURL = MacDesktopCatalog.placeholder(media, season: season, episode: episode?.number)
        let name = episode.map { EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season ?? 1, episode: $0.number) ?? $0.title }
        selection = PlayerSelection(mediaID: episode?.playbackRef.mediaId ?? media.movieAsset?.mediaId ?? media.id,
            season: season, episode: episode?.number,
            title: episode.map { "S\(season ?? 1)E\($0.number) · \(name ?? $0.title)" } ?? media.title,
            subtitleURL: episode?.subtitles.first ?? (episode == nil ? media.subtitleTracks.first : nil),
            skipIntroEnd: episode?.skipIntroEnd, skipOutroStart: episode?.skipOutroStart)
    }
}

extension CWorldPlaybackHost {
    func enqueue(_ item: CWorldQueueEntry) {
        guard !queue.contains(where: { $0.selection.key == item.selection.key }),
              !(mediaID == item.selection.mediaID && season == item.selection.season && episode == item.selection.episode) else { return }
        queue.append(item)
    }
}

struct CWorldTVRemoteView: View {
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @ObservedObject private var display = ExternalDisplaySession.shared
    @ObservedObject private var liveActivity = CWorldLiveActivityController.shared
    @Environment(\.dismiss) private var dismiss
    @State private var adding = false
    @State private var scrub = 0.0
    @State private var scrubbing = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        if let image = host.artworkImage {
                            Image(uiImage: image).resizable().scaledToFill().frame(width: 100, height: 60).clipped().clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        VStack(alignment: .leading, spacing: 5) {
                            Text(host.showTitle).font(.headline).lineLimit(2)
                            Text(host.title).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        }
                    }
                    Label(host.connectionLost ? "TV disconnected · position saved" : host.isAirPlay ? "AirPlay video" : display.isConnected ? "Custom TV display" : "Playing on this device", systemImage: "tv")
                        .foregroundStyle(host.connectionLost ? .orange : .mint)
                    if host.connectionLost {
                        Text("Choose your TV below, then press Play. Or continue on your phone.").font(.caption)
                        Button("Continue on phone") { host.play(); host.minimized = false; dismiss() }
                    }
                    HStack {
                        Text("Choose or reconnect TV")
                        Spacer()
                        CWorldAirPlayPicker().frame(width: 44, height: 44)
                    }
                }
                Section("Playback") {
                    TimelineView(.periodic(from: .now, by: 1)) { _ in
                        let raw = host.player?.currentItem?.duration.seconds ?? 0
                        let duration = raw.isFinite ? max(1, raw) : 1
                        let time = host.player?.currentTime().seconds ?? 0
                        Slider(value: Binding(get: { scrubbing ? scrub : (time.isFinite ? min(time, duration) : 0) }, set: { scrub = $0 }), in: 0...duration) { editing in
                            scrubbing = editing
                            if !editing { host.remoteSeek(to: scrub) }
                        }.accessibilityLabel("Playback position")
                    }
                    HStack(spacing: 0) {
                        remoteButton("Previous episode", "backward.end.fill") { host.skipPrevious?() }.disabled(host.skipPrevious == nil)
                        remoteButton("Back 15 seconds", "gobackward.15") { seek(-15) }
                        remoteButton(host.isPlaying ? "Pause" : "Play", host.isPlaying ? "pause.fill" : "play.fill") { host.togglePlaybackFromRemote() }
                        remoteButton("Forward 15 seconds", "goforward.15") { seek(15) }
                        remoteButton("Next episode or queued title", "forward.end.fill") { host.skipNext?() }.disabled(!host.hasAutomaticNext && host.queue.isEmpty)
                    }.buttonStyle(.borderless)
                    Text("Swipe left or right here to seek").font(.caption).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).frame(height: 60).background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                        .gesture(DragGesture(minimumDistance: 20).onEnded { value in
                            guard abs(value.translation.width) > abs(value.translation.height) else { return }
                            seek(value.translation.width > 0 ? 15 : -15)
                        })
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Device volume").font(.caption).foregroundStyle(.secondary)
                        CWorldSystemVolume().frame(height: 36).accessibilityLabel("Playback device volume")
                    }
                    if host.hasSubtitles {
                        Button(host.subtitlesOn ? "Turn captions off" : "Turn captions on") { host.toggleCaptions?() }
                        if host.isAirPlay { Text("Separate caption files appear in custom TV mode. Direct AirPlay needs captions included in the stream.").font(.caption).foregroundStyle(.secondary) }
                    }
                    Button(host.isIntermission ? "End intermission" : "Cinema intermission", systemImage: "cup.and.saucer") { host.toggleIntermission() }
                        .disabled(!display.isConnected || host.isAirPlay)
                    if !display.isConnected || host.isAirPlay {
                        Text("The cinema artwork screen is available with the custom mirrored TV display.").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section {
                    ForEach(host.queue) { entry in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(entry.mediaTitle).font(.headline)
                                Text(entry.selection.title).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button { host.selectQueued?(entry.selection) } label: { Image(systemName: "play.circle") }
                                .buttonStyle(.borderless).accessibilityLabel("Play \(entry.selection.title) now")
                        }
                    }.onDelete { host.queue.remove(atOffsets: $0) }
                        .onMove { host.queue.move(fromOffsets: $0, toOffset: $1) }
                    if host.queue.isEmpty { Text("The next episode plays automatically when this queue is empty.").font(.caption).foregroundStyle(.secondary) }
                    Button("Add movies or episodes", systemImage: "plus") { adding = true }
                } header: { Text("Up Next · \(host.queue.count)") }
                Section { Button("Stop playback", role: .destructive) { host.stop(); dismiss() } }
                if let message = liveActivity.message { Section("Live Activity") { Text(message).font(.caption) } }
            }
            .navigationTitle("TV Remote")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }; ToolbarItem(placement: .topBarLeading) { EditButton() } }
            .sheet(isPresented: $adding) { CWorldQueuePicker() }
        }.preferredColorScheme(.dark).tint(.mint).onAppear { host.publishLockScreen() }
    }
    private func seek(_ delta: Double) { host.remoteSeek(to: (host.player?.currentTime().seconds ?? 0) + delta) }
    private func remoteButton(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: icon).font(.title2).frame(maxWidth: .infinity).frame(height: 60) }.accessibilityLabel(title)
    }
}

private struct CWorldSystemVolume: UIViewRepresentable {
    func makeUIView(context: Context) -> MPVolumeView { MPVolumeView(frame: .zero) }
    func updateUIView(_ view: MPVolumeView, context: Context) { }
}

struct CWorldQueuePicker: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @State private var query = ""
    var body: some View {
        NavigationStack {
            List {
                ForEach(appModel.catalog.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) }) { media in
                    if media.type == "movie" {
                        addButton(CWorldQueueEntry(media: media), title: media.title)
                    } else {
                        DisclosureGroup(media.title) {
                            ForEach(media.seasons ?? [], id: \.number) { season in
                                DisclosureGroup("Season \(season.number)") {
                                    ForEach(season.episodes) { episode in
                                        let item = CWorldQueueEntry(media: media, season: season.number, episode: episode)
                                        addButton(item, title: item.selection.title)
                                    }
                                }
                            }
                        }
                    }
                }
            }.searchable(text: $query, prompt: "Find a movie or show")
                .navigationTitle("Add to Up Next")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
    private func addButton(_ item: CWorldQueueEntry, title: String) -> some View {
        let added = host.queue.contains { $0.selection.key == item.selection.key }
        let current = host.mediaID == item.selection.mediaID && host.season == item.selection.season && host.episode == item.selection.episode
        return Button { host.enqueue(item) } label: {
            HStack { Text(title); Spacer(); Image(systemName: current ? "play.fill" : added ? "checkmark" : "plus.circle") }
        }.disabled(added || current)
    }
}
