import SwiftUI
import WebKit
import UIKit

enum LibraryFilter: String, CaseIterable, Identifiable {
    case all = "All Titles"
    case movies = "Movies"
    case shows = "Shows"

    var id: String { rawValue }
}

struct LibraryView: View {
    @EnvironmentObject private var appModel: AppModel
    @State private var filter: LibraryFilter = .all
    @State private var searchText = ""
    @State private var showingProfiles = false

    private var filteredItems: [CWorldMedia] {
        appModel.catalog.filter { item in
            let matchesFilter = filter == .all
                || (filter == .movies && item.type == "movie")
                || (filter == .shows && item.type == "show")
            let matchesSearch = searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                || item.title.localizedCaseInsensitiveContains(searchText)
            return matchesFilter && matchesSearch
        }
    }

    private var continueWatching: [ContinueWatchingEntry] {
        let records = appModel.watchProgress.values
            .sorted { $0.updatedAt > $1.updatedAt }

        var seenMediaIDs = Set<String>()
        var entries: [ContinueWatchingEntry] = []

        for record in records {
            guard let media = appModel.media(for: record.showID), seenMediaIDs.insert(media.id).inserted else {
                continue
            }
            guard record.duration > 0, record.currentTime > 5, record.currentTime < record.duration - 30 else { continue }
                let episodeTitle = media.seasons?
                    .first(where: { $0.number == record.season })?
                    .episodes
                    .first(where: { $0.number == record.episode })?
                    .title
            entries.append(ContinueWatchingEntry(media: media, progress: record, episodeTitle: episodeTitle))
        }

        return Array(entries.prefix(10))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if !continueWatching.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Continue Watching")
                                .cworldRoundedFont(24, weight: .bold)
                                .foregroundStyle(.white)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(continueWatching) { entry in
                                        NavigationLink {
                                            NativeVideoPlayerView(
                                                mediaID: entry.media.id,
                                                season: entry.progress.season,
                                                episode: entry.progress.episode,
                                                title: entry.playerTitle,
                                                subtitleURL: entry.episodeData?.subtitles.first ?? entry.media.subtitleTracks.first,
                                                skipIntroEnd: entry.episodeData?.skipIntroEnd,
                                                skipOutroStart: entry.episodeData?.skipOutroStart
                                            )
                                        } label: {
                                            ContinueWatchingCard(entry: entry)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }

                    Picker("Library filter", selection: $filter) {
                        ForEach(LibraryFilter.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                    .tint(CWorldTheme.accent)

                    HStack {
                        Text("\(filteredItems.count) title\(filteredItems.count == 1 ? "" : "s")")
                            .cworldRoundedFont(14, weight: .semibold)
                            .foregroundStyle(CWorldTheme.secondaryText)
                        Spacer()
                        if appModel.isCatalogFromCache {
                            Label("Cached", systemImage: "clock.arrow.circlepath")
                                .cworldRoundedFont(12)
                            .foregroundStyle(.secondary)
                        }
                    }

                    if let errorMessage = appModel.errorMessage {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Label("CWorld connection problem", systemImage: "exclamationmark.triangle")
                                    .cworldRoundedFont(17, weight: .semibold)
                                Spacer()
                                Button {
                                    appModel.dismissError()
                                } label: {
                                    Image(systemName: "xmark")
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel("Dismiss error")
                            }
                            Text(errorMessage)
                                .cworldRoundedFont(14)
                                .foregroundStyle(.secondary)
                            Button("Try Again") {
                                Task { await appModel.refreshCatalog() }
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 12))
                    }

                    if filteredItems.isEmpty {
                        ContentUnavailableView(
                            searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "No titles" : "No matches",
                            systemImage: "film.stack",
                            description: Text(searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "The CWorld catalog is empty." : "Try a different title.")
                        )
                    } else {
                        LazyVGrid(
                            columns: [GridItem(.adaptive(minimum: 148), spacing: 14)],
                            spacing: 18
                        ) {
                            ForEach(filteredItems) { media in
                                NavigationLink {
                                    CWorldMediaLaunchDestination(media: media)
                                } label: {
                                    MediaCard(media: media)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
            }
            .background(CWorldTheme.background.ignoresSafeArea())
            .navigationTitle("All Titles")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Search movies and shows")
            .refreshable {
                await appModel.refreshCatalog()
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Profiles") { showingProfiles = true }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    NavigationLink {
                        WatchHistoryView()
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                    }
                    .accessibilityLabel("Watch history")

                    Button {
                        Task { await appModel.refreshCatalog() }
                    } label: {
                        if appModel.isRefreshingCatalog {
                            ProgressView()
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .disabled(appModel.isRefreshingCatalog)
                    .accessibilityLabel("Refresh catalog")
                }
            }
            .sheet(isPresented: $showingProfiles) {
                ProfilePickerView()
            }
        }
    }
}

private struct ContinueWatchingEntry: Identifiable {
    let media: CWorldMedia
    let progress: WatchProgressRecord
    let episodeTitle: String?

    var id: Int { progress.id }

    var playerTitle: String {
        guard let season = progress.season, let episode = progress.episode else {
            return media.title
        }
        return "S\(String(format: "%02d", season))E\(String(format: "%02d", episode)) · \(episodeTitle ?? media.title)"
    }

    var episodeData: CWorldEpisode? {
        guard let season = progress.season, let episode = progress.episode else { return nil }
        return media.seasons?
            .first(where: { $0.number == season })?.episodes
            .first(where: { $0.number == episode })
    }

    var progressFraction: Double {
        guard progress.duration > 0 else { return 0 }
        return min(max(progress.currentTime / progress.duration, 0), 1)
    }
}

private struct ContinueWatchingCard: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            CatalogImage(url: entry.media.artwork.poster ?? entry.media.artwork.preferredCard)
                .frame(width: 116, height: 164)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(alignment: .bottom) {
                    ProgressView(value: entry.progressFraction)
                        .tint(.accentColor)
                        .padding(.horizontal, 8)
                        .padding(.bottom, 8)
                }

            Text(entry.media.title)
                .cworldRoundedFont(14, weight: .semibold)
                .foregroundStyle(.white)
                .lineLimit(1)
                .frame(width: 116, alignment: .leading)

            Text(entry.episodeTitle ?? "Resume movie")
                .cworldRoundedFont(12)
                .foregroundStyle(CWorldTheme.secondaryText)
                .lineLimit(1)
                .frame(width: 116, alignment: .leading)
        }
    }
}

private struct MediaCard: View {
    let media: CWorldMedia

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            CatalogImage(url: media.artwork.poster ?? media.artwork.preferredCard)
                .aspectRatio(2 / 3, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(alignment: .bottomLeading) {
                    Text(media.type == "show" ? "SHOW" : "MOVIE")
                        .cworldRoundedFont(11, weight: .bold)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(.black.opacity(0.72), in: Capsule())
                        .padding(8)
                }

            Text(media.title)
                .cworldRoundedFont(17, weight: .semibold)
                .foregroundStyle(.white)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            Text(media.metadata.year.isEmpty ? media.type.capitalized : media.metadata.year)
                .cworldRoundedFont(12)
                .foregroundStyle(CWorldTheme.secondaryText)
        }
        .padding(8)
        .cworldGlass(cornerRadius: 16, fill: Color.white.opacity(0.05))
    }
}

struct CatalogImage: View {
    let url: URL?
    var showsBorder = true
    var maxPixelSize: Int? = nil

    var body: some View {
        Group {
            if let url {
                if let nativeURL = MobileArtwork.bundledURL(for: url, maxPixelSize: maxPixelSize) {
                    CachedCatalogImage(url: nativeURL, maxPixelSize: maxPixelSize)
                } else if let image = dataImage(from: url) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else if url.pathExtension.lowercased() == "svg" {
                    ZStack {
                        CatalogImageSkeleton()
                        RemoteSVGImage(url: url)
                    }
                } else {
                    CachedCatalogImage(url: url, maxPixelSize: maxPixelSize)
                }
            } else {
                placeholder
            }
        }
        .frame(maxWidth: .infinity)
        .background(Color.gray.opacity(0.18))
        .overlay {
            if showsBorder {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(CWorldTheme.cardBorder, lineWidth: 1)
            }
        }
        .clipped()
    }

    private var placeholder: some View {
        Color.gray.opacity(0.22)
    }

    private func dataImage(from url: URL) -> UIImage? {
        guard url.scheme == "data",
              let encodedData = url.absoluteString.split(separator: ",", maxSplits: 1).last,
              let data = Data(base64Encoded: String(encodedData)) else { return nil }
        return UIImage(data: data)
    }
}

struct FullScreenCatalogBackdrop: View {
    let url: URL?

    var body: some View {
        GeometryReader { proxy in
            let insets = proxy.safeAreaInsets

            CatalogImage(url: url, showsBorder: false)
                .frame(
                    width: proxy.size.width + insets.leading + insets.trailing,
                    height: proxy.size.height + insets.top + insets.bottom
                )
                .offset(x: -insets.leading, y: -insets.top)
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
    }
}

struct RemoteSVGImage: UIViewRepresentable {
    let url: URL

    final class Coordinator {
        var loadedURL: URL?
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
        webView.isUserInteractionEnabled = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        loadImage(in: webView)
        context.coordinator.loadedURL = url
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.loadedURL != url else { return }
        loadImage(in: webView)
        context.coordinator.loadedURL = url
    }

    private func loadImage(in webView: WKWebView) {
        let escapedURL = url.absoluteString.replacingOccurrences(of: "&", with: "&amp;")
        let html = """
        <!doctype html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
            <style>
              html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
              img { display: block; position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; }
            </style>
          </head>
          <body><img src="\(escapedURL)"></body>
        </html>
        """
        webView.loadHTMLString(html, baseURL: url.deletingLastPathComponent())
    }
}
