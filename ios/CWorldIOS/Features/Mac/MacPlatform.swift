#if targetEnvironment(macCatalyst)
import SwiftUI
import UIKit
import AVFoundation
import Combine

extension Notification.Name {
    static let cworldMacSearch = Notification.Name("cworld.mac.search")
    static let cworldMacRefresh = Notification.Name("cworld.mac.refresh")
}

struct CWorldMacCommands: Commands {
    var body: some Commands {
        CommandGroup(after: .textEditing) {
            Button("Search CWorld") { NotificationCenter.default.post(name: .cworldMacSearch, object: nil) }
                .keyboardShortcut("/", modifiers: .command)
            Button("Refresh Library") { NotificationCenter.default.post(name: .cworldMacRefresh, object: nil) }
                .keyboardShortcut("r", modifiers: .command)
        }
    }
}

struct MacWindowConfiguration: UIViewRepresentable {
    final class WindowView: UIView {
        override func didMoveToWindow() {
            super.didMoveToWindow()
            guard let scene = window?.windowScene else { return }
            scene.sizeRestrictions?.minimumSize = CGSize(width: 1200, height: 760)
            scene.sizeRestrictions?.allowsFullScreen = true
            scene.title = "CearaWorld"
        }
    }
    func makeUIView(context: Context) -> WindowView { WindowView() }
    func updateUIView(_ uiView: WindowView, context: Context) { }
}

struct MacPlayerInput: ViewModifier {
    let toggle: () -> Void
    let seek: (Double) -> Void
    let close: () -> Void
    let showControls: () -> Void
    @FocusState private var focused: Bool
    @State private var lastPointerUpdate = Date.distantPast
    func body(content: Content) -> some View {
        content.focusable().focused($focused)
            .onAppear { focused = true }
            .onKeyPress(.space) { toggle(); return .handled }
            .onKeyPress(.leftArrow) { seek(-15); return .handled }
            .onKeyPress(.rightArrow) { seek(15); return .handled }
            .onKeyPress(.escape) { close(); return .handled }
            .onContinuousHover { phase in
                if case .active = phase, Date().timeIntervalSince(lastPointerUpdate) > 0.15 {
                    lastPointerUpdate = Date(); showControls()
                }
            }
    }
}

@MainActor
final class MacTimelinePreview: ObservableObject {
    @Published private(set) var image: UIImage?
    private var task: Task<Void, Never>?
    private var generator: AVAssetImageGenerator?
    private let cache = NSCache<NSNumber, UIImage>()
    private weak var asset: AVAsset?
    private var requestID = UUID()
    init() { cache.totalCostLimit = 8 * 1024 * 1024; cache.countLimit = 20 }
    func request(asset: AVAsset, seconds: Double) {
        guard seconds.isFinite, seconds >= 0 else { return }
        let bucket = Int(seconds / 5) * 5
        if self.asset !== asset {
            cancel(); cache.removeAllObjects(); self.asset = asset
        }
        task?.cancel(); generator?.cancelAllCGImageGeneration()
        let id = UUID(); requestID = id
        if let cached = cache.object(forKey: NSNumber(value: bucket)) { image = cached; return }
        image = nil
        task = Task { @MainActor in
            do {
                try await Task.sleep(for: .milliseconds(250))
                guard !Task.isCancelled else { return }
                let generator = AVAssetImageGenerator(asset: asset)
                generator.maximumSize = CGSize(width: 360, height: 202)
                generator.appliesPreferredTrackTransform = true
                generator.requestedTimeToleranceBefore = CMTime(seconds: 2, preferredTimescale: 600)
                generator.requestedTimeToleranceAfter = CMTime(seconds: 2, preferredTimescale: 600)
                self.generator = generator
                let result = try await generator.image(at: CMTime(seconds: Double(bucket), preferredTimescale: 600))
                guard !Task.isCancelled, requestID == id else { return }
                let image = UIImage(cgImage: result.image)
                cache.setObject(image, forKey: NSNumber(value: bucket), cost: result.image.bytesPerRow * result.image.height)
                self.image = image
            } catch { if requestID == id { image = nil } }
        }
    }
    func cancel() {
        requestID = UUID(); task?.cancel(); task = nil
        generator?.cancelAllCGImageGeneration(); generator = nil; image = nil
    }
}

struct MacPlaybackControls: View {
    let player: AVPlayer?
    let title: String
    let episodeLabel: String?
    let isPlaying: Bool
    @Binding var currentTime: Double
    let duration: Double
    @Binding var subtitlesEnabled: Bool
    let hasSubtitles: Bool
    @Binding var volume: Float
    @Binding var isMuted: Bool
    let close: () -> Void
    let toggle: () -> Void
    let seek: (Double) -> Void
    let editing: (Bool) -> Void
    let mute: () -> Void
    let previous: (() -> Void)?
    let next: (() -> Void)?
    @State private var hoverTime: Double?
    @State private var hoverPosition: CGFloat = 0
    @StateObject private var preview = MacTimelinePreview()
    @State private var volumeHovered = false
    @AppStorage("cworld.mac.player.volume") private var savedVolume = 1.0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ZStack {
            LinearGradient(colors: [.black.opacity(0.8), .clear, .black.opacity(0.9)], startPoint: .top, endPoint: .bottom)
                .allowsHitTesting(false)
            VStack {
                HStack(alignment: .top) {
                    Button(action: close) { Image(systemName: "chevron.left").font(.title2).frame(width: 44, height: 44) }.help("Back · Escape")
                    Spacer()
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(title.uppercased()).font(.custom(CWorldFonts.elmsSans(.semibold), size: 23)).lineLimit(1)
                        if let episodeLabel { Text(episodeLabel).font(.custom(CWorldFonts.elmsSans(.medium), size: 16)).foregroundStyle(.white.opacity(0.75)).lineLimit(2) }
                    }.multilineTextAlignment(.trailing).frame(maxWidth: 720, alignment: .trailing)
                }
                Spacer()
                timeline
                HStack {
                    Text(time(currentTime)).monospacedDigit()
                    Spacer()
                    Text(time(duration)).monospacedDigit()
                }.font(.system(size: 12)).foregroundStyle(.white.opacity(0.7))
                HStack(spacing: 24) {
                    Text("CW").font(.custom(CWorldFonts.elmsSans(.bold), size: 23)).foregroundStyle(.white.opacity(0.4)).frame(width: 160, alignment: .leading)
                    Spacer()
                    if let previous { Button(action: previous) { Image(systemName: "backward.end.fill") }.help("Previous episode") }
                    Button { seek(-15) } label: { Image(systemName: "gobackward.15") }.help("Back 15 seconds · ←")
                    Button(action: toggle) { Image(systemName: isPlaying ? "pause.fill" : "play.fill").contentTransition(.symbolEffect(.replace)).font(.system(size: 28)).frame(width: 52, height: 52) }.help("Play / Pause · Space")
                    Button { seek(15) } label: { Image(systemName: "goforward.15") }.help("Forward 15 seconds · →")
                    if let next { Button(action: next) { Image(systemName: "forward.end.fill") }.help("Next episode") }
                    Spacer()
                    HStack(spacing: 14) {
                        if hasSubtitles {
                            Button { subtitlesEnabled.toggle() } label: { Image(systemName: subtitlesEnabled ? "captions.bubble.fill" : "captions.bubble") }.help("Toggle subtitles")
                        }
                        HStack(spacing: 10) {
                            Button(action: mute) { Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill").contentTransition(.symbolEffect(.replace)) }.help("Mute")
                            if volumeHovered { Slider(value: Binding(get: { Double(volume) }, set: { volume = Float($0) }), in: 0...1).frame(width: 90).transition(.opacity.combined(with: .scale(scale: 0.9))) }
                        }.padding(.vertical, 12).onHover { value in withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { volumeHovered = value } }
                            .contextMenu { Button("Volume 100%") { volume = 1 }; Button("Volume 50%") { volume = 0.5 }; Button("Mute", action: mute) }
                    }.frame(minWidth: 160)
                }.font(.system(size: 22)).padding(.top, 10)
            }.padding(.horizontal, 36).padding(.top, 30).padding(.bottom, 24)
        }
        .foregroundStyle(.white).tint(.white).buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.08, pressedScale: 0.9))
        .onAppear { volume = Float(min(1, max(0, savedVolume))) }
        .onChange(of: volume) { _, value in savedVolume = Double(value); player?.volume = value; isMuted = value == 0; player?.isMuted = isMuted }
        .onDisappear { preview.cancel() }
    }
    private var timeline: some View {
        GeometryReader { geometry in
            Slider(value: $currentTime, in: 0...max(1, duration), onEditingChanged: editing)
                .onContinuousHover { phase in
                    switch phase {
                    case .active(let location):
                        hoverPosition = min(max(location.x, 0), geometry.size.width)
                        let seconds = duration * Double(hoverPosition / max(1, geometry.size.width))
                        if hoverTime == nil || Int(seconds / 5) != Int((hoverTime ?? 0) / 5) {
                            if let asset = player?.currentItem?.asset { preview.request(asset: asset, seconds: seconds) }
                        }
                        hoverTime = seconds
                    case .ended: hoverTime = nil; preview.cancel()
                    }
                }
                .overlay(alignment: .topLeading) {
                    if let hoverTime {
                        VStack(spacing: 5) {
                            if let image = preview.image { Image(uiImage: image).resizable().scaledToFit().frame(width: 180, height: 102).clipShape(RoundedRectangle(cornerRadius: 8)) }
                            Text(time(hoverTime)).font(.caption.monospacedDigit())
                        }.padding(7).background(.black.opacity(0.9), in: RoundedRectangle(cornerRadius: 10))
                            .frame(width: 194)
                            .offset(x: min(max(hoverPosition - 97, 0), max(0, geometry.size.width - 194)), y: preview.image == nil ? -42 : -147)
                            .allowsHitTesting(false)
                    }
                }
        }.frame(height: 26)
    }
    private func time(_ seconds: Double) -> String {
        guard seconds.isFinite else { return "0:00" }
        let value = max(0, Int(seconds))
        return value >= 3600 ? String(format: "%d:%02d:%02d", value / 3600, value / 60 % 60, value % 60) : String(format: "%d:%02d", value / 60, value % 60)
    }
}
#endif
