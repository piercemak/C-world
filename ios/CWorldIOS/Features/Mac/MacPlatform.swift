#if targetEnvironment(macCatalyst)
import SwiftUI
import UIKit
import AVFoundation
import Combine
import CoreGraphics

extension Notification.Name {
    static let cworldMacSearch = Notification.Name("cworld.mac.search")
    static let cworldMacRefresh = Notification.Name("cworld.mac.refresh")
    static let cworldMacPlayerBack = Notification.Name("cworld.mac.playerBack")
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
    let controlsVisible: Bool
    let showControls: () -> Void
    @FocusState private var focused: Bool
    @State private var lastPointerUpdate = Date.distantPast
    @State private var cursorIsHidden = false

    private func setCursorHidden(_ hidden: Bool) {
        guard cursorIsHidden != hidden else { return }
        cursorIsHidden = hidden
        if hidden {
            CGDisplayHideCursor(CGMainDisplayID())
        } else {
            CGDisplayShowCursor(CGMainDisplayID())
        }
    }

    func body(content: Content) -> some View {
        content.focusable().focused($focused)
            .onAppear {
                focused = true
                setCursorHidden(!controlsVisible)
            }
            .onKeyPress(.space) { toggle(); return .handled }
            .onKeyPress(.leftArrow) { seek(-15); return .handled }
            .onKeyPress(.rightArrow) { seek(15); return .handled }
            .onKeyPress(.escape) { close(); return .handled }
            .onContinuousHover { phase in
                if case .active = phase, Date().timeIntervalSince(lastPointerUpdate) > 0.15 {
                    lastPointerUpdate = Date()
                    focused = true
                    setCursorHidden(false)
                    showControls()
                }
            }
            .onChange(of: controlsVisible) { _, visible in
                setCursorHidden(!visible)
            }
            .onDisappear {
                setCursorHidden(false)
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
    @Binding var subtitleSettingsPresented: Bool
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
                    Color.clear.frame(width: 34, height: 34)
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
                    Button(action: toggle) { Image(systemName: isPlaying ? "pause.fill" : "play.fill").contentTransition(.symbolEffect(.replace)).font(.system(size: 28)).frame(width: 52, height: 52) }
                        .keyboardShortcut(.space, modifiers: [])
                        .help("Play / Pause · Space")
                    Button { seek(15) } label: { Image(systemName: "goforward.15") }.help("Forward 15 seconds · →")
                    if let next { Button(action: next) { Image(systemName: "forward.end.fill") }.help("Next episode") }
                    Spacer()
                    HStack(spacing: 14) {
                        if hasSubtitles {
                            Button { subtitleSettingsPresented.toggle() } label: {
                                Image(systemName: subtitlesEnabled ? "captions.bubble.fill" : "captions.bubble")
                            }.help("Subtitle settings").accessibilityLabel("Subtitle settings")
                                .popover(isPresented: $subtitleSettingsPresented, arrowEdge: .bottom) {
                                    MacSubtitleSettings(enabled: $subtitlesEnabled)
                                }
                        }
                        CWorldAudioTrackMenu(player: player)
                        CWorldAirPlayPicker().frame(width: 32, height: 32)
                            .help("AirPlay").accessibilityLabel("AirPlay")
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
                .modifier(MacProgressTint())
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
struct MacSkipButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .semibold)).tracking(0.35)
            .foregroundStyle(.white.opacity(0.9))
            .padding(.horizontal, 20).padding(.vertical, 12)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
            .overlay { RoundedRectangle(cornerRadius: 8).fill(.black.opacity(0.2)) }
            .overlay { RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(0.1), lineWidth: 1) }
            .overlay(alignment: .top) { Capsule().fill(.white.opacity(0.2)).frame(height: 1).padding(.horizontal, 8) }
            .modifier(MacSkipHover(pressed: configuration.isPressed))
    }
}

private struct MacSkipHover: ViewModifier {
    let pressed: Bool
    @State private var hovering = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content.scaleEffect(reduceMotion ? 1 : pressed ? 0.9 : hovering ? 1.1 : 1)
            .opacity(hovering ? 0.85 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: hovering)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: pressed)
            .onHover { hovering = $0 }
            .background(MacPointerView())
    }
}

struct MacOutroCard: View {
    let artwork: URL?
    let player: AVPlayer?
    let countdownStart: Double?
    let duration: Double
    let play: () -> Void
    let cancel: () -> Void
    var body: some View {
        VStack(spacing: 8) {
            Button(action: play) {
                CatalogImage(url: artwork, showsBorder: false, maxPixelSize: 500)
                    .frame(width: 192, height: 96).clipped().clipShape(RoundedRectangle(cornerRadius: 8))
            }.accessibilityLabel("Play next episode")
            HStack(spacing: 8) {
                Button(action: play) {
                    Text("Next Episode").font(.system(size: 14, weight: .semibold)).tracking(0.6)
                }
                Spacer(minLength: 0)
                Button(action: cancel) { Image(systemName: "xmark").font(.system(size: 12, weight: .semibold)).frame(width: 24, height: 28) }
                    .accessibilityLabel("Cancel automatic next episode")
            }.padding(.horizontal, 8).frame(height: 30)
                .background(alignment: .leading) {
                    MacOutroSweep(player: player, start: countdownStart, duration: duration)
                }
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }.frame(width: 192).padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
            .overlay { RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(0.1), lineWidth: 1) }
            .foregroundStyle(.white)
            .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.03, pressedScale: 0.9))
    }
}

private struct MacOutroSweep: View {
    let player: AVPlayer?
    let start: Double?
    let duration: Double

    private var fraction: Double {
        guard let start, let time = player?.currentTime().seconds,
              start.isFinite, time.isFinite, duration.isFinite else { return 0 }
        let end = min(duration, start + 5)
        guard end > start else { return 0 }
        return min(1, max(0, (time - start) / (end - start)))
    }

    var body: some View {
        // Sample playback time directly, so pausing, seeking and buffering also
        // stop or reposition the sweep instead of letting a wall-clock animation run.
        TimelineView(.animation(minimumInterval: 1.0 / 60)) { _ in
            MacProgressFill(fallback: .white)
                .frame(width: 192 * fraction)
                .opacity(0.5)
        }
        .transaction { $0.animation = nil }
    }
}

struct MacSubtitleText: View {
    let text: String
    @AppStorage("cworld.mac.captions.font") private var fontName = "Helvetica Neue"
    @AppStorage("cworld.mac.captions.size") private var size = 30.0
    @AppStorage("cworld.mac.captions.bold") private var bold = true
    @AppStorage("cworld.mac.captions.background") private var background = 0.0
    @AppStorage("cworld.mac.captions.color") private var color = "White"
    @AppStorage("cworld.mac.captions.shadow") private var shadow = true

    var body: some View {
        Text(text)
            .font(.custom(fontName, fixedSize: min(48, max(18, size))).weight(bold ? .bold : .regular))
            .foregroundStyle(color == "Yellow" ? Color.yellow : color == "Warm White" ? Color(red: 1, green: 0.95, blue: 0.83) : .white)
            .multilineTextAlignment(.center)
            .shadow(color: .black.opacity(shadow ? 0.75 : 0), radius: 4, x: 2, y: 2)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(.black.opacity(min(0.85, max(0, background))), in: RoundedRectangle(cornerRadius: 6))
    }
}

private struct MacSubtitleSettings: View {
    @Binding var enabled: Bool
    @AppStorage("cworld.mac.captions.font") private var fontName = "Helvetica Neue"
    @AppStorage("cworld.mac.captions.size") private var size = 30.0
    @AppStorage("cworld.mac.captions.bold") private var bold = true
    @AppStorage("cworld.mac.captions.background") private var background = 0.0
    @AppStorage("cworld.mac.captions.color") private var color = "White"
    @AppStorage("cworld.mac.captions.shadow") private var shadow = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Subtitles").font(.headline)
            Toggle("Show subtitles", isOn: $enabled)
            MacSubtitleText(text: "Your subtitle preview")
                .frame(maxWidth: .infinity, minHeight: 100)
                .background(LinearGradient(colors: [Color(white: 0.22), .black], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 12))
            Picker("Font", selection: $fontName) {
                Text("Helvetica Neue · Default").tag("Helvetica Neue")
                Text("Arial").tag("Arial")
                Text("Avenir Next").tag("Avenir Next")
                Text("Georgia").tag("Georgia")
                Text("Menlo").tag("Menlo")
            }
            HStack {
                Text("Size")
                Slider(value: $size, in: 18...48, step: 2)
                Text("\(Int(size))").monospacedDigit().frame(width: 28)
            }
            Picker("Text color", selection: $color) {
                ForEach(["White", "Warm White", "Yellow"], id: \.self) { Text($0).tag($0) }
            }
            Toggle("Bold text", isOn: $bold)
            Toggle("Text shadow", isOn: $shadow)
            HStack {
                Text("Background")
                Slider(value: $background, in: 0...0.85)
                Text("\(Int((background * 100).rounded()))%").monospacedDigit().frame(width: 40)
            }
            Button("Restore browser defaults") {
                fontName = "Helvetica Neue"; size = 30; bold = true
                background = 0; color = "White"; shadow = true
            }
            Text("Appearance saves automatically for this Mac. Direct AirPlay uses the TV’s subtitle styling.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .font(.system(size: 13)).buttonStyle(.plain).tint(.white)
        .padding(22).frame(width: 390).preferredColorScheme(.dark)
    }
}
#endif
