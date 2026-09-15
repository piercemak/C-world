import Foundation

enum EpisodeTitleCatalog {
    private static let titles: [String: [String: [String]]] = {
        guard let url = Bundle.main.url(forResource: "episodeTitles", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([String: [String: [String]]].self, from: data) else {
            return [:]
        }
        return decoded
    }()

    static func displayTitle(mediaID: String, season: Int, episode: Int) -> String? {
        let cleanID = mediaID.replacingOccurrences(of: "-", with: "")
        let rawTitle = titles[mediaID]?[String(season)]?[safe: episode - 1]
            ?? titles[cleanID]?[String(season)]?[safe: episode - 1]

        guard let rawTitle, !rawTitle.isEmpty else { return nil }
        return rawTitle
            .replacingOccurrences(of: "_", with: " ")
            .split(whereSeparator: \.isWhitespace)
            .map { word in
                guard let first = word.first else { return String(word) }
                return String(first).uppercased() + String(word.dropFirst())
            }
            .joined(separator: " ")
    }
}

private extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
