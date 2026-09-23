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

struct MacProgressFill: View {
    var fallback: Color = .mint
    @ObservedObject private var theme = MacProgressTheme.shared
    var body: some View {
        Rectangle().fill(theme.colorHex.map { Color(macHex: $0) } ?? fallback)
    }
}

struct MacProgressTint: ViewModifier {
    @ObservedObject private var theme = MacProgressTheme.shared
    func body(content: Content) -> some View {
        content.tint(theme.colorHex.map { Color(macHex: $0) } ?? .white)
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
    @State private var customProgress = false
    @State private var progressHex = "#63e6be"
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
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 16) {
                        Toggle("Custom progress bar color", isOn: $customProgress).fixedSize()
                        if customProgress {
                            ColorPicker("Color", selection: Binding(
                                get: { Color(macHex: progressHex) },
                                set: { progressHex = $0.macHex }
                            ), supportsOpacity: false).fixedSize()
                            TextField("#RRGGBB", text: $progressHex)
                                .textFieldStyle(.roundedBorder).frame(width: 100)
                            if MacBackground.hex(progressHex) == nil {
                                Text("Enter a valid hex color").font(.caption).foregroundStyle(.red)
                            }
                        }
                        Spacer()
                        Button("Use defaults") { customProgress = false }
                    }
                    HStack(spacing: 12) {
                        ZStack(alignment: .leading) {
                            Capsule().fill(.black.opacity(0.10))
                            Capsule().fill(customProgress ? Color(macHex: progressHex) : .mint).frame(width: 100)
                        }.frame(width: 160, height: 5)
                        Text(customProgress ? "Independent of your background. Saved when you apply." : "Default: mint on media tiles, white in the player.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }.padding(12).background(.black.opacity(0.035), in: RoundedRectangle(cornerRadius: 10))
                HStack {
                    Button("Reset") {
                        draft = .init(mode: .solid, start: "#add8e6", end: "#add8e6"); solidHex = draft.start
                        preferences.update { $0.background = draft }
                    }.padding(.horizontal, 16).padding(.vertical, 9).background(.black.opacity(0.05), in: Capsule())
                    Spacer()
                    Button("Apply") {
                        preferences.update {
                            $0.background = draft
                            $0.progressColor = customProgress ? MacBackground.hex(progressHex) : nil
                        }
                        close()
                    }
                        .disabled(customProgress && MacBackground.hex(progressHex) == nil)
                        .keyboardShortcut(.defaultAction).foregroundStyle(.white).padding(.horizontal, 16).padding(.vertical, 9).background(.blue, in: Capsule())
                    Button("Cancel", action: close).keyboardShortcut(.cancelAction)
                        .padding(.horizontal, 16).padding(.vertical, 9).background(.black.opacity(0.12), in: Capsule())
                }.padding(.top, 6)
            }.font(.system(size: 13))
        }
        .onAppear {
            draft = preferences.settings.visualBackground; solidHex = draft.start
            customProgress = preferences.settings.progressColor != nil
            progressHex = preferences.settings.progressColor ?? "#63e6be"
        }
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


/// Transient artwork colors; never writes to the user's background preferences.
struct MacArtworkHoverBackground: View {
    let url: URL?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var palette: MacArtworkPalette?

    var body: some View {
        ZStack {
            if let palette {
                LinearGradient(colors: palette.colors, startPoint: .topLeading, endPoint: .bottomTrailing)
                    .id(palette.id)
                    .transition(.opacity)
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: url) {
            // Avoid flashes while crossing gaps between adjacent cards.
            do { try await Task.sleep(for: .milliseconds(120)) } catch { return }
            let next: MacArtworkPalette?
            if let url {
                let resolved = MobileArtwork.bundledURL(for: url, maxPixelSize: 800) ?? url
                next = await MacArtworkPaletteCache.shared.palette(for: resolved)
            } else {
                next = nil
            }
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.65)) { palette = next }
        }
    }
}

/// Decorative hover indicators: one per tile, with no navigation behavior.
struct MacShelfHoverDots: View {
    let ids: [String]
    let activeID: String?
    let artworkURL: URL?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var accent = Color.white.opacity(0.75)

    var body: some View {
        HStack(spacing: 7) {
            ForEach(ids, id: \.self) { id in
                Capsule()
                    .fill(activeID == id ? accent : .white.opacity(0.24))
                    .frame(width: activeID == id ? 26 : 6, height: 6)
                    .overlay { Capsule().stroke(.white.opacity(activeID == id ? 0.18 : 0), lineWidth: 0.5) }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: ids.isEmpty ? 0 : 12)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.26), value: activeID)
        .task(id: artworkURL) {
            guard let artworkURL else { return }
            let resolved = MobileArtwork.bundledURL(for: artworkURL, maxPixelSize: 800) ?? artworkURL
            let palette = await MacArtworkPaletteCache.shared.palette(for: resolved)
            guard !Task.isCancelled else { return }
            let color = palette?.samples.first.map { Color(red: $0[0], green: $0[1], blue: $0[2]) }
                ?? .white.opacity(0.75)
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { accent = color }
        }
    }
}

private struct MacArtworkPalette: Sendable {
    let id: URL
    let samples: [[Double]]
    var colors: [Color] {
        samples.map { Color(red: $0[0] * 0.58, green: $0[1] * 0.58, blue: $0[2] * 0.58) }
    }
}

private actor MacArtworkPaletteCache {
    static let shared = MacArtworkPaletteCache()
    private var cached: [URL: MacArtworkPalette] = [:]

    func palette(for url: URL) async -> MacArtworkPalette? {
        if let result = cached[url] { return result }
        guard let image = await ImageCache.shared.image(for: url, maxPixelSize: 64),
              let cgImage = image.cgImage else { return nil }
        let size = 32
        var pixels = [UInt8](repeating: 0, count: size * size * 4)
        let drawn = pixels.withUnsafeMutableBytes { bytes -> Bool in
            guard let context = CGContext(data: bytes.baseAddress, width: size, height: size,
                                          bitsPerComponent: 8, bytesPerRow: size * 4,
                                          space: CGColorSpaceCreateDeviceRGB(),
                                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue |
                                            CGBitmapInfo.byteOrder32Big.rawValue) else { return false }
            context.draw(cgImage, in: CGRect(x: 0, y: 0, width: size, height: size))
            return true
        }
        guard drawn else { return nil }
        var bins: [Int: (count: Int, r: Double, g: Double, b: Double)] = [:]
        for i in stride(from: 0, to: pixels.count, by: 4) {
            guard pixels[i + 3] > 200 else { continue }
            let r = Double(pixels[i]) / 255, g = Double(pixels[i + 1]) / 255, b = Double(pixels[i + 2]) / 255
            let brightest = max(r, max(g, b)), darkest = min(r, min(g, b))
            // Ignore black bars and white lettering.
            guard brightest > 0.10, darkest < 0.90 else { continue }
            let key = Int(r * 7) * 64 + Int(g * 7) * 8 + Int(b * 7)
            let old = bins[key] ?? (0, 0, 0, 0)
            bins[key] = (old.count + 1, old.r + r, old.g + g, old.b + b)
        }
        let ranked = bins.sorted { lhs, rhs in
            if lhs.value.count == rhs.value.count { return lhs.key < rhs.key }
            return lhs.value.count > rhs.value.count
        }.map { bin in
            [bin.value.r, bin.value.g, bin.value.b].map { $0 / Double(bin.value.count) }
        }
        guard let first = ranked.first else { return nil }
        let second = ranked.dropFirst().first { sample in
            zip(first, sample).reduce(0.0) { $0 + abs($1.0 - $1.1) } > 0.35
        } ?? first.map { $0 * 0.65 }
        let result = MacArtworkPalette(id: url, samples: [first, second])
        if cached.count >= 100 { cached.removeAll(keepingCapacity: true) }
        cached[url] = result
        return result
    }
}

struct MacEpisodeTile: View {
    let title: String
    let subtitle: String
    let image: URL?
    let code: String
    let selected: Bool
    let fraction: Double
    var showsNewBadge = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            CatalogImage(url: image, showsBorder: false, maxPixelSize: 800).frame(width: 320, height: 180).clipped()
                .overlay(Color.black.opacity(0.20))
                .overlay(alignment: .topLeading) {
                    Group {
                        if showsNewBadge {
                            MacNewBadge()
                        } else {
                            Text(code).font(.custom(CWorldFonts.poppins(.bold), size: 11)).foregroundStyle(selected ? .black : .white)
                                .padding(.horizontal, 8).padding(.vertical, 5)
                                .background(selected ? .white.opacity(0.90) : .black.opacity(0.65), in: Capsule())
                        }
                    }.padding(12)
                }
                .overlay(alignment: .bottomLeading) {
                    if fraction > 0 { MacProgressFill().frame(width: 320 * min(1, max(0, fraction)), height: 4) }
                }
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.custom(CWorldFonts.poppins(.bold), size: 13)).lineLimit(1)
                Text(subtitle).font(.custom(CWorldFonts.poppins(), size: 12).weight(.medium)).foregroundStyle(.white.opacity(0.5)).lineLimit(1)
            }.padding(12).frame(maxWidth: .infinity, alignment: .leading)
        }.frame(width: 320).background(.white.opacity(selected ? 0.14 : 0.06), in: RoundedRectangle(cornerRadius: 8))
            .clipShape(RoundedRectangle(cornerRadius: 8)).overlay { RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(selected ? 0.45 : 0.10)) }
    }
}

private struct MacNewBadge: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false

    var body: some View {
        HStack(spacing: 6) {
            Text("New").font(.custom(CWorldFonts.poppins(.bold), size: 11))
            Circle().fill(Color.green)
                .frame(width: 7, height: 7)
                .scaleEffect(reduceMotion ? 1 : (pulsing ? 1.28 : 0.82))
                .opacity(reduceMotion ? 1 : (pulsing ? 1 : 0.58))
                .shadow(color: .green.opacity(0.65), radius: pulsing ? 4 : 1)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 8).padding(.vertical, 5)
        .background(.black.opacity(0.65), in: Capsule())
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 0.85).repeatForever(autoreverses: true)) { pulsing = true }
        }
    }
}

struct MacHistoryCard: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let media: CWorldMedia
    let season: Int?
    let episode: Int?
    let onOpen: () -> Void
    let onRemove: (() -> Void)?
    var isNew = false
    var onArtworkHover: ((URL?, Bool) -> Void)? = nil
    @State private var hovering = false
    private var episodeData: CWorldEpisode? {
        guard let season, let episode else { return nil }
        return media.seasons?.first(where: { $0.number == season })?.episodes.first(where: { $0.number == episode })
    }
    private var playbackID: String { episodeData?.playbackRef.mediaId ?? media.movieAsset?.mediaId ?? media.id }
    private var progressFraction: Double {
        let saved = appModel.progress(for: playbackID, season: season, episode: episode)
        return min(1, max(0, (saved?.currentTime ?? 0) / max(1, saved?.duration ?? 1)))
    }
    private var tileTitle: String {
        guard let episodeData else { return media.title }
        return EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season ?? 1, episode: episodeData.number) ?? episodeData.title
    }
    private var tileSubtitle: String {
        guard let episodeData else { return "Movie · \(media.metadata.duration)" }
        return "Episode \(episodeData.number) · \(episodeData.duration)"
    }
    private var tileCode: String {
        guard let season, let episode else { return "Movie" }
        return String(format: "S%02dE%02d", season, episode)
    }
    private var tileImage: URL? {
        episodeData == nil ? MacDesktopCatalog.placeholder(media) : MacDesktopCatalog.placeholder(media, season: season, episode: episode)
    }
    var body: some View {
        Button(action: onOpen) {
            MacEpisodeTile(title: tileTitle, subtitle: tileSubtitle, image: tileImage, code: tileCode,
                           selected: false, fraction: progressFraction, showsNewBadge: isNew)
        }.buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.025, pressedScale: 0.97, lift: 5))
            .overlay(alignment: .topTrailing) {
                if let onRemove {
                    Button(action: onRemove) { Image(systemName: "xmark").font(.system(size: 10, weight: .bold)).frame(width: 24, height: 24).background(.black.opacity(0.7), in: Circle()) }
                        .padding(5)
                        .opacity(hovering ? 1 : 0)
                        .scaleEffect(hovering ? 1 : 0.82)
                        .allowsHitTesting(hovering)
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: hovering)
                        .help("Remove from recently watched")
                }
            }.onHover { hovering = $0; onArtworkHover?(tileImage, $0) }
            .onDisappear { if hovering { onArtworkHover?(tileImage, false) } }
            .contextMenu { if let onRemove { Button("Remove from Recently Watched", role: .destructive, action: onRemove) } }
    }
}

struct MacRecentLauncher: View {
    let items: [ContinueWatchingItem]
    let action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    private var visibleItems: [ContinueWatchingItem] { Array(items.prefix(3)) }
    private var count: Int { min(items.count, 10) }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                ZStack {
                    if visibleItems.isEmpty {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 30, weight: .light))
                            .foregroundStyle(.white.opacity(0.65))
                            .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
                    } else {
                        ForEach(Array(visibleItems.enumerated()), id: \.element.id) { index, item in
                            let side: CGFloat = index == 0 ? 0 : (index == 1 ? -1 : 1)
                            CatalogImage(url: artwork(for: item), showsBorder: false, maxPixelSize: 320)
                                .frame(width: 112, height: 63)
                                .clipped()
                                .overlay(alignment: .bottom) {
                                    LinearGradient(colors: [.clear, .black.opacity(0.28)],
                                                   startPoint: .center, endPoint: .bottom)
                                }
                                .clipShape(RoundedRectangle(cornerRadius: 7))
                                .overlay {
                                    RoundedRectangle(cornerRadius: 7)
                                        .stroke(.white.opacity(index == 0 ? 0.22 : 0.10), lineWidth: 0.7)
                                }
                                .shadow(color: .black.opacity(index == 0 ? 0.48 : 0.3),
                                        radius: index == 0 ? 10 : 6, x: side * 2, y: 7)
                                .brightness(hovering ? 0.025 : (index == 0 ? 0 : -0.12))
                                .scaleEffect(index == 0 ? 1 : 0.9)
                                .rotationEffect(.degrees(Double(side) * (hovering && !reduceMotion ? 12 : 8)))
                                .offset(x: side * (hovering && !reduceMotion ? 34 : 26),
                                        y: index == 0 ? (hovering && !reduceMotion ? -4 : 0) : 5)
                                .zIndex(index == 0 ? 3 : Double(3 - index))
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 88)
                VStack(spacing: 4) {
                    HStack(spacing: 7) {
                        Text("Recently Watched")
                            .font(.custom(CWorldFonts.poppins(.semibold), size: 12))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .offset(x: hovering && !reduceMotion ? 2 : 0)
                    }
                    .foregroundStyle(.white.opacity(hovering ? 1 : 0.8))
                    Text(count > 0 ? "\(count) titles to continue" : "Explore recently watched")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white.opacity(0.45))
                }
                .lineLimit(1)
                .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.top, 10).padding(.bottom, 4)
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1, pressedScale: 0.98))
        .onHover { hovering = $0 }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.28), value: hovering)
        .help("Open Recently Watched")
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Open Recently Watched")
        .accessibilityValue("\(count) unfinished titles")
    }

    private func artwork(for item: ContinueWatchingItem) -> URL? {
        if let episode = item.episode {
            return MacDesktopCatalog.placeholder(item.media, season: item.progress.season, episode: episode.number)
        }
        return MacDesktopCatalog.placeholder(item.media)
    }
}
#endif
