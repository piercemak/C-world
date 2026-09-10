import CryptoKit
import Foundation
import ImageIO
import SwiftUI
import UIKit

actor ImageCache {
    static let shared = ImageCache()

    private let fileManager: FileManager
    private let directoryURL: URL
    private let memoryCache = NSCache<NSString, UIImage>()
    private var inFlight: [URL: Task<Data?, Never>] = [:]

    private let maximumDiskBytes = 250 * 1024 * 1024

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager

        let cachesURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        self.directoryURL = cachesURL.appendingPathComponent("CWorldImages", isDirectory: true)

        try? fileManager.createDirectory(at: self.directoryURL, withIntermediateDirectories: true)
        memoryCache.countLimit = 300
        memoryCache.totalCostLimit = 128 * 1024 * 1024
    }

    func image(for url: URL, maxPixelSize: Int? = nil) async -> UIImage? {
        let key = memoryKey(for: url, maxPixelSize: maxPixelSize)

        if let image = memoryCache.object(forKey: key) {
            return image
        }

        guard let data = await data(for: url),
              let image = decodeImage(data: data, maxPixelSize: maxPixelSize) else { return nil }
        storeInMemory(image, for: key, dataSize: data.count)
        return image
    }

    func data(for url: URL) async -> Data? {
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
        let uniqueURLs = Array(Set(urls.filter { $0.pathExtension.lowercased() != "svg" }))
        await withTaskGroup(of: Void.self) { group in
            for url in uniqueURLs {
                group.addTask {
                    _ = await self.image(for: url)
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

    private func storeInMemory(_ image: UIImage, for key: NSString, dataSize: Int) {
        memoryCache.setObject(image, forKey: key, cost: max(dataSize, 1))
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
        .task(id: url.absoluteString) {
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
