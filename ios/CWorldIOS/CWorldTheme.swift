import SwiftUI

enum CWorldTheme {
    static let background = Color.black
    static let accent = Color(red: 0.678, green: 0.847, blue: 0.902)
    static let success = Color(red: 0.251, green: 0.878, blue: 0.408)
    static let primaryText = Color.white
    static let secondaryText = Color.white.opacity(0.62)
    static let mutedText = Color.white.opacity(0.42)
    static let glass = Color.white.opacity(0.12)
    static let glassStrong = Color.white.opacity(0.2)
    static let glassBorder = Color.white.opacity(0.24)
    static let cardBorder = Color.white.opacity(0.16)
}

enum CWorldFonts {
    static func alexandria(_ weight: Font.Weight = .regular) -> String {
        face("Alexandria", weight: weight)
    }

    static func poppins(_ weight: Font.Weight = .regular) -> String {
        face("Poppins", weight: weight)
    }

    static func elmsSans(_ weight: Font.Weight = .regular) -> String {
        face("ElmsSans", weight: weight)
    }

    static func nunito(_ weight: Font.Weight = .regular) -> String {
        face("Nunito", weight: weight)
    }

    private static func face(_ family: String, weight: Font.Weight) -> String {
        let suffix: String
        if weight == .bold {
            suffix = "Bold"
        } else if weight == .semibold {
            suffix = "SemiBold"
        } else if weight == .medium {
            suffix = "Medium"
        } else {
            suffix = "Regular"
        }
        return "\(family)-\(suffix)"
    }
}

struct CWorldGlassModifier: ViewModifier {
    let cornerRadius: CGFloat
    let fill: Color

    func body(content: Content) -> some View {
        content
            .background(fill, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(CWorldTheme.glassBorder, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.38), radius: 16, y: 8)
    }
}

struct CWorldLiquidGlassModifier<S: Shape>: ViewModifier {
    let shape: S
    let fallback: Color
    let interactive: Bool

    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            if interactive {
                content.glassEffect(.clear.interactive(), in: shape)
            } else {
                content.glassEffect(.clear, in: shape)
            }
        } else {
            content
                .background(fallback, in: shape)
                .overlay {
                    shape.stroke(CWorldTheme.glassBorder, lineWidth: 1)
                }
        }
    }
}

extension View {
    func cworldGlass(cornerRadius: CGFloat = 20, fill: Color = CWorldTheme.glass) -> some View {
        modifier(CWorldGlassModifier(cornerRadius: cornerRadius, fill: fill))
    }

    func cworldLiquidGlass<S: Shape>(
        in shape: S,
        fallback: Color = CWorldTheme.glass,
        interactive: Bool = false
    ) -> some View {
        modifier(CWorldLiquidGlassModifier(shape: shape, fallback: fallback, interactive: interactive))
    }

    func cworldRoundedFont(_ size: CGFloat, weight: Font.Weight = .regular) -> some View {
        font(.custom(CWorldFonts.alexandria(weight), size: size))
    }
}

struct CWorldLogo: View {
    let size: CGFloat

    var body: some View {
        HStack(spacing: 5) {
            Text("C")
                .cworldRoundedFont(size, weight: .bold)
            Image(systemName: "globe.americas.fill")
                .font(.system(size: size * 0.72, weight: .bold))
        }
        .foregroundStyle(CWorldTheme.primaryText)
    }
}

struct CWorldStatusDot: View {
    var body: some View {
        Circle()
            .fill(CWorldTheme.success)
            .frame(width: 9, height: 9)
            .overlay {
                Circle()
                    .stroke(CWorldTheme.success.opacity(0.35), lineWidth: 6)
            }
    }
}
