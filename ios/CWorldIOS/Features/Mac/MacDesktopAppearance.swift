#if targetEnvironment(macCatalyst)
import SwiftUI
import UIKit
#if targetEnvironment(macCatalyst)
import AppKit
#endif

enum MacGalleryGeometry {
    static func frame(index: Int, selected: Int?, size: CGSize, windowWidth: CGFloat) -> CGRect {
        let side: CGFloat = windowWidth < 1536 ? 300 : max(200, (size.width - 48) / 3)
        let column = (size.width + 24) / 3
        guard let selected else {
            return CGRect(x: CGFloat(index % 3) * column, y: CGFloat(index / 3) * size.height / 2, width: side, height: side)
        }
        if index == selected {
            let preferred: CGFloat = windowWidth <= 1280 ? 460 : windowWidth < 1536 ? 630 : min(800, max(620, windowWidth * 0.46))
            let large = min(preferred, max(360, size.width - side - 40), size.height - 20)
            return CGRect(x: 0, y: 0, width: large, height: large)
        }
        let row = index > selected ? index - 1 : index
        let ratio: CGFloat = windowWidth <= 1280 ? 3.5 : windowWidth < 1536 ? 3.1 : 3.4
        return CGRect(x: column * 2 + 6, y: CGFloat(row) * size.height / 5, width: side * 0.965, height: side / ratio * 0.965)
    }
}

struct MacBackgroundFill: View {
    let value: MacBackground
    var body: some View {
        GeometryReader { geometry in
            let colors = [Color(macHex: value.start), Color(macHex: value.end)]
            switch value.mode {
            case .solid: colors[0]
            case .linear: LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing)
            case .diagonal: LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
            case .radial, .center:
                RadialGradient(colors: value.mode == .center ? Array(colors.reversed()) : colors,
                               center: .center, startRadius: 0, endRadius: hypot(geometry.size.width, geometry.size.height) / 2)
            case .conic:
                AngularGradient(colors: colors, center: .bottom, startAngle: .degrees(90), endAngle: .degrees(450))
            }
        }.accessibilityHidden(true)
    }
}

extension Color {
    init(macHex: String) {
        let normalized = MacBackground.hex(macHex) ?? "#ffffff"
        let number = UInt32(normalized.dropFirst(), radix: 16) ?? 0xffffff
        self.init(.sRGB, red: Double((number >> 16) & 255) / 255,
                  green: Double((number >> 8) & 255) / 255, blue: Double(number & 255) / 255, opacity: 1)
    }
    var macHex: String {
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        guard UIColor(self).getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return "#ffffff" }
        return String(format: "#%02x%02x%02x", Int((red * 255).rounded()), Int((green * 255).rounded()), Int((blue * 255).rounded()))
    }
}

struct MacInteractiveButtonStyle: ButtonStyle {
    var hoverScale: CGFloat = 1.05
    var pressedScale: CGFloat = 0.95
    var lift: CGFloat = 0
    func makeBody(configuration: Configuration) -> some View {
        InteractiveBody(configuration: configuration, hoverScale: hoverScale, pressedScale: pressedScale, lift: lift)
    }
    private struct InteractiveBody: View {
        let configuration: Configuration
        let hoverScale: CGFloat
        let pressedScale: CGFloat
        let lift: CGFloat
        @State private var hovering = false
        @Environment(\.accessibilityReduceMotion) private var reduceMotion
        var body: some View {
            configuration.label
                .scaleEffect(reduceMotion ? 1 : configuration.isPressed ? pressedScale : hovering ? hoverScale : 1)
                .offset(y: hovering && !reduceMotion ? -lift : 0)
                .brightness(hovering ? 0.035 : 0)
                .animation(reduceMotion ? nil : .spring(response: 0.28, dampingFraction: 0.72), value: hovering)
                .animation(reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.65), value: configuration.isPressed)
                .onHover {
                    hovering = $0
                    #if targetEnvironment(macCatalyst)
                    if $0 { NSCursor.pointingHand.set() } else { NSCursor.arrow.set() }
                    #endif
                }
                .background(MacPointerView())
        }
    }
}

struct MacPointerView: UIViewRepresentable {
    final class Coordinator: NSObject, UIPointerInteractionDelegate {
        func pointerInteraction(_ interaction: UIPointerInteraction, styleFor region: UIPointerRegion) -> UIPointerStyle? {
            guard let view = interaction.view else { return nil }
            return UIPointerStyle(effect: .highlight(UITargetedPreview(view: view)))
        }
        #if targetEnvironment(macCatalyst)
        @objc func hover(_ recognizer: UIHoverGestureRecognizer) {
            switch recognizer.state {
            case .began, .changed: NSCursor.pointingHand.set()
            case .ended, .cancelled, .failed: NSCursor.arrow.set()
            default: break
            }
        }
        #endif
    }
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .clear
        view.isUserInteractionEnabled = true
        view.addInteraction(UIPointerInteraction(delegate: context.coordinator))
        #if targetEnvironment(macCatalyst)
        let hover = UIHoverGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.hover(_:)))
        view.addGestureRecognizer(hover)
        #endif
        return view
    }
    func updateUIView(_ view: UIView, context: Context) { }
}

/// App-owned overlay keeps the browser's dimmed backdrop and animated dialog.
struct MacDialog<Content: View>: View {
    var width: CGFloat = 900
    let close: () -> Void
    @ViewBuilder var content: () -> Content
    var body: some View {
        ZStack {
            Color.black.opacity(0.60).ignoresSafeArea().onTapGesture(perform: close)
            content().padding(24).frame(width: width)
                .foregroundStyle(Color(white: 0.16)).background(.white, in: RoundedRectangle(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).stroke(.black.opacity(0.10)) }
                .shadow(color: .black.opacity(0.28), radius: 30, y: 15)
                .environment(\.colorScheme, .light)
                .buttonStyle(MacInteractiveButtonStyle())
                .onTapGesture { /* Keep clicks inside the dialog off the dismissing scrim. */ }
        }.transition(.opacity.combined(with: .scale(scale: 0.95)))
    }
}

struct MacColorPicker: View {
    @ObservedObject var preferences: MacDesktopPreferences
    let close: () -> Void
    @State private var draft = MacBackground.original
    @State private var gradientDraft = MacBackground(mode: .linear, start: "#ff3131", end: "#004aad")
    @State private var editingGradient = false
    @State private var solidHex = "#add8e6"
    private var favorites: [MacBackground] { preferences.settings.favoriteBackgrounds ?? [] }
    var body: some View {
        MacDialog(close: close) {
            VStack(spacing: 16) {
                Text("Pick a Color").font(.system(size: 20, weight: .semibold))
                MacBackgroundFill(value: draft).frame(width: 80, height: 80).clipShape(Circle()).overlay { Circle().stroke(.black.opacity(0.12)) }
                HStack(spacing: 14) {
                    ColorPicker("Solid", selection: Binding(get: { Color(macHex: draft.start) }, set: {
                        draft = .init(mode: .solid, start: $0.macHex, end: $0.macHex); solidHex = $0.macHex
                    }), supportsOpacity: false).fixedSize()
                    TextField("#RRGGBB", text: $solidHex).textFieldStyle(.roundedBorder).frame(width: 100)
                        .onSubmit { if let hex = MacBackground.hex(solidHex) { draft = .init(mode: .solid, start: hex, end: hex) } }
                        .onChange(of: solidHex) { old, value in
                            if old != value, value != draft.start, let hex = MacBackground.hex(value) {
                                draft = .init(mode: .solid, start: hex, end: hex)
                            }
                        }
                    Button("Gradient", systemImage: "paintpalette.fill") {
                        gradientDraft = draft.mode == .solid ? .init(mode: .linear, start: draft.start, end: "#ffffff") : draft
                        if gradientDraft.mode == .conic { gradientDraft.mode = .linear }
                        editingGradient = true
                    }.padding(8).background(.black.opacity(0.05), in: Capsule())
                }
                Text("Selected: \(draft.mode == .solid ? draft.start.uppercased() : "Gradient")").font(.system(size: 13, weight: .semibold))
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        label("Favorites"); Spacer()
                        Button("+ Add") {
                            preferences.update { $0.favoriteBackgrounds = favorites + [draft] }
                        }.foregroundStyle(.blue).disabled(favorites.contains(draft) || favorites.count >= 6)
                    }
                    HStack(spacing: 12) {
                        if favorites.isEmpty { Text("No favorites yet").font(.caption).foregroundStyle(.gray).frame(height: 40) }
                        ForEach(favorites) { value in
                            swatch(value).overlay(alignment: .topTrailing) {
                                Button { preferences.update { $0.favoriteBackgrounds = favorites.filter { $0 != value } } } label: {
                                    Image(systemName: "xmark").font(.system(size: 8, weight: .bold)).foregroundStyle(.white).frame(width: 17, height: 17).background(.red, in: Circle())
                                }.offset(x: 5, y: -5).help("Remove favorite")
                            }
                        }
                        Spacer()
                    }
                }
                HStack(alignment: .top, spacing: 60) {
                    VStack(alignment: .leading, spacing: 12) {
                        label("Solid Colors")
                        LazyVGrid(columns: Array(repeating: GridItem(.fixed(42)), count: 8), spacing: 10) {
                            ForEach(MacBackground.solidColors, id: \.self) { hex in swatch(.init(mode: .solid, start: hex, end: hex)) }
                        }
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        label("Gradients")
                        LazyVGrid(columns: Array(repeating: GridItem(.fixed(42)), count: 6), spacing: 10) {
                            ForEach(MacBackground.gradients) { swatch($0) }
                        }
                    }
                }.padding(.vertical, 4)
                HStack {
                    Button("Reset") {
                        draft = .init(mode: .solid, start: "#add8e6", end: "#add8e6"); solidHex = draft.start
                        preferences.update { $0.background = draft }
                    }.padding(.horizontal, 16).padding(.vertical, 9).background(.black.opacity(0.05), in: Capsule())
                    Spacer()
                    Button("Apply") { preferences.update { $0.background = draft }; close() }
                        .keyboardShortcut(.defaultAction).foregroundStyle(.white).padding(.horizontal, 16).padding(.vertical, 9).background(.blue, in: Capsule())
                    Button("Cancel", action: close).keyboardShortcut(.cancelAction)
                        .padding(.horizontal, 16).padding(.vertical, 9).background(.black.opacity(0.12), in: Capsule())
                }.padding(.top, 6)
            }.font(.system(size: 13))
        }
        .onAppear { draft = preferences.settings.visualBackground; solidHex = draft.start }
        .overlay {
            if editingGradient {
                MacDialog(width: 340, close: { editingGradient = false }) {
                    VStack(alignment: .leading, spacing: 22) {
                        Text("Gradient").font(.title3.bold()).frame(maxWidth: .infinity)
                        label("Gradient colors")
                        HStack {
                            ColorPicker("Start", selection: colorBinding(\.start), supportsOpacity: false)
                            ColorPicker("End", selection: colorBinding(\.end), supportsOpacity: false)
                        }
                        label("Style")
                        HStack(spacing: 10) {
                            ForEach([MacBackground.Mode.linear, .diagonal, .radial, .center], id: \.self) { mode in
                                Button { gradientDraft.mode = mode } label: {
                                    MacBackgroundFill(value: .init(mode: mode, start: gradientDraft.start, end: gradientDraft.end))
                                        .frame(height: 40).clipShape(RoundedRectangle(cornerRadius: 5))
                                        .overlay { RoundedRectangle(cornerRadius: 5).stroke(gradientDraft.mode == mode ? .purple : .gray.opacity(0.3), lineWidth: 2) }
                                }.help(mode.rawValue.capitalized).accessibilityLabel(mode.rawValue.capitalized)
                            }
                        }
                        MacBackgroundFill(value: gradientDraft).frame(height: 48).clipShape(Capsule())
                        HStack {
                            Button("Done") { draft = gradientDraft; editingGradient = false }.foregroundStyle(.blue)
                            Spacer(); Button("Cancel") { editingGradient = false }
                        }
                    }
                }
            }
        }
    }
    private func label(_ text: String) -> some View { Text(text).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(white: 0.60)) }
    private func colorBinding(_ key: WritableKeyPath<MacBackground, String>) -> Binding<Color> {
        Binding(get: { Color(macHex: gradientDraft[keyPath: key]) }, set: { gradientDraft[keyPath: key] = $0.macHex })
    }
    private func swatch(_ value: MacBackground) -> some View {
        Button { draft = value; solidHex = value.start } label: {
            MacBackgroundFill(value: value).frame(width: 40, height: 40).clipShape(Circle())
                .overlay { Circle().stroke(.black.opacity(0.12)) }
                .overlay { if draft == value { Circle().stroke(.blue, lineWidth: 2).padding(-3) } }
        }.help(value.mode == .solid ? value.start.uppercased() : "\(value.mode.rawValue.capitalized): \(value.start) → \(value.end)")
    }
}
struct MacCoverCarousel: View {
    let catalog: [CWorldMedia]
    @State private var index = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        GeometryReader { geometry in
            if !catalog.isEmpty {
                let media = catalog[index % catalog.count]
                ZStack(alignment: .bottomLeading) {
                    CatalogImage(url: MacDesktopCatalog.cover(media), showsBorder: false, maxPixelSize: 2048)
                        .frame(width: geometry.size.width, height: geometry.size.height).clipped().id(media.id).transition(.opacity)
                    LinearGradient(colors: [.clear, .black.opacity(0.8)], startPoint: .top, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(media.title).font(.custom(CWorldFonts.poppins(.bold), size: 30))
                        Text(media.metadata.creator).font(.custom(CWorldFonts.poppins(.semibold), size: 14)).foregroundStyle(.white.opacity(0.7))
                    }.padding(16).id("title:\(media.id)").transition(.opacity.combined(with: .offset(y: 10)))
                }.overlay(alignment: .topTrailing) {
                    HStack(spacing: 10) {
                        Text(media.metadata.rating).font(.system(size: 14, weight: .bold)).frame(width: 38, height: 38)
                            .background(.black.opacity(0.5), in: Circle()).overlay { Circle().stroke(.green.opacity(0.65), lineWidth: 3) }
                        Text("IMDb").font(.system(size: 17, weight: .black)).padding(6).background(.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 4))
                    }.padding(16)
                }.clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }.task(id: "\(reduceMotion):\(scenePhase)") {
            guard !reduceMotion, scenePhase == .active else { return }
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(8)) } catch { return }
                guard !Task.isCancelled, catalog.count > 1 else { continue }
                withAnimation(.easeInOut(duration: 0.8)) { index = (index + 1) % catalog.count }
            }
        }
    }
}

struct MacHistoryCard: View {
    let media: CWorldMedia
    let season: Int?
    let episode: Int?
    let onOpen: () -> Void
    let onRemove: (() -> Void)?
    var overlaysMetadata = false
    @State private var hovering = false
    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 5) {
                CatalogImage(url: MacDesktopCatalog.placeholder(media, season: season, episode: episode), showsBorder: false, maxPixelSize: 640)
                    .frame(width: 208, height: 112).clipped()
                    .overlay(alignment: .bottomLeading) {
                        if overlaysMetadata {
                            LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black.opacity(0.4), location: 0.5), .init(color: .black.opacity(0.85), location: 1)], startPoint: .top, endPoint: .bottom)
                                .frame(height: 64)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(media.title).font(.custom(CWorldFonts.poppins(.semibold), size: 14)).foregroundStyle(.white).lineLimit(1)
                                Text(episode.map { "S\(season ?? 1)E\($0) — \(EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season ?? 1, episode: $0) ?? "Episode \($0)")" } ?? "Movie")
                                    .font(.system(size: 12)).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                            }.padding(.horizontal, 8).padding(.bottom, 8)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: overlaysMetadata ? 16 : 8))
                    .overlay { if overlaysMetadata { RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.1)) } }
                if !overlaysMetadata {
                Text(media.title).font(.custom(CWorldFonts.poppins(.semibold), size: 12)).lineLimit(1)
                Text(episode.map { "S\(season ?? 1)E\($0) — \(EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season ?? 1, episode: $0) ?? "Episode \($0)")" } ?? "Movie")
                    .font(.system(size: 11)).foregroundStyle(.white.opacity(0.6)).lineLimit(1)
                }
            }.frame(width: 208, alignment: .leading)
        }.buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.015, pressedScale: 0.98, lift: 2))
            .overlay(alignment: .topTrailing) {
                if let onRemove {
                    Button(action: onRemove) { Image(systemName: "xmark").font(.system(size: 10, weight: .bold)).frame(width: 24, height: 24).background(.black.opacity(0.7), in: Circle()) }
                        .padding(5).opacity(hovering ? 1 : 0).help("Remove from recently watched")
                }
            }.onHover { hovering = $0 }.padding(.horizontal, 12)
            .contextMenu { if let onRemove { Button("Remove from Recently Watched", role: .destructive, action: onRemove) } }
    }
}
#endif
