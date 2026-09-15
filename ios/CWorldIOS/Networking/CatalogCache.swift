import Foundation

final class CatalogCache {
    private let fileURL: URL

    init(fileManager: FileManager = .default, directory: URL? = nil) {
        let baseURL = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        let directory = directory ?? baseURL.appendingPathComponent("CWorld", isDirectory: true)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        fileURL = directory.appendingPathComponent("catalog-v1.json")
    }

    func load() -> CatalogEnvelope? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return try? JSONDecoder().decode(CatalogEnvelope.self, from: data)
    }

    func save(_ catalog: CatalogEnvelope) {
        guard let data = try? JSONEncoder().encode(catalog) else { return }
        try? data.write(to: fileURL, options: [.atomic])
    }

    func clear() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}
