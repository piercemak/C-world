import ActivityKit
import WidgetKit
import SwiftUI
import UIKit

@main
struct CWorldWatchingWidgetBundle: WidgetBundle {
    var body: some Widget { CWorldWatchingWidget() }
}

struct CWorldWatchingWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CWorldWatchingAttributes.self) { context in
            HStack(spacing: 12) {
                artwork(context.state).frame(width: 64, height: 44).clipShape(RoundedRectangle(cornerRadius: 8))
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.show).font(.headline).lineLimit(1)
                    Text(context.state.title).font(.caption).lineLimit(1)
                    Text(context.isStale ? "Open CearaWorld to refresh" : "\(context.state.status) · \(context.state.playing ? "Playing" : "Paused") · \(context.state.queued) up next")
                        .font(.caption2).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                Button(intent: CWorldLivePlayPauseIntent()) {
                    Image(systemName: context.state.playing ? "pause.fill" : "play.fill")
                }.buttonStyle(.plain).accessibilityLabel(context.state.playing ? "Pause" : "Play")
                Link(destination: URL(string: "cearaworld://remote")!) { Image(systemName: "appletvremote.gen4.fill").font(.title2) }.accessibilityLabel("Open TV remote")
            }.padding(16)
                .safeAreaInset(edge: .bottom, spacing: 0) { if !context.isStale { progress(context.state).padding(.horizontal, 16).padding(.bottom, 10) } }
                .activityBackgroundTint(.black.opacity(0.9)).activitySystemActionForegroundColor(.mint)
                .foregroundStyle(.white).widgetURL(URL(string: "cearaworld://remote"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { artwork(context.state).frame(width: 60, height: 40).clipShape(RoundedRectangle(cornerRadius: 6)) }
                DynamicIslandExpandedRegion(.trailing) { Image(systemName: context.state.playing ? "play.fill" : "pause.fill").foregroundStyle(.mint) }
                DynamicIslandExpandedRegion(.center) { Text(context.state.show).font(.headline).lineLimit(1) }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.state.title).font(.caption).lineLimit(1)
                        if !context.isStale { progress(context.state) }
                        HStack {
                            Text(context.isStale ? "Open app to refresh" : context.state.status).foregroundStyle(.secondary)
                            Spacer()
                            Button(intent: CWorldLivePlayPauseIntent()) { Image(systemName: context.state.playing ? "pause.fill" : "play.fill") }.buttonStyle(.plain)
                            Button(intent: CWorldLiveNextIntent()) { Image(systemName: "forward.end.fill") }.buttonStyle(.plain).disabled(!context.state.hasNext).accessibilityLabel("Play next")
                            Link("TV Remote", destination: URL(string: "cearaworld://remote")!).foregroundStyle(.mint)
                        }.font(.caption)
                    }
                }
            } compactLeading: {
                Image(systemName: "tv.fill").foregroundStyle(.mint)
            } compactTrailing: {
                Image(systemName: context.state.playing ? "play.fill" : "pause.fill").font(.caption)
            } minimal: {
                Image(systemName: "tv.fill").foregroundStyle(.mint)
            }.widgetURL(URL(string: "cearaworld://remote"))
        }
    }
    @ViewBuilder private func progress(_ state: CWorldWatchingAttributes.ContentState) -> some View {
        if state.duration > 0 {
            if state.playing {
                let start = state.updatedAt.addingTimeInterval(-state.elapsed)
                ProgressView(timerInterval: start...start.addingTimeInterval(state.duration), countsDown: false)
                    .labelsHidden().tint(.mint)
            } else {
                ProgressView(value: min(state.elapsed, state.duration), total: state.duration).tint(.mint)
            }
        }
    }
    @ViewBuilder private func artwork(_ state: CWorldWatchingAttributes.ContentState) -> some View {
        if let filename = state.artworkFilename, let url = CWorldWatchingArtwork.url(for: filename),
           let data = try? Data(contentsOf: url), let image = UIImage(data: data, scale: 3) {
            Image(uiImage: image).resizable().interpolation(.high).scaledToFill()
        } else if let data = state.thumbnail, let image = UIImage(data: data) {
            Image(uiImage: image).resizable().interpolation(.high).scaledToFill()
        } else { Image(systemName: "tv.fill").resizable().scaledToFit().foregroundStyle(.mint).padding(6) }
    }
}
