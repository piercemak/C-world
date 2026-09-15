import Foundation
import Combine

@MainActor
final class AppModel: ObservableObject {
    private let keychain: any TokenStore
    private let catalogCache: CatalogCache
    private let defaults: UserDefaults
    private let session: URLSession
    private var client: CWorldAPIClient?
    private var sessionValidationTask: Task<Bool, Never>?
    private var hasValidatedSession = false
    private var progressRequest: (id: UUID, client: CWorldAPIClient, profileID: Int, versions: [String: UUID], pendingKeys: Set<String>, task: Task<[WatchProgressRecord]?, Never>)?
    private var progressVersions: [String: UUID] = [:]
    private var progressWrites: [String: (id: UUID, clearing: Bool, task: Task<Result<WatchProgressRecord, Error>, Never>)] = [:]
    private var loadedProgressProfileID: Int?

    @Published var apiBaseURL: String {
        didSet {
            defaults.set(apiBaseURL, forKey: Self.apiBaseURLKey)
            rebuildClient()
        }
    }
    @Published private(set) var token: String?
    @Published private(set) var user: CWorldUser?
    @Published private(set) var profiles: [CWorldProfile] = []
    @Published private(set) var activeProfile: CWorldProfile?
    @Published private(set) var catalog: [CWorldMedia] = []
    @Published private(set) var catalogRevision = ""
    @Published private(set) var catalogGeneratedAt = ""
    @Published private(set) var isCatalogFromCache = false
    @Published private(set) var watchProgress: [String: WatchProgressRecord] = [:]
    @Published private(set) var watchHistory: [WatchHistoryRecord] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isRefreshingCatalog = false
    @Published private(set) var isRestoringSession = false
    @Published private(set) var isShowingHomeIntro = false
    @Published var errorMessage: String?

    static let apiBaseURLKey = "cworld.apiBaseURL"
    static let activeProfileIDKey = "cworld.activeProfileID"
    private static let cachedUserKey = "cworld.cachedUser"
    private static let defaultAPIBaseURL = "https://c-world.onrender.com"

    init(
        defaults: UserDefaults = .standard,
        keychain: (any TokenStore)? = nil,
        catalogCache: CatalogCache? = nil,
        session: URLSession = .shared
    ) {
        self.defaults = defaults
        self.keychain = keychain ?? KeychainStore()
        self.catalogCache = catalogCache ?? CatalogCache()
        self.session = session
        apiBaseURL = defaults.string(forKey: Self.apiBaseURLKey) ?? Self.defaultAPIBaseURL
        token = self.keychain.readToken()
        isRestoringSession = token != nil
        if let data = defaults.data(forKey: Self.cachedUserKey),
           let cachedUser = try? JSONDecoder().decode(CWorldUser.self, from: data) {
            user = cachedUser
        }
        if let cachedCatalog = self.catalogCache.load() {
            catalog = cachedCatalog.items
            catalogRevision = cachedCatalog.catalogRevision
            catalogGeneratedAt = cachedCatalog.generatedAt
            isCatalogFromCache = true
        }
        rebuildClient()
    }

    var isAuthenticated: Bool { token != nil && user != nil }
    var canBrowseCachedCatalog: Bool { isAuthenticated && !catalog.isEmpty }
    var needsProfileSelection: Bool { isAuthenticated && activeProfile == nil && !profiles.isEmpty }

    func restoreSession() async {
        guard token != nil, sessionValidationTask == nil, !hasValidatedSession else { return }
        guard let client else {
            isRestoringSession = false
            errorMessage = CWorldAPIError.invalidBaseURL.localizedDescription
            return
        }
        isLoading = true
        isRestoringSession = true
        errorMessage = nil
        let validation = Task { @MainActor in
            defer {
                if self.client === client {
                    self.isLoading = false
                    self.isRestoringSession = false
                }
            }
            do {
                async let account = client.currentUser()
                async let profileList = client.profiles()
                let (envelope, profiles) = try await (account, profileList)
                try Task.checkCancellation()
                guard self.client === client else { return false }
                self.user = envelope.user
                self.cacheUser(envelope.user)
                self.applyProfiles(profiles, using: client)
                self.hasValidatedSession = true
                return true
            } catch {
                guard self.client === client, !Task.isCancelled else { return false }
                if self.isAuthenticationFailure(error) {
                    self.clearSession()
                    self.errorMessage = "Your CWorld session expired. Please sign in again."
                } else {
                    self.errorMessage = "Couldn’t reconnect to CWorld. You can browse saved titles and try connecting again."
                }
                return false
            }
        }
        sessionValidationTask = validation

        // Public catalog refresh does not depend on account/profile requests.
        async let catalogRefresh: Void = refreshCatalog(using: client)
        let validated = await validation.value
        if self.client === client { sessionValidationTask = nil }
        if validated, self.client === client {
            await syncWatchData(using: client)
        }
        await catalogRefresh
    }

    func login(username: String, password: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            rebuildClient()
            guard let client else { throw CWorldAPIError.invalidBaseURL }
            let response = try await client.login(username: username, password: password)
            try keychain.saveToken(response.token)
            token = response.token
            user = response.user
            cacheUser(response.user)
            client.setToken(response.token)
            try await loadProfiles(using: client)
            async let watchSync: Void = syncWatchData(using: client)
            do {
                try await loadCatalog(using: client)
            } catch {
                errorMessage = "Signed in. Catalog refresh failed: \(error.localizedDescription)"
            }
            await watchSync
        } catch {
            clearSession(keepError: true)
            errorMessage = error.localizedDescription
        }
    }

    func beginDeviceLogin() async throws -> DeviceLoginStart {
        rebuildClient()
        guard let client else { throw CWorldAPIError.invalidBaseURL }
        return try await client.startDeviceLogin()
    }

    func pollDeviceLogin(pollToken: String) async throws -> DeviceLoginPoll {
        rebuildClient()
        guard let client else { throw CWorldAPIError.invalidBaseURL }
        return try await client.pollDeviceLogin(pollToken: pollToken)
    }

    func completeDeviceLogin(_ response: DeviceLoginPoll) async {
        guard let token = response.token, let user = response.user else {
            errorMessage = response.error ?? "Device login has not been approved yet."
            return
        }

        do {
            try keychain.saveToken(token)
            self.token = token
            self.user = user
            cacheUser(user)
            rebuildClient()
            guard let client else { throw CWorldAPIError.invalidBaseURL }
            try await loadProfiles(using: client)
            async let watchSync: Void = syncWatchData(using: client)
            do {
                try await loadCatalog(using: client)
            } catch {
                errorMessage = "Signed in. Catalog refresh failed: \(error.localizedDescription)"
            }
            await watchSync
        } catch {
            clearSession(keepError: true)
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        clearSession()
    }

    func selectProfile(_ profile: CWorldProfile, startHomeIntro: Bool = false) async {
        guard isAuthenticated, profiles.contains(where: { $0.id == profile.id }) else { return }
        activeProfile = profile
        loadedProgressProfileID = nil
        progressVersions = [:]
        watchProgress = [:]
        watchHistory = []
        client?.profileID = profile.id
        defaults.set(profile.id, forKey: Self.activeProfileIDKey)
        // Commit the selection before the root is allowed to present the intro.
        isShowingHomeIntro = startHomeIntro
        if let client {
            await syncWatchData(using: client)
        }
    }

    func finishHomeIntro() {
        isShowingHomeIntro = false
    }

    func signedMediaURL(key: String) async -> URL? {
        guard let client else { return nil }
        return try? await client.signedURL(key: key)
    }

    @discardableResult
    func updateProfileAvatar(_ profile: CWorldProfile, dataURL: String) async -> Bool {
        guard let client else {
            errorMessage = "Reconnect before changing your profile photo."
            return false
        }
        errorMessage = nil
        do {
            let updated = try await client.updateProfile(
                profile.id,
                update: ProfileUpdate(avatarURL: dataURL)
            )
            guard self.client === client, !Task.isCancelled else { return false }
            profiles = profiles.map { $0.id == updated.id ? updated : $0 }
            if activeProfile?.id == updated.id {
                self.activeProfile = updated
            }
            return true
        } catch {
            guard self.client === client, !Task.isCancelled else { return false }
            errorMessage = error.localizedDescription
            return false
        }
    }

    @discardableResult
    func updateArchiveBackdrop(_ value: String) async -> Bool {
        guard let client, let activeProfile else { return false }
        do {
            let updated = try await client.updateProfile(
                activeProfile.id,
                update: ProfileUpdate(archiveBackdrop: value)
            )
            guard self.client === client, !Task.isCancelled else { return false }
            profiles = profiles.map { $0.id == updated.id ? updated : $0 }
            if self.activeProfile?.id == updated.id { self.activeProfile = updated }
            return true
        } catch {
            guard self.client === client else { return false }
            errorMessage = error.localizedDescription
            return false
        }
    }

    @discardableResult
    func updateProfileName(_ name: String) async -> Bool {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, let client, let profile = activeProfile else { return false }
        errorMessage = nil
        do {
            let updated = try await client.updateProfile(profile.id, update: ProfileUpdate(name: name))
            guard self.client === client, activeProfile?.id == profile.id, !Task.isCancelled else { return false }
            profiles = profiles.map { $0.id == updated.id ? updated : $0 }; activeProfile = updated
            return true
        } catch {
            guard self.client === client, activeProfile?.id == profile.id else { return false }
            errorMessage = error.localizedDescription; return false
        }
    }

    func sendMediaRequest(_ text: String, language: String) async -> Bool {
        guard let client, isAuthenticated else { errorMessage = "Sign in before sending a request."; return false }
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return false }
        errorMessage = nil
        do {
            let sent = try await client.sendMediaRequest(text, language: language)
            guard self.client === client, !Task.isCancelled else { return false }
            if !sent { errorMessage = "The request could not be sent. Please try again." }
            return sent
        } catch {
            guard self.client === client else { return false }
            errorMessage = error.localizedDescription; return false
        }
    }

    func createProfile(name: String) async {
        guard let client else { return }
        do {
            let created = try await client.createProfile(name: name)
            profiles.append(created)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteProfile(_ profile: CWorldProfile) async {
        guard let client else { return }
        do {
            try await client.deleteProfile(profile.id)
            profiles.removeAll { $0.id == profile.id }
            if activeProfile?.id == profile.id {
                activeProfile = profiles.count == 1 ? profiles.first : nil
                if let activeProfile {
                    await selectProfile(activeProfile)
                } else {
                    defaults.removeObject(forKey: Self.activeProfileIDKey)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshCatalog() async {
        guard let client else { return }
        await refreshCatalog(using: client)
    }

    private func refreshCatalog(using client: CWorldAPIClient) async {
        guard self.client === client, !isRefreshingCatalog else { return }
        isRefreshingCatalog = true
        defer { if self.client === client { isRefreshingCatalog = false } }
        do {
            try await loadCatalog(using: client)
        } catch {
            guard self.client === client, !Task.isCancelled else { return }
            errorMessage = error.localizedDescription
        }
    }

    func dismissError() {
        errorMessage = nil
    }

    func refreshSharedWatchData() async {
        guard let client, isAuthenticated, activeProfile != nil else { return }
        await syncWatchData(using: client)
    }

    func retryConnection() async {
        errorMessage = nil
        if hasValidatedSession {
            await refreshCatalog()
        } else {
            await restoreSession()
        }
    }

    func requestPlaybackSession(
        mediaID: String,
        season: Int? = nil,
        episode: Int? = nil
    ) async throws -> PlaybackSession {
        let requestingClient = client
        if let sessionValidationTask {
            _ = await sessionValidationTask.value
        }
        try Task.checkCancellation()
        guard hasValidatedSession, activeProfile != nil else {
            throw CWorldAPIError.sessionUnavailable
        }
        guard let client else { throw CWorldAPIError.invalidBaseURL }
        guard client === requestingClient else { throw CancellationError() }
        let profileID = activeProfile?.id
        // Browsing can begin before watch data arrives, but resume playback must
        // wait for progress (not unrelated history) before choosing its position.
        async let progress: Void = ensurePlaybackProgress(using: client)
        let playback = try await client.playbackSession(
            mediaID: mediaID,
            season: season,
            episode: episode
        )
        await progress
        try Task.checkCancellation()
        guard self.client === client, activeProfile?.id == profileID else { throw CancellationError() }
        return playback
    }

    func progress(for showID: String, season: Int? = nil, episode: Int? = nil) -> WatchProgressRecord? {
        watchProgress[progressKey(showID: showID, season: season, episode: episode)]
    }

    func saveWatchProgress(
        showID: String,
        season: Int? = nil,
        episode: Int? = nil,
        currentTime: Double,
        duration: Double
    ) async {
        guard duration.isFinite, currentTime.isFinite, duration > 0, currentTime >= 0 else { return }
        let payload = WatchProgressPayload(
            showId: showID,
            season: season,
            episode: episode,
            currentTime: currentTime,
            duration: duration
        )
        _ = await persistWatchProgress(payload, clearing: false)
    }

    @discardableResult
    func clearWatchProgress(showID: String, season: Int? = nil, episode: Int? = nil, duration: Double = 0) async -> Bool {
        guard let profileID = activeProfile?.id else { return false }
        let key = progressKey(showID: showID, season: season, episode: episode)
        if let pending = progressWrites["\(profileID):\(key)"], pending.clearing {
            if case .success = await pending.task.value { return true }
            return false
        }
        if watchProgress[key]?.currentTime == 0 && progressWrites["\(profileID):\(key)"] == nil { return true }
        let total = watchProgress[key]?.duration ?? duration
        return await persistWatchProgress(WatchProgressPayload(showId: showID, season: season, episode: episode,
                                                               currentTime: 0, duration: total.isFinite ? max(total, 0) : 0), clearing: true)
    }

    /// The API has POST-based reset semantics. Serialize per-episode writes so an
    /// older autosave cannot arrive after the reset and restore a resume point.
    private func persistWatchProgress(_ payload: WatchProgressPayload, clearing: Bool) async -> Bool {
        guard let client, let profileID = activeProfile?.id,
              let scoped = try? CWorldAPIClient(baseURLString: client.baseURL.absoluteString, token: client.token, session: session) else { return false }
        scoped.profileID = profileID
        let key = progressKey(showID: payload.showId, season: payload.season, episode: payload.episode)
        let writeKey = "\(profileID):\(key)"
        let previous = progressWrites[writeKey]
        let original = watchProgress[key]
        let revision = UUID()
        progressVersions[key] = revision
        if clearing {
            // Retain a zero-time completion marker so older unfinished episodes
            // do not replace this title on the Continue Watching shelf.
            watchProgress[key] = WatchProgressRecord(id: original?.id ?? 0, showID: payload.showId,
                season: payload.season, episode: payload.episode, currentTime: 0,
                duration: payload.duration, updatedAt: Date().ISO8601Format())
        }
        let task = Task { @MainActor () -> Result<WatchProgressRecord, Error> in
            if let previous { _ = await previous.task.value }
            do {
                try Task.checkCancellation()
                guard self.client === client else { throw CancellationError() }
                return .success(try await scoped.saveWatchProgress(payload))
            } catch { return .failure(error) }
        }
        progressWrites[writeKey] = (revision, clearing, task)
        let result = await task.value
        let previousResult = await previous?.task.value
        if progressWrites[writeKey]?.id == revision { progressWrites[writeKey] = nil }
        guard self.client === client, activeProfile?.id == profileID, progressVersions[key] == revision else {
            if case .success = result { return true }
            return false
        }
        switch result {
        case .success(let record):
            watchProgress[key] = record
            return true
        case .failure(let error):
            if clearing {
                if case .success(let confirmed) = previousResult { watchProgress[key] = confirmed }
                else { watchProgress[key] = original }
            }
            errorMessage = clearing ? "Couldn't clear watch progress. Please try again. \(error.localizedDescription)"
                                    : "Watch progress couldn't sync. \(error.localizedDescription)"
            return false
        }
    }

    @discardableResult
    func removeFromContinueWatching(_ media: CWorldMedia) async -> Bool {
        let removingClient = client
        let removingProfile = activeProfile?.id
        let records = watchProgress.values.filter { self.media(for: $0.showID)?.id == media.id && $0.currentTime > 0 }
        // Clearing all unfinished records for this title prevents an older
        // episode from reappearing immediately after removing the visible card.
        var succeeded = true
        for record in records {
            guard client === removingClient, activeProfile?.id == removingProfile else { return false }
            let cleared = await clearWatchProgress(showID: record.showID, season: record.season, episode: record.episode, duration: record.duration)
            succeeded = cleared && succeeded
        }
        return succeeded
    }

    func recordWatchHistory(showID: String, season: Int? = nil, episode: Int? = nil) async {
        guard let client else { return }
        do {
            let record = try await client.saveWatchHistory(showID: showID, season: season, episode: episode)
            watchHistory.removeAll { $0.showID == record.showID }
            watchHistory.insert(record, at: 0)
        } catch {
            print("CWorld watch history sync failed: \(error.localizedDescription)")
        }
    }

    func removeWatchHistory(_ record: WatchHistoryRecord) async {
        guard let client else { return }
        do {
            try await client.deleteWatchHistory(
                showID: record.showID,
                season: record.season,
                episode: record.episode
            )
            watchHistory.removeAll { $0.showID == record.showID }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func media(for playbackID: String) -> CWorldMedia? {
        catalog.first { media in
            media.id == playbackID
                || media.movieAsset?.mediaId == playbackID
                || media.seasons?.contains { season in
                    season.episodes.contains { $0.playbackRef.mediaId == playbackID }
                } == true
        }
    }

    private func loadProfiles(using client: CWorldAPIClient) async throws {
        let profiles = try await client.profiles()
        try Task.checkCancellation()
        guard self.client === client else { throw CancellationError() }
        applyProfiles(profiles, using: client)
        hasValidatedSession = true
    }

    private func applyProfiles(_ profiles: [CWorldProfile], using client: CWorldAPIClient) {
        self.profiles = profiles
        let savedID = defaults.integer(forKey: Self.activeProfileIDKey)
        activeProfile = profiles.first(where: { $0.id == savedID })
        if activeProfile == nil && profiles.count == 1 {
            activeProfile = profiles.first
        }
        client.profileID = activeProfile?.id
    }

    private func syncWatchData(using client: CWorldAPIClient) async {
        guard self.client === client else { return }
        guard let profileID = activeProfile?.id else {
            watchProgress = [:]
            watchHistory = []
            return
        }

        // Capture the profile in an independent client so a switch cannot retarget
        // the second concurrent request or publish an old profile's response.
        guard let scopedClient = try? CWorldAPIClient(
            baseURLString: client.baseURL.absoluteString, token: client.token, session: session
        ) else { return }
        scopedClient.profileID = profileID
        async let progressRefresh: Void = refreshWatchProgress(using: client)
        async let historyResponse = try? scopedClient.watchHistory()
        if let history = await historyResponse,
           self.client === client, activeProfile?.id == profileID, !Task.isCancelled {
            watchHistory = history.sorted { $0.watchedAt > $1.watchedAt }
        }
        await progressRefresh
    }

    private func ensurePlaybackProgress(using client: CWorldAPIClient) async {
        if loadedProgressProfileID != activeProfile?.id {
            await refreshWatchProgress(using: client)
        }
    }

    private func refreshWatchProgress(using client: CWorldAPIClient) async {
        guard let profileID = activeProfile?.id, self.client === client else { return }
        let request: (id: UUID, client: CWorldAPIClient, profileID: Int, versions: [String: UUID], pendingKeys: Set<String>, task: Task<[WatchProgressRecord]?, Never>)
        if let existing = progressRequest, existing.client === client, existing.profileID == profileID {
            request = existing
        } else {
            progressRequest?.task.cancel()
            guard let scoped = try? CWorldAPIClient(baseURLString: client.baseURL.absoluteString,
                                                   token: client.token, session: session) else { return }
            scoped.profileID = profileID
            let pendingKeys = Set(progressVersions.keys.filter { progressWrites["\(profileID):\($0)"] != nil })
            request = (UUID(), client, profileID, progressVersions, pendingKeys, Task { try? await scoped.watchProgress() })
            progressRequest = request
        }
        let records = await request.task.value
        if let records, self.client === client, activeProfile?.id == profileID,
           progressRequest?.id == request.id, !Task.isCancelled {
            var refreshed = records.reduce(into: [String: WatchProgressRecord]()) { result, record in
                result[progressKey(showID: record.showID, season: record.season, episode: record.episode)] = record
            }
            // Also preserve writes already pending when this GET began: their
            // optimistic state may not have reached the server snapshot yet.
            for (key, revision) in progressVersions where request.versions[key] != revision || request.pendingKeys.contains(key) {
                refreshed[key] = watchProgress[key]
            }
            watchProgress = refreshed
            loadedProgressProfileID = profileID
        }
        if progressRequest?.id == request.id, !Task.isCancelled { progressRequest = nil }
    }

    private func progressKey(showID: String, season: Int?, episode: Int?) -> String {
        "\(showID):\(season.map(String.init) ?? "movie"): \(episode.map(String.init) ?? "")"
            .replacingOccurrences(of: ": ", with: ":")
    }

    private func loadCatalog(using client: CWorldAPIClient) async throws {
        let response = try await client.catalog()
        try Task.checkCancellation()
        guard self.client === client else { throw CancellationError() }
        guard response.schemaVersion == 1 else {
            throw CWorldAPIError.httpStatus(500, "Unsupported catalog schema version.")
        }
        catalog = response.items
        catalogRevision = response.catalogRevision
        catalogGeneratedAt = response.generatedAt
        isCatalogFromCache = false
        catalogCache.save(response)
    }

    private func rebuildClient() {
        progressRequest?.task.cancel()
        progressRequest = nil
        loadedProgressProfileID = nil
        sessionValidationTask?.cancel()
        sessionValidationTask = nil
        hasValidatedSession = false
        isRefreshingCatalog = false
        client = try? CWorldAPIClient(baseURLString: apiBaseURL, token: token, session: session)
        client?.profileID = activeProfile?.id
    }

    private func clearSession(keepError: Bool = false) {
        for write in progressWrites.values { write.task.cancel() }
        progressWrites = [:]
        progressVersions = [:]
        progressRequest?.task.cancel()
        progressRequest = nil
        loadedProgressProfileID = nil
        sessionValidationTask?.cancel()
        sessionValidationTask = nil
        hasValidatedSession = false
        isRestoringSession = false
        isRefreshingCatalog = false
        isShowingHomeIntro = false
        isLoading = false
        keychain.deleteToken()
        token = nil
        user = nil
        profiles = []
        activeProfile = nil
        catalog = []
        catalogRevision = ""
        catalogGeneratedAt = ""
        isCatalogFromCache = false
        watchProgress = [:]
        watchHistory = []
        defaults.removeObject(forKey: Self.activeProfileIDKey)
        defaults.removeObject(forKey: Self.cachedUserKey)
        client = try? CWorldAPIClient(baseURLString: apiBaseURL, session: session)
        if !keepError { errorMessage = nil }
    }

    private func cacheUser(_ user: CWorldUser) {
        if let data = try? JSONEncoder().encode(user) {
            defaults.set(data, forKey: Self.cachedUserKey)
        }
    }

    private func isAuthenticationFailure(_ error: Error) -> Bool {
        guard case let CWorldAPIError.httpStatus(status, _) = error else { return false }
        return status == 401 || status == 403
    }
}
