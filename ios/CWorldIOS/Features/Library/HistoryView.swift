import SwiftUI

struct WatchHistoryView: View {
    @EnvironmentObject private var appModel: AppModel
    @State private var recordToRemove: WatchHistoryRecord?

    private var entries: [HistoryEntry] {
        appModel.watchHistory.compactMap { record in
            guard let media = appModel.media(for: record.showID) else { return nil }
            return HistoryEntry(record: record, media: media)
        }
    }

    var body: some View {
        Group {
            if entries.isEmpty {
                ContentUnavailableView(
                    "No watch history",
                    systemImage: "clock.arrow.circlepath",
                    description: Text("Titles you play will appear here.")
                )
            } else {
                List(entries) { entry in
                    NavigationLink {
                        if let season = entry.record.season,
                           let episode = entry.record.episode,
                           let episodeData = entry.media.seasons?
                                .first(where: { $0.number == season })?.episodes
                                .first(where: { $0.number == episode }) {
                            NativeVideoPlayerView(
                                mediaID: entry.record.showID,
                                season: season,
                                episode: episode,
                                title: entry.playbackTitle,
                                subtitleURL: episodeData.subtitles.first,
                                skipIntroEnd: episodeData.skipIntroEnd,
                                skipOutroStart: episodeData.skipOutroStart
                            )
                        } else {
                            CWorldMediaLaunchDestination(media: entry.media)
                        }
                    } label: {
                        HistoryRow(entry: entry)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            recordToRemove = entry.record
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Watch History")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await appModel.refreshCatalog() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .accessibilityLabel("Refresh catalog")
            }
        }
        .confirmationDialog(
            "Remove from watch history?",
            isPresented: Binding(
                get: { recordToRemove != nil },
                set: { if !$0 { recordToRemove = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Remove", role: .destructive) {
                guard let record = recordToRemove else { return }
                recordToRemove = nil
                Task { await appModel.removeWatchHistory(record) }
            }
            Button("Cancel", role: .cancel) {
                recordToRemove = nil
            }
        }
    }
}

private struct HistoryEntry: Identifiable {
    let record: WatchHistoryRecord
    let media: CWorldMedia

    var id: Int { record.id }

    var playbackTitle: String {
        guard let season = record.season, let episode = record.episode else {
            return media.title
        }
        let episodeTitle = media.seasons?
            .first(where: { $0.number == season })?
            .episodes
            .first(where: { $0.number == episode })?
            .title
        return "S\(String(format: "%02d", season))E\(String(format: "%02d", episode)) · \(episodeTitle ?? media.title)"
    }
}

private struct HistoryRow: View {
    let entry: HistoryEntry

    var body: some View {
        HStack(spacing: 12) {
            CatalogImage(url: entry.media.artwork.poster ?? entry.media.artwork.preferredCard)
                .frame(width: 58, height: 82)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 5) {
                Text(entry.media.title)
                    .font(.headline)
                    .lineLimit(2)
                Text(entry.playbackTitle == entry.media.title ? "Movie" : entry.playbackTitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                if let date = ISO8601DateFormatter().date(from: entry.record.watchedAt) {
                    Text(date, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
