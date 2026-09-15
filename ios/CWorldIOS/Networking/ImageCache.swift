import CryptoKit
import Foundation
import ImageIO
import SwiftUI
import UIKit

/// Maps existing catalog SVG URLs to versioned, Retina-sized bundled exports.
/// Keeping this at the image boundary also covers cached catalogs and custom
/// profile backdrops without requiring a backend deployment.
enum MobileArtwork {
    struct Asset: Decodable {
        let image: String
        let thumbnail: String
        let width: Int
        let height: Int
        let thumbnailMaxPixelSize: Int
        let sourceSHA256: String
    }

    private struct Manifest: Decodable {
        let version: Int
        let assets: [String: Asset]
    }

    static let assets: [String: Asset] = {
        guard let url = Bundle.main.url(forResource: "manifest", withExtension: "json", subdirectory: "MobileArtwork"),
              let data = try? Data(contentsOf: url),
              let manifest = try? JSONDecoder().decode(Manifest.self, from: data),
              manifest.version == 1 else { return [:] }
        return manifest.assets
    }()

    static func bundledURL(for original: URL, maxPixelSize: Int? = nil) -> URL? {
        guard let asset = assets[original.absoluteString] else { return nil }
        let filename = maxPixelSize.map { $0 <= asset.thumbnailMaxPixelSize } == true
            ? asset.thumbnail : asset.image
        return Bundle.main.url(forResource: filename, withExtension: nil, subdirectory: "MobileArtwork")
    }
}

actor ImageCache {
    static let shared = ImageCache()

    private let fileManager: FileManager
    private let directoryURL: URL
    private let memoryCache = NSCache<NSString, UIImage>()
    private var inFlight: [URL: Task<Data?, Never>] = [:]

    private let maximumDiskBytes = 250 * 1024 * 1024
    private let maximumMemoryBytes = 128 * 1024 * 1024

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager

        let cachesURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        self.directoryURL = cachesURL.appendingPathComponent("CWorldImages", isDirectory: true)

        try? fileManager.createDirectory(at: self.directoryURL, withIntermediateDirectories: true)
        memoryCache.countLimit = 300
        memoryCache.totalCostLimit = maximumMemoryBytes
    }

    func image(for url: URL, maxPixelSize: Int? = nil) async -> UIImage? {
        let key = memoryKey(for: url, maxPixelSize: maxPixelSize)

        if let image = memoryCache.object(forKey: key) {
            return image
        }

        guard let data = await data(for: url),
              let image = decodeImage(data: data, maxPixelSize: maxPixelSize) else { return nil }
        storeInMemory(image, for: key)
        return image
    }

    func data(for url: URL) async -> Data? {
        if url.scheme == "data" { return Self.inlineImageData(from: url) }
        // Bundled exports already live on disk: avoid HTTP and a duplicate cache
        // copy. Decoding and file reads remain on this image actor.
        if url.isFileURL { return try? Data(contentsOf: url) }
        let diskURL = cacheURL(for: url)
        if let data = try? Data(contentsOf: diskURL) {
            touch(diskURL)
            return data
        }

        if let existingTask = inFlight[url] {
            return await existingTask.value
        }

        let task: Task<Data?, Never> = Task { [weak self] in
            guard let self else { return nil }
            return await self.downloadAndStore(url: url, diskURL: diskURL)
        }
        inFlight[url] = task

        let data = await task.value
        inFlight[url] = nil
        return data
    }

    func prefetchImages(_ urls: [URL]) async {
        let uniqueURLs = Array(Set(urls.filter {
            $0.pathExtension.lowercased() != "svg" && ["http", "https"].contains($0.scheme ?? "")
        }))
        // Warm encoded disk data only. Visible views choose their own decode size;
        // prefetch must not retain an extra full-resolution bitmap for each URL.
        await withTaskGroup(of: Void.self) { group in
            var nextIndex = 0
            for _ in 0..<min(4, uniqueURLs.count) {
                let url = uniqueURLs[nextIndex]
                nextIndex += 1
                group.addTask { _ = await self.data(for: url) }
            }
            while await group.next() != nil {
                guard !Task.isCancelled else {
                    group.cancelAll()
                    return
                }
                if nextIndex < uniqueURLs.count {
                    let url = uniqueURLs[nextIndex]
                    nextIndex += 1
                    group.addTask { _ = await self.data(for: url) }
                }
            }
        }
    }

    func clearMemory() {
        memoryCache.removeAllObjects()
    }

    func clearDisk() {
        try? fileManager.removeItem(at: directoryURL)
        try? fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
    }

    private func downloadAndStore(url: URL, diskURL: URL) async -> Data? {
        do {
            let request = URLRequest(url: url, cachePolicy: .useProtocolCachePolicy)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode) else {
                return nil
            }

            try? data.write(to: diskURL, options: [.atomic])
            trimDiskCacheIfNeeded()
            return data
        } catch {
            return nil
        }
    }

    private func storeInMemory(_ image: UIImage, for key: NSString) {
        let cost = Self.decodedMemoryCost(image)
        guard cost <= maximumMemoryBytes else { return }
        memoryCache.setObject(image, forKey: key, cost: cost)
    }

    nonisolated static func decodedMemoryCost(_ image: UIImage) -> Int {
        if let frames = image.images, !frames.isEmpty {
            return frames.reduce(0) { $0 + decodedMemoryCost($1) }
        }
        if let bitmap = image.cgImage {
            return max(bitmap.bytesPerRow * bitmap.height, 1)
        }
        let width = Int(ceil(image.size.width * image.scale))
        let height = Int(ceil(image.size.height * image.scale))
        return max(width * height * 4, 1)
    }

    nonisolated static func inlineImageData(from url: URL) -> Data? {
        let parts = url.absoluteString.split(separator: ",", maxSplits: 1)
        guard parts.count == 2, parts[0].lowercased().hasPrefix("data:image/"),
              parts[0].lowercased().hasSuffix(";base64") else { return nil }
        return Data(base64Encoded: String(parts[1]))
    }

    private func memoryKey(for url: URL, maxPixelSize: Int?) -> NSString {
        let suffix = maxPixelSize.map { "|maxPixels=\($0)" } ?? "|original"
        return "\(url.absoluteString)\(suffix)" as NSString
    }

    private func decodeImage(data: Data, maxPixelSize: Int?) -> UIImage? {
        guard let maxPixelSize,
              let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            return UIImage(data: data)
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: image)
    }

    private func cacheURL(for url: URL) -> URL {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        let filename = digest.map { String(format: "%02x", $0) }.joined()
        return directoryURL.appendingPathComponent(filename).appendingPathExtension("img")
    }

    private func touch(_ url: URL) {
        try? fileManager.setAttributes(
            [.modificationDate: Date()],
            ofItemAtPath: url.path
        )
    }

    private func trimDiskCacheIfNeeded() {
        guard let files = try? fileManager.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else {
            return
        }

        var entries: [(url: URL, size: Int, date: Date)] = []
        var totalBytes = 0

        for file in files {
            let values = try? file.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey])
            let size = values?.fileSize ?? 0
            let date = values?.contentModificationDate ?? .distantPast
            entries.append((file, size, date))
            totalBytes += size
        }

        guard totalBytes > maximumDiskBytes else { return }

        for entry in entries.sorted(by: { $0.date < $1.date }) {
            guard totalBytes > maximumDiskBytes else { break }
            try? fileManager.removeItem(at: entry.url)
            totalBytes -= entry.size
        }
    }
}

struct CachedCatalogImage: View {
    let url: URL
    let maxPixelSize: Int?

    @State private var image: UIImage?
    @State private var didFail = false

    init(url: URL, maxPixelSize: Int? = nil) {
        self.url = url
        self.maxPixelSize = maxPixelSize
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .transition(.opacity)
            } else if didFail {
                Color.gray.opacity(0.22)
            } else {
                CatalogImageSkeleton()
            }
        }
        .task(id: "\(url.absoluteString)|\(maxPixelSize.map(String.init) ?? "original")") {
            image = nil
            didFail = false
            let loadedImage = await ImageCache.shared.image(for: url, maxPixelSize: maxPixelSize)
            guard !Task.isCancelled else { return }
            image = loadedImage
            didFail = loadedImage == nil
        }
    }
}

struct CatalogImageSkeleton: View {
    @State private var shimmerOffset: CGFloat = -1.5

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Color.white.opacity(0.08)
                LinearGradient(
                    colors: [.clear, .white.opacity(0.18), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: max(proxy.size.width * 0.7, 80))
                .rotationEffect(.degrees(12))
                .offset(x: shimmerOffset * max(proxy.size.width, 1))
                .blendMode(.screen)
            }
            .clipped()
        }
        .task {
            shimmerOffset = -1.5
            withAnimation(.linear(duration: 1.1).repeatForever(autoreverses: false)) {
                shimmerOffset = 1.5
            }
        }
        .accessibilityHidden(true)
    }
}

struct CachedRemoteImage<Placeholder: View>: View {
    let url: URL
    let placeholder: Placeholder

    @State private var image: UIImage?
    @State private var isLoading = false

    init(url: URL, @ViewBuilder placeholder: () -> Placeholder) {
        self.url = url
        self.placeholder = placeholder()
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    placeholder
                    if isLoading {
                        ProgressView()
                    }
                }
            }
        }
        .task(id: url.absoluteString) {
            image = nil
            isLoading = true
            let loadedImage = await ImageCache.shared.image(for: url)
            guard !Task.isCancelled else { return }
            image = loadedImage
            isLoading = false
        }
    }
}
