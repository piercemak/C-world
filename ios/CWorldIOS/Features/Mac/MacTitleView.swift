#if targetEnvironment(macCatalyst)
import SwiftUI

struct MacTitleView: View {
    @EnvironmentObject private var appModel: AppModel
    let media: CWorldMedia
    let initialSeason: Int?
    let initialEpisode: Int?
    let onBack: () -> Void
    let onPlay: (MacPlaybackSelection) -> Void
    @State private var seasonNumber = 1
    @State private var selectedEpisode: Int?
    @State private var hoveredEpisode: Int?
    @State private var hoverTask: Task<Void, Never>?
    @State private var compact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var season: CWorldSeason? { media.seasons?.first { $0.number == seasonNumber } }
    private var heroEpisode: CWorldEpisode? { season?.episodes.first { $0.number == (hoveredEpisode ?? selectedEpisode) } }
    private var playEpisode: CWorldEpisode? { heroEpisode ?? season?.episodes.first }
    private var selection: MacPlaybackSelection { .init(media: media, season: media.type == "movie" ? nil : seasonNumber, episode: playEpisode) }
    private var heroTitle: String { heroEpisode.map { episodeTitle($0) } ?? media.title }
    private var heroKey: String { "\(seasonNumber):\(heroEpisode?.number ?? 0)" }
    private var progress: WatchProgressRecord? { appModel.progress(for: selection.playbackID, season: selection.season, episode: selection.episode?.number) }
    private var resume: ContinueWatchingItem? { ContinueWatchingItem.make(catalog: [media], records: Array(appModel.watchProgress.values)).first }
    private var meta: String { MacDesktopCatalog.desktopMeta(media) }
    private var context: String { heroEpisode.map { "\(media.title) • Season \(seasonNumber) • \(code($0))" } ?? "\(media.type == "movie" ? "Movie" : "Series") • \(meta)" }
    private var fraction: Double { min(1, max(0, (progress?.currentTime ?? 0) / max(1, progress?.duration ?? 1))) }
    private var previewFraction: Double { heroEpisode == nil && media.type != "movie" ? 0 : fraction }
    private var previewStatus: String {
        if previewFraction >= 0.95 { return "Watched" }
        if previewFraction > 0 { return "Continue" }
        return "Unwatched"
    }
    private var previewRuntime: String { heroEpisode?.duration ?? media.metadata.duration }
    private var animation: Animation? { reduceMotion ? nil : .easeInOut(duration: 0.32) }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                CatalogImage(url: MacDesktopCatalog.cover(media), showsBorder: false, maxPixelSize: 3072)
                    .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                LinearGradient(stops: [.init(color: Color(red: 0.03, green: 0.035, blue: 0.047).opacity(0.97), location: 0), .init(color: .black.opacity(0.84), location: 0.42), .init(color: .black.opacity(0.48), location: 1)], startPoint: .leading, endPoint: .trailing)
                LinearGradient(colors: [.clear, Color(red: 0.03, green: 0.035, blue: 0.047)], startPoint: .center, endPoint: .bottom)
                VStack(spacing: 16) {
                    Color.clear.frame(height: compact ? 16 : 44)
                    HStack(alignment: .bottom, spacing: 32) {
                        hero.frame(maxWidth: .infinity, alignment: .leading)
                        // Keep the preview rail stable while its artwork/title crossfades.
                        // Heights match the image + stats content (including padding).
                        preview.frame(width: 360, height: compact ? 266 : 344, alignment: .top)
                            .offset(y: -10)
                    }.frame(maxHeight: .infinity, alignment: .bottom)
                    VStack(spacing: 12) {
                        if let seasons = media.seasons, !seasons.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(seasons) { season in
                                        Button {
                                            hoverTask?.cancel()
                                            withAnimation(animation) { seasonNumber = season.number; selectedEpisode = nil; hoveredEpisode = nil }
                                        } label: {
                                            if #available(iOS 26.0, *) {
                                                Text("Season \(season.number)").font(.custom(CWorldFonts.poppins(.bold), size: 13))
                                                    .foregroundStyle(.white.opacity(seasonNumber == season.number ? 1 : 0.6))
                                                    .padding(.horizontal, 16).frame(height: 40)
                                                    .cworldLiquidGlass(in: RoundedRectangle(cornerRadius: 6))
                                            } else {
                                                Text("Season \(season.number)").font(.custom(CWorldFonts.poppins(.bold), size: 13))
                                                    .foregroundStyle(seasonNumber == season.number ? .black : .white.opacity(0.6))
                                                    .padding(.horizontal, 16).frame(height: 40)
                                                    .background(seasonNumber == season.number ? .white : .white.opacity(0.08), in: RoundedRectangle(cornerRadius: 6))
                                                    .overlay { RoundedRectangle(cornerRadius: 6).stroke(.white.opacity(0.12)) }
                                            }
                                        }
                                    }
                                }.padding(10)
                            }.frame(height: 62).background(.black.opacity(0.25), in: RoundedRectangle(cornerRadius: 8))
                                .overlay { RoundedRectangle(cornerRadius: 8).stroke(.white.opacity(0.12)) }
                        }
                        ScrollViewReader { reader in
                            ScrollView(.horizontal, showsIndicators: true) {
                                HStack(alignment: .top, spacing: 12) {
                                    if media.type == "movie" {
                                        Button { onPlay(selection) } label: { episodeTile(title: media.title, subtitle: "Movie · \(media.metadata.duration)", image: MacDesktopCatalog.cover(media, thumbnail: true), code: "Movie", selected: false, fraction: fraction) }
                                    } else {
                                        ForEach(season?.episodes ?? []) { episode in episodeCard(episode).id(episode.number) }
                                    }
                                }.padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 8)
                            }.frame(height: 278)
                                .onAppear { if let initialEpisode { reader.scrollTo(initialEpisode, anchor: .center) } }
                                .onChange(of: seasonNumber) { _, _ in if let first = season?.episodes.first { reader.scrollTo(first.number, anchor: .leading) } }
                        }.id(seasonNumber).transition(.opacity.combined(with: .offset(y: 12)))
                    }.frame(height: media.type == "movie" ? 278 : 353, alignment: .top)
                }.padding(.horizontal, 32).padding(.top, 16).padding(.bottom, compact ? 10 : 24)
                    .frame(maxWidth: 1280).frame(maxWidth: .infinity)
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(width: 34, height: 34)
                        .cworldLiquidGlass(in: Circle(), fallback: .white.opacity(0.07), interactive: true)
                }
                .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.06, pressedScale: 0.94))
                .keyboardShortcut(.escape, modifiers: [])
                .help("Back to Library")
                .accessibilityLabel("Back to Library")
                .padding(.leading, 32).padding(.top, 16)
            }.onAppear { compact = geometry.size.height < 820 }.onChange(of: geometry.size.height) { _, value in compact = value < 820 }
        }
        .foregroundStyle(.white).font(.custom(CWorldFonts.poppins(), size: 14))
        .buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.04, pressedScale: 0.96, lift: 2))
        .onAppear { seasonNumber = initialSeason ?? media.seasons?.first?.number ?? 1; selectedEpisode = initialEpisode }
        .onDisappear { hoverTask?.cancel() }
    }
    private var hero: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                CatalogImage(url: media.artwork.card, showsBorder: false, maxPixelSize: 160).frame(width: 34, height: 34).clipped().padding(6)
                    .background(.black.opacity(0.28), in: RoundedRectangle(cornerRadius: 6)).overlay { RoundedRectangle(cornerRadius: 6).stroke(.white.opacity(0.10)) }
                Text(context.uppercased()).font(.custom(CWorldFonts.poppins(.semibold), size: 11)).foregroundStyle(.white.opacity(0.65)).lineLimit(2)
            }.padding(.bottom, 12)
            Text(heroTitle).font(.custom(CWorldFonts.poppins(.bold), size: compact ? 46 : 62))
                .lineSpacing(-6).lineLimit(2).minimumScaleFactor(0.75).fixedSize(horizontal: false, vertical: true)
                // Keep the hero layout stable while episode artwork transitions.
            Text([meta, heroEpisode == nil ? media.metadata.rating : "\(Int(fraction * 100))% watched"].filter { !$0.isEmpty }.joined(separator: "   •   "))
                .font(.custom(CWorldFonts.poppins(.semibold), size: 12)).foregroundStyle(.white.opacity(0.70)).padding(.top, 16)
            Text(heroEpisode?.description ?? media.description).font(.custom(CWorldFonts.poppins(.semibold), size: 15)).foregroundStyle(.white.opacity(0.76))
                .lineSpacing(6).lineLimit(compact ? 2 : 3).frame(maxWidth: 680, alignment: .leading).fixedSize(horizontal: false, vertical: true).padding(.top, compact ? 10 : 16)
                // Episode hover should not animate or resize the surrounding text.
            HStack(spacing: 12) {
                Button { onPlay(selection) } label: {
                    Label(fraction > 0 ? "Resume" : "Play", systemImage: "play.fill").font(.custom(CWorldFonts.poppins(.bold), size: 13))
                        .foregroundStyle(.black).padding(.horizontal, 20).frame(height: 48).background(.white, in: RoundedRectangle(cornerRadius: 6))
                }.disabled(media.type != "movie" && playEpisode == nil).accessibilityIdentifier("mac.title.play")
                Button { if let resume { onPlay(.resume(resume)) } } label: {
                    Label("Continue", systemImage: "play.fill").font(.custom(CWorldFonts.poppins(.semibold), size: 13))
                        .padding(.horizontal, 20).frame(height: 48)
                        .cworldLiquidGlass(in: RoundedRectangle(cornerRadius: 6), fallback: .white.opacity(0.10), interactive: true)
                }.disabled(resume == nil).opacity(resume == nil ? 0.45 : 1).help("Continue the last unfinished episode")
            }.padding(.top, 22).padding(.bottom, 8)
        }
    }
    private var preview: some View {
        VStack(spacing: 16) {
            GeometryReader { bounds in
              ZStack {
                CatalogImage(url: heroEpisode == nil ? MacDesktopCatalog.cover(media, thumbnail: true) : MacDesktopCatalog.placeholder(media, season: seasonNumber, episode: heroEpisode?.number), showsBorder: false, maxPixelSize: 1000)
                    .frame(width: bounds.size.width, height: bounds.size.height)
                    .clipped()
                    .id(heroKey)
                    .transition(.opacity)
              }.animation(reduceMotion ? nil : .easeInOut(duration: 0.38), value: heroKey)
            }
                .frame(height: compact ? 170 : 224)
                .clipped()
                .overlay(alignment: .bottom) {
                    LinearGradient(colors: [.clear, .black.opacity(0.9)], startPoint: .top, endPoint: .bottom)
                        .frame(height: 72).allowsHitTesting(false)
                }
                .overlay(alignment: .bottomLeading) {
                    VStack(alignment: .leading, spacing: 4) {
                        previewText(heroEpisode.map(code) ?? media.title, height: 18)
                            .font(.custom(CWorldFonts.poppins(.bold), size: 12))
                        previewText(heroEpisode.map { "\(previewStatus) • \($0.duration)" } ?? meta, height: 16)
                            .font(.system(size: 12)).foregroundStyle(.white.opacity(0.65))
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .shadow(color: .black.opacity(0.85), radius: 5, y: 2)
                }
                .overlay(alignment: .bottom) {
                    if previewFraction > 0 {
                        GeometryReader { bounds in
                            MacProgressFill()
                                .frame(width: bounds.size.width * previewFraction, height: 4)
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                        }
                        .frame(height: 4)
                        .allowsHitTesting(false)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 4))
            HStack(spacing: 8) {
                statistic("Resume", previewFraction > 0 ? "\(Int((previewFraction * 100).rounded()))%" : "Start", "watch progress")
                statistic("Runtime", previewRuntime, "media length")
                statistic("Offline", previewFraction > 0 ? "Ready" : "None", "cache status")
            }.transaction { $0.animation = nil }
        }.padding(16)
            .cworldLiquidGlass(in: RoundedRectangle(cornerRadius: 8), fallback: .black.opacity(0.38))
            .transaction { $0.animation = nil }
    }
    private func previewText(_ value: String, height: CGFloat) -> some View {
        Color.clear.frame(height: height)
            .overlay(alignment: .leading) {
                ZStack(alignment: .leading) {
                    Text(value).lineLimit(1).id(value).transition(.opacity)
                }.animation(reduceMotion ? nil : .easeInOut(duration: 0.28), value: value)
            }
            .clipped()
    }
    private func statistic(_ title: String, _ value: String, _ caption: String) -> some View {
        VStack(spacing: 7) {
            Text(title).foregroundStyle(.white.opacity(0.5))
            Text(value.isEmpty ? "—" : value).foregroundStyle(.white)
            Text(caption).font(.system(size: 11)).foregroundStyle(.white.opacity(0.45))
        }.font(.custom(CWorldFonts.poppins(.semibold), size: 12)).frame(maxWidth: .infinity).frame(height: compact ? 64 : 88)
            .cworldLiquidGlass(in: RoundedRectangle(cornerRadius: 5), fallback: .white.opacity(0.06))
    }
    private func episodeTitle(_ episode: CWorldEpisode) -> String { EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: seasonNumber, episode: episode.number) ?? episode.title }
    private func code(_ episode: CWorldEpisode) -> String { String(format: "S%02dE%02d", seasonNumber, episode.number) }
    private func episodeCard(_ episode: CWorldEpisode) -> some View {
        let active = selectedEpisode == episode.number || hoveredEpisode == episode.number
        let saved = appModel.progress(for: episode.playbackRef.mediaId, season: seasonNumber, episode: episode.number)
        return Button {
            hoverTask?.cancel()
            withAnimation(animation) { hoveredEpisode = nil; selectedEpisode = episode.number }
        } label: {
            episodeTile(title: episodeTitle(episode), subtitle: "Episode \(episode.number) · \(episode.duration)",
                        image: MacDesktopCatalog.placeholder(media, season: seasonNumber, episode: episode.number), code: code(episode), selected: active,
                        fraction: min(1, (saved?.currentTime ?? 0) / max(1, saved?.duration ?? 1)))
        }.buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.025, pressedScale: 0.97, lift: 5))
            .accessibilityIdentifier("mac.episode.\(episode.number)")
            .onHover { hovering in
                hoverTask?.cancel()
                if hovering {
                    hoverTask = Task { @MainActor in
                        do { try await Task.sleep(for: .milliseconds(1500)) } catch { return }
                        guard !Task.isCancelled else { return }
                        withAnimation(.easeInOut(duration: 0.38)) { hoveredEpisode = episode.number }
                    }
                } else { withAnimation(.easeInOut(duration: 0.22)) { hoveredEpisode = nil } }
            }
    }
    private func episodeTile(title: String, subtitle: String, image: URL?, code: String, selected: Bool, fraction: Double) -> some View {
        MacEpisodeTile(title: title, subtitle: subtitle, image: image, code: code, selected: selected, fraction: fraction)
    }
}
#endif
