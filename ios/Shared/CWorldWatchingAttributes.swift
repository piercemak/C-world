#if !targetEnvironment(macCatalyst)
import ActivityKit
import Foundation
import AppIntents
import UIKit

enum CWorldWatchingArtwork {
    static let groupID = "group.com.cearaworld.cworld"

    static func url(for filename: String) -> URL? {
        guard UUID(uuidString: String(filename.dropLast(4))) != nil, filename.hasSuffix(".jpg") else { return nil }
        return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?
            .appendingPathComponent("WatchingArtwork", isDirectory: true).appendingPathComponent(filename)
    }

    static func encodedImage(_ image: UIImage) -> Data? {
        let size = CGSize(width: 64, height: 44)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 3
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            let scale = max(size.width / max(1, image.size.width), size.height / max(1, image.size.height))
            let width = image.size.width * scale
            let height = image.size.height * scale
            image.draw(in: CGRect(x: (size.width - width) / 2, y: (size.height - height) / 2, width: width, height: height))
        }.jpegData(compressionQuality: 0.92)
    }

    static func store(_ image: UIImage) throws -> String {
        let filename = UUID().uuidString + ".jpg"
        guard let destination = url(for: filename), let data = encodedImage(image) else {
            throw CocoaError(.fileWriteUnknown)
        }
        let directory = destination.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        // Keep old images while the system may still be rendering a previous activity.
        let oldFiles = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        for file in oldFiles where url(for: file.lastPathComponent) != nil {
            if let date = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate,
               date < Date().addingTimeInterval(-7 * 24 * 60 * 60) {
                try? FileManager.default.removeItem(at: file)
            }
        }
        try data.write(to: destination, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        return filename
    }
}

struct CWorldWatchingAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var show: String
        var status: String
        var queued: Int
        var hasNext: Bool
        var elapsed: Double
        var duration: Double
        var playing: Bool
        var updatedAt: Date
        var thumbnail: Data?
        var artworkFilename: String? = nil
    }
    var sessionID: String
}

struct CWorldLivePlayPauseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Play or pause CearaWorld"
    @MainActor func perform() async throws -> some IntentResult {
        #if !CWORLD_WIDGET_EXTENSION
        CWorldPlaybackHost.shared.togglePlaybackFromRemote()
        #endif
        return .result()
    }
}

struct CWorldLiveNextIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Play next on CearaWorld"
    @MainActor func perform() async throws -> some IntentResult {
        #if !CWORLD_WIDGET_EXTENSION
        CWorldPlaybackHost.shared.skipNext?()
        #endif
        return .result()
    }
}
#endif
