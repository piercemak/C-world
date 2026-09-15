import Foundation

struct SubtitleCue: Identifiable, Equatable {
    let id: Int
    let start: TimeInterval
    let end: TimeInterval
    let text: String
}

enum SubtitleParser {
    nonisolated static func timestamp(_ value: String) -> TimeInterval? {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
        let parts = normalized.split(separator: ":", omittingEmptySubsequences: false)
        guard parts.count == 2 || parts.count == 3,
              let minutes = Double(parts[parts.count - 2]),
              let seconds = Double(parts[parts.count - 1]),
              minutes.isFinite, seconds.isFinite, minutes >= 0, minutes < 60,
              seconds >= 0, seconds < 60 else { return nil }
        let hours = parts.count == 3 ? Double(parts[0]) : 0
        guard let hours, hours.isFinite, hours >= 0 else { return nil }
        return hours * 3600 + minutes * 60 + seconds
    }

    nonisolated static func parse(_ source: String) -> [SubtitleCue] {
        let lines = source.replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n").replacingOccurrences(of: "\u{FEFF}", with: "")
            .components(separatedBy: "\n")
        var cues: [SubtitleCue] = []
        var index = 0
        while index < lines.count {
            let line = lines[index].trimmingCharacters(in: .whitespacesAndNewlines)
            if line == "NOTE" || line.hasPrefix("NOTE ") || line == "STYLE" || line == "REGION" {
                repeat { index += 1 } while index < lines.count && !lines[index].trimmingCharacters(in: .whitespaces).isEmpty
                continue
            }
            let timing = line.components(separatedBy: "-->")
            guard timing.count == 2,
                  let start = timestamp(timing[0]),
                  let endToken = timing[1].split(whereSeparator: \.isWhitespace).first,
                  let end = timestamp(String(endToken)), end > start else {
                index += 1
                continue
            }
            index += 1
            var text: [String] = []
            while index < lines.count {
                let next = lines[index].trimmingCharacters(in: .whitespacesAndNewlines)
                if next.isEmpty || next.contains("-->") { break }
                text.append(next)
                index += 1
            }
            let cleaned = text.joined(separator: "\n")
                .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
                .replacingOccurrences(of: "&nbsp;", with: " ")
                .replacingOccurrences(of: "&lt;", with: "<")
                .replacingOccurrences(of: "&gt;", with: ">")
                .replacingOccurrences(of: "&quot;", with: "\"")
                .replacingOccurrences(of: "&#39;", with: "'")
                .replacingOccurrences(of: "&amp;", with: "&")
            if !cleaned.isEmpty { cues.append(SubtitleCue(id: cues.count, start: start, end: end, text: cleaned)) }
        }
        return cues.sorted { $0.start == $1.start ? $0.id < $1.id : $0.start < $1.start }
    }
}

enum SubtitleLoadError: LocalizedError {
    case unavailable, noCaptions
    var errorDescription: String? {
        switch self {
        case .unavailable: return "Subtitles couldn't be downloaded."
        case .noCaptions: return "The subtitle file contains no readable captions."
        }
    }
}

enum SubtitleLoader {
    nonisolated static func load(_ url: URL, session: URLSession = .shared) async throws -> [SubtitleCue] {
        let (data, response) = try await session.data(from: url)
        try Task.checkCancellation()
        guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode) else {
            throw SubtitleLoadError.unavailable
        }
        guard let source = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .utf16) else {
            throw SubtitleLoadError.noCaptions
        }
        let cues = await Task.detached(priority: .userInitiated) { SubtitleParser.parse(source) }.value
        try Task.checkCancellation()
        guard !cues.isEmpty else { throw SubtitleLoadError.noCaptions }
        return cues
    }

}
