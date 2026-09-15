import Foundation

enum CWorldAPIError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case network
    case timeout
    case sessionUnavailable
    case httpStatus(Int, String)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Enter a valid CWorld API URL."
        case .invalidResponse:
            return "The CWorld API returned an invalid response."
        case .network:
            return "CWorld couldn’t connect. Check your internet connection and try again."
        case .timeout:
            return "CWorld took too long to respond. Check your connection and try again."
        case .sessionUnavailable:
            return "Reconnect to CWorld and select a profile to start playback."
        case let .httpStatus(code, message):
            return message.isEmpty ? "CWorld API request failed (HTTP \(code))." : message
        case let .decoding(error):
            return "CWorld returned data the app could not read: \(error.localizedDescription)"
        }
    }
}

private struct APIErrorResponse: Decodable {
    let error: String?
    let detail: String?
}

final class CWorldAPIClient {
    let baseURL: URL
    private(set) var token: String?
    var profileID: Int?
    private let session: URLSession

    init(baseURLString: String, token: String? = nil, session: URLSession = .shared) throws {
        let normalized = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: normalized), url.scheme != nil, url.host != nil else {
            throw CWorldAPIError.invalidBaseURL
        }
        baseURL = url
        self.token = token
        self.session = session
    }

    func setToken(_ token: String?) {
        self.token = token
    }

    func login(username: String, password: String) async throws -> LoginResponse {
        try await request(
            path: "/api/auth/login/",
            method: "POST",
            body: try JSONEncoder().encode(LoginRequest(username: username, password: password)),
            authenticated: false
        )
    }

    func startDeviceLogin() async throws -> DeviceLoginStart {
        try await request(
            path: "/api/auth/device/start/",
            method: "POST",
            authenticated: false
        )
    }

    func pollDeviceLogin(pollToken: String) async throws -> DeviceLoginPoll {
        struct Request: Encodable {
            let pollToken: String
        }
        return try await request(
            path: "/api/auth/device/poll/",
            method: "POST",
            body: try JSONEncoder().encode(Request(pollToken: pollToken)),
            authenticated: false
        )
    }

    func currentUser() async throws -> CWorldUserEnvelope {
        try await request(path: "/api/auth/me/", authenticated: true)
    }

    func profiles() async throws -> [CWorldProfile] {
        try await request(path: "/api/profiles/", authenticated: true)
    }

    func createProfile(name: String) async throws -> CWorldProfile {
        try await request(
            path: "/api/profiles/",
            method: "POST",
            body: try JSONEncoder().encode(CreateProfileRequest(name: name)),
            authenticated: true
        )
    }

    func catalog() async throws -> CatalogEnvelope {
        try await request(path: "/api/catalog/v1/", authenticated: false)
    }

    func signedURL(key: String, bucket: String = "all-shows") async throws -> URL {
        let encodedKey = key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? key
        let encodedBucket = bucket.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? bucket
        let response: SignedURLResponse = try await request(
            path: "/api/signed-url/?key=\(encodedKey)&bucket=\(encodedBucket)",
            authenticated: false
        )
        guard let url = URL(string: response.url) else {
            throw CWorldAPIError.invalidResponse
        }
        return url
    }

    func watchProgress() async throws -> [WatchProgressRecord] {
        try await request(path: "/api/progress/", authenticated: true)
    }

    func saveWatchProgress(_ payload: WatchProgressPayload) async throws -> WatchProgressRecord {
        try await request(
            path: "/api/progress/",
            method: "POST",
            body: try JSONEncoder().encode(payload),
            authenticated: true
        )
    }

    func watchHistory() async throws -> [WatchHistoryRecord] {
        try await request(path: "/api/history/", authenticated: true)
    }

    func deleteWatchHistory(showID: String, season: Int? = nil, episode: Int? = nil) async throws {
        struct Request: Encodable {
            let showID: String
            let season: Int?
            let episode: Int?

            enum CodingKeys: String, CodingKey {
                case showID = "show_id"
                case season, episode
            }
        }

        let _: EmptyResponse = try await request(
            path: "/api/history/",
            method: "DELETE",
            body: try JSONEncoder().encode(Request(showID: showID, season: season, episode: episode)),
            authenticated: true
        )
    }

    func saveWatchHistory(showID: String, season: Int? = nil, episode: Int? = nil) async throws -> WatchHistoryRecord {
        struct Request: Encodable {
            let showID: String
            let season: Int?
            let episode: Int?

            enum CodingKeys: String, CodingKey {
                case showID = "show_id"
                case season, episode
            }
        }

        return try await request(
            path: "/api/history/",
            method: "POST",
            body: try JSONEncoder().encode(Request(showID: showID, season: season, episode: episode)),
            authenticated: true
        )
    }

    func playbackSession(mediaID: String, season: Int? = nil, episode: Int? = nil) async throws -> PlaybackSession {
        struct Request: Encodable {
            let mediaId: String
            let season: Int?
            let episode: Int?
        }
        return try await request(
            path: "/api/playback/session/",
            method: "POST",
            body: try JSONEncoder().encode(Request(mediaId: mediaID, season: season, episode: episode)),
            authenticated: true
        )
    }

    func updateProfile(_ profileID: Int, update: ProfileUpdate) async throws -> CWorldProfile {
        try await request(
            path: "/api/profiles/\(profileID)/",
            method: "PATCH",
            body: try JSONEncoder().encode(update),
            authenticated: true
        )
    }

    func deleteProfile(_ profileID: Int) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/profiles/\(profileID)/",
            method: "DELETE",
            authenticated: true
        )
    }

    func sendMediaRequest(_ text: String, language: String) async throws -> Bool {
        struct Payload: Encodable { let mediaRequest: String; let languageSubs: String }
        struct Response: Decodable { let success: Bool }
        let response: Response = try await request(path: "/api/send-request/", method: "POST",
            body: try JSONEncoder().encode(Payload(mediaRequest: text, languageSubs: language)), authenticated: true)
        return response.success
    }

    private func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        authenticated: Bool = false
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw CWorldAPIError.invalidBaseURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        if authenticated, let token {
            request.setValue("Token \(token)", forHTTPHeaderField: "Authorization")
            if let profileID {
                request.setValue(String(profileID), forHTTPHeaderField: "X-Profile-Id")
            }
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            if error.code == .timedOut {
                throw CWorldAPIError.timeout
            }
            throw CWorldAPIError.network
        } catch {
            throw CWorldAPIError.network
        }
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CWorldAPIError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorResponse.self, from: data)).flatMap {
                $0.error ?? $0.detail
            } ?? ""
            throw CWorldAPIError.httpStatus(httpResponse.statusCode, message)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw CWorldAPIError.decoding(error)
        }
    }
}

struct CWorldUserEnvelope: Decodable {
    let user: CWorldUser
}

private struct EmptyResponse: Decodable {}

private struct SignedURLResponse: Decodable {
    let url: String
}
