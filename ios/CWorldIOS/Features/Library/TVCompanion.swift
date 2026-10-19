import SwiftUI
import AVKit
import MediaPlayer
import Combine
import CryptoKit
@preconcurrency import MultipeerConnectivity

private struct RemoteTrustStore: Codable {
    var deviceID = UUID().uuidString
    var secrets: [String: String] = [:]
}
private struct RemoteInvitation: Codable {
    var scope: String
    var device: String
    var host: String
    var challenge: String
    var nonce: String
    var proof: Data?
    var context: String { "\(scope)|\(device)|\(host)|\(challenge)|\(nonce)" }
}
private struct RemoteWire: Codable {
    var sequence: UInt64
    var sealed: Data
}
private struct RemotePairingGrant: Codable {
    var secret: String
    var context: String
}

enum RemoteTrustCrypto {
    static func proof(secret: Data, context: String) -> Data {
        Data(HMAC<SHA256>.authenticationCode(for: Data(context.utf8), using: SymmetricKey(data: secret)))
    }
    static func verifies(_ proof: Data, secret: Data, context: String) -> Bool {
        HMAC<SHA256>.isValidAuthenticationCode(proof, authenticating: Data(context.utf8), using: SymmetricKey(data: secret))
    }
    static func key(secret: Data, context: String) -> SymmetricKey {
        HKDF<SHA256>.deriveKey(inputKeyMaterial: SymmetricKey(data: secret), salt: Data(context.utf8),
                              info: Data("SeedSpace remote v3".utf8), outputByteCount: 32)
    }
    static func seal(_ data: Data, key: SymmetricKey, direction: String, sequence: UInt64) throws -> Data {
        try AES.GCM.seal(data, using: key, authenticating: Data("\(direction):\(sequence)".utf8)).combined!
    }
    static func open(_ data: Data, key: SymmetricKey, direction: String, sequence: UInt64) throws -> Data {
        try AES.GCM.open(AES.GCM.SealedBox(combined: data), using: key, authenticating: Data("\(direction):\(sequence)".utf8))
    }
}

private struct RemoteQueueItem: Codable, Identifiable {
    var id: String
    var mediaID: String
    var season: Int?
    var episode: Int?
    var title: String
}
private struct RemoteAudioItem: Codable, Identifiable {
    var id: Int
    var title: String
    var selected: Bool
}
private struct DesktopRemoteMessage: Codable {
    var command: String
    var value: Double?
    var title: String?
    var playing: Bool?
    var duration: Double?
    var captions: Bool?
    var hasCaptions: Bool?
    var next: Bool?
    var previous: Bool?
    var volume: Double?
    var mediaKey: String?
    var mediaID: String?
    var season: Int?
    var episode: Int?
    var queue: [RemoteQueueItem]?
    var itemID: String?
    var audio: [RemoteAudioItem]?
    var queueOrder: [String]?
}

enum DesktopRemotePairingPolicy {
    static func mayRequestApproval(provided: String?, scope: String, automatic: Bool,
                                   connected: Bool, pending: Bool, failures: Int) -> Bool {
        automatic && !scope.isEmpty && provided == "request:\(scope)" && !connected && !pending && failures < 5
    }
    static func permits(provided: String?, expected: String, expires: Date, failures: Int,
                        connected: Bool, pending: Bool, now: Date = Date()) -> Bool {
        expected.count == 6 && expected.allSatisfy(\.isNumber) && provided == expected &&
        now <= expires && failures < 5 && !connected && !pending
    }
}

@MainActor
final class DesktopRemote: NSObject, ObservableObject {
    static let shared = DesktopRemote()
    @Published var peers: [MCPeerID] = []
    @Published var code = ""
    @Published var status = "Not connected"
    @Published var connected = false
    @Published var hosting = false
    @Published var pendingPhone: String?
    @Published var discoveredMac: MCPeerID?
    @Published var presented = false
    private weak var appModel: AppModel?
    private var automatic = false
    private var scope = ""
    private var offeredPeers: Set<MCPeerID> = []
    private var audioTask: Task<Void, Never>?
    private var audioItem: AVPlayerItem?
    private var audioGroup: AVMediaSelectionGroup?
    private var knownAudio: [RemoteAudioItem] = []
    private var trust = RemoteTrustStore()
    private var trustStore: KeychainStore?
    private var discoveries: [MCPeerID: [String: String]] = [:]
    private var hostChallenge = UUID().uuidString
    private var handshake: RemoteInvitation?
    private var sessionKey: SymmetricKey?
    private var pairingSecret: String?
    private var sentSequence: UInt64 = 0
    private var receivedSequence: UInt64 = 0
    private var handshakeTimeout: Task<Void, Never>?
    private var authorizedPeer: MCPeerID?
    @Published fileprivate var snapshot: DesktopRemoteMessage?
    private let peer = MCPeerID(displayName: String(UIDevice.current.name.prefix(40)))
    private var session: MCSession?
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    private var ticker: Task<Void, Never>?
    private var invitation: ((Bool, MCSession?) -> Void)?
    private var expires = Date.distantPast
    private var failures = 0
    private var lastCommand = Date.distantPast
    private let service = "seedspace-rc"

    var controllingMac: Bool { connected && !hosting }
    var remoteTitle: String { snapshot?.title ?? "Mac playback" }
    func activate(appModel: AppModel, freshPrompt: Bool = false) {
        self.appModel = appModel
        guard appModel.isAuthenticated, let user = appModel.user, let profile = appModel.activeProfile else { stop(); return }
        let nextScope = SHA256.hash(data: Data("\(user.id):\(profile.id)".utf8)).map { String(format: "%02x", $0) }.joined()
        if scope != nextScope {
            stop(); scope = nextScope
            let store = KeychainStore(service: "com.cearaworld.remote-trust", tokenAccount: scope)
            trustStore = store
            if let stored = store.readToken()?.data(using: .utf8), let saved = try? JSONDecoder().decode(RemoteTrustStore.self, from: stored) { trust = saved }
            else { trust = RemoteTrustStore(); persistTrust() }
        }
        if freshPrompt {
            offeredPeers.removeAll()
            if !connected, let first = peers.first { discoveredMac = first; offeredPeers.insert(first) }
        }
        if connected { return }
        #if targetEnvironment(macCatalyst)
        guard CWorldPlaybackHost.shared.player != nil else { if hosting { stop() }; return }
        if advertiser == nil { host(automatically: true) }
        #else
        if browser == nil { browse() }
        #endif
    }
    func requestConnection() {
        guard !connected, handshake == nil, let peer = discoveredMac, let session, let info = discoveries[peer],
              let host = info["device"], let challenge = info["challenge"] else { return }
        discoveredMac = nil
        sessionKey = nil; pairingSecret = nil; sentSequence = 0; receivedSequence = 0
        var request = RemoteInvitation(scope: scope, device: trust.deviceID, host: host, challenge: challenge, nonce: UUID().uuidString)
        if let raw = trust.secrets[host], let secret = Data(base64Encoded: raw) {
            request.proof = RemoteTrustCrypto.proof(secret: secret, context: request.context)
            sessionKey = RemoteTrustCrypto.key(secret: secret, context: request.context)
        }
        handshake = request; authorizedPeer = peer
        guard let context = try? JSONEncoder().encode(request) else { return }
        browser?.invitePeer(peer, to: session, withContext: context, timeout: 30)
        status = sessionKey == nil ? "Approve this phone once on your Mac…" : "Reconnecting securely…"; presented = true
        handshakeTimeout?.cancel()
        handshakeTimeout = Task { [weak self] in
            try? await Task.sleep(for: .seconds(35))
            guard !Task.isCancelled, let self, !self.connected else { return }
            self.stop(); self.status = "Connection timed out. Please reconnect and approve on your Mac if asked."
        }
    }
    func sendSelection(_ selection: PlayerSelection, enqueue: Bool) {
        guard controllingMac else { return }
        send(DesktopRemoteMessage(command: enqueue ? "enqueue" : "load", mediaKey: snapshot?.mediaKey,
            mediaID: selection.mediaID, season: selection.season, episode: selection.episode))
        if !enqueue { presented = true }
    }
    func removeQueued(_ id: String) {
        send(DesktopRemoteMessage(command: "removeQueue", mediaKey: snapshot?.mediaKey, itemID: id))
    }
    func playQueued(_ id: String) {
        send(DesktopRemoteMessage(command: "playQueue", mediaKey: snapshot?.mediaKey, itemID: id))
    }
    func moveQueued(from offsets: IndexSet, to destination: Int) {
        var items = snapshot?.queue ?? []
        items.move(fromOffsets: offsets, toOffset: destination)
        send(DesktopRemoteMessage(command: "moveQueue", mediaKey: snapshot?.mediaKey, queueOrder: items.map(\.id)))
    }

    private func setup() {
        stop()
        let session = MCSession(peer: peer, securityIdentity: nil, encryptionPreference: .required)
        session.delegate = self
        self.session = session
    }
    func host(automatically: Bool = false) {
        setup(); hosting = true
        hostChallenge = UUID().uuidString
        automatic = automatically
        code = String(format: "%06d", Int.random(in: 0...999999))
        expires = Date().addingTimeInterval(120); failures = 0
        let advertiser = MCNearbyServiceAdvertiser(peer: peer, discoveryInfo: ["scope": scope, "playing": "1", "protocol": "3", "device": trust.deviceID, "challenge": hostChallenge], serviceType: service)
        advertiser.delegate = self; self.advertiser = advertiser
        advertiser.startAdvertisingPeer(); status = "Pairing available for two minutes"
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled, let self else { return }
                if !self.automatic && !self.connected && Date() > self.expires {
                    self.stop(); self.status = "Pairing expired. Start pairing again."; return
                }
                if self.connected { self.publishState() }
            }
        }
    }
    func browse() {
        setup()
        let browser = MCNearbyServiceBrowser(peer: peer, serviceType: service)
        browser.delegate = self; self.browser = browser
        browser.startBrowsingForPeers(); status = "Looking for Macs on your local network…"
    }
    func approve(_ allowed: Bool) {
        guard let handler = invitation else { return }
        invitation = nil; pendingPhone = nil
        let permitted = allowed && (automatic || Date() <= expires)
        if permitted, let request = handshake {
            let secret = SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }
            pairingSecret = secret.base64EncodedString()
            trust.secrets[request.device] = pairingSecret
            persistTrust()
            sessionKey = RemoteTrustCrypto.key(secret: secret, context: request.context)
        }
        handler(permitted, session)
        if !permitted { handshake = nil; authorizedPeer = nil }
    }
    private func persistTrust() {
        guard let data = try? JSONEncoder().encode(trust), let value = String(data: data, encoding: .utf8) else { return }
        do { try trustStore?.saveToken(value) }
        catch { status = "Connected-device memory could not be saved. Approval may be required next time." }
    }
    func forgetTrustedDevices() {
        trust.secrets = [:]; persistTrust(); stop()
        if let model = appModel { activate(appModel: model) }
    }
    func stop() {
        handshakeTimeout?.cancel(); handshakeTimeout = nil
        handshake = nil; sessionKey = nil; pairingSecret = nil; authorizedPeer = nil
        sentSequence = 0; receivedSequence = 0; discoveries = [:]
        audioTask?.cancel(); audioTask = nil; audioItem = nil; audioGroup = nil; knownAudio = []
        discoveredMac = nil
        ticker?.cancel(); ticker = nil
        invitation?(false, nil); invitation = nil; pendingPhone = nil
        advertiser?.stopAdvertisingPeer(); advertiser = nil
        browser?.stopBrowsingForPeers(); browser = nil
        session?.disconnect(); session = nil
        connected = false; hosting = false; automatic = false; code = ""; peers = []; snapshot = nil; status = "Not connected"
    }
    fileprivate func send(_ message: DesktopRemoteMessage) {
        guard connected, let session, let key = sessionKey, let target = authorizedPeer, session.connectedPeers.contains(target),
              let data = try? JSONEncoder().encode(message) else { return }
        do {
            sentSequence += 1
            let wire = RemoteWire(sequence: sentSequence, sealed: try RemoteTrustCrypto.seal(data, key: key,
                direction: hosting ? "host" : "phone", sequence: sentSequence))
            try session.send(JSONEncoder().encode(wire), toPeers: [target], with: .reliable)
        }
        catch { status = "Connection interrupted. Reconnect to the Mac." }
    }
    func command(_ name: String, value: Double? = nil) {
        guard connected, !hosting else { return }
        send(DesktopRemoteMessage(command: name, value: value, mediaKey: snapshot?.mediaKey))
    }
    private var currentKey: String {
        let host = CWorldPlaybackHost.shared
        return "\(host.mediaID ?? ""):\(host.season ?? 0):\(host.episode ?? 0)"
    }
    private func publishState() {
        let host = CWorldPlaybackHost.shared
        if let item = host.player?.currentItem, audioItem !== item {
            audioTask?.cancel(); audioItem = item; audioGroup = nil; knownAudio = []
            audioTask = Task { @MainActor in
                guard let group = try? await item.asset.loadMediaSelectionGroup(for: .audible),
                      !Task.isCancelled, self.audioItem === item else { return }
                self.audioGroup = group
            }
        }
        if let group = audioGroup, let item = audioItem {
            knownAudio = group.options.enumerated().map { index, option in
                RemoteAudioItem(id: index, title: option.displayName, selected: item.currentMediaSelection.selectedMediaOption(in: group) == option)
            }
        }
        let time = host.player?.currentTime().seconds ?? 0
        let duration = host.player?.currentItem?.duration.seconds ?? 0
        send(DesktopRemoteMessage(command: "state", value: time.isFinite ? time : 0,
            title: host.title.isEmpty ? "Nothing playing" : host.title, playing: host.isPlaying,
            duration: duration.isFinite ? max(0, duration) : 0, captions: host.subtitlesOn,
            hasCaptions: host.hasSubtitles, next: host.hasAutomaticNext || !host.queue.isEmpty,
            previous: host.skipPrevious != nil, volume: Double(host.player?.volume ?? 1), mediaKey: currentKey,
            mediaID: host.mediaID, season: host.season, episode: host.episode,
            queue: host.queue.prefix(100).map { RemoteQueueItem(id: $0.id.uuidString, mediaID: $0.selection.mediaID,
                season: $0.selection.season, episode: $0.selection.episode, title: $0.selection.title) }, audio: knownAudio))
    }
    private func receive(_ data: Data, from peer: MCPeerID, in receivedSession: MCSession) {
        guard receivedSession === session, peer == authorizedPeer, receivedSession.connectedPeers.contains(peer), data.count < 65536 else { return }
        // Only a first-time, explicitly requested pairing may accept a bootstrap
        // secret. Remembered connections never downgrade to this path.
        if !hosting, sessionKey == nil, let request = handshake, request.proof == nil,
           let grant = try? JSONDecoder().decode(RemotePairingGrant.self, from: data),
           grant.context == request.context, let secret = Data(base64Encoded: grant.secret), secret.count == 32 {
            trust.secrets[request.host] = grant.secret; persistTrust()
            sessionKey = RemoteTrustCrypto.key(secret: secret, context: request.context)
            return
        }
        guard let key = sessionKey,
              let wire = try? JSONDecoder().decode(RemoteWire.self, from: data), wire.sequence > receivedSequence,
              let plaintext = try? RemoteTrustCrypto.open(wire.sealed, key: key, direction: hosting ? "phone" : "host", sequence: wire.sequence),
              let message = try? JSONDecoder().decode(DesktopRemoteMessage.self, from: plaintext) else { return }
        receivedSequence = wire.sequence
        if !connected && !hosting && message.command == "state" { finishConnection(peer) }
        guard connected else { return }
        if !hosting {
            if message.command == "state" { snapshot = message }
            return
        }
        guard message.mediaKey == currentKey, Date().timeIntervalSince(lastCommand) > 0.08 else { return }
        lastCommand = Date()
        let host = CWorldPlaybackHost.shared
        guard let player = host.player else { return }
        switch message.command {
        case "load", "enqueue":
            guard let id = message.mediaID, let media = appModel?.media(for: id) else { return }
            let entry: CWorldQueueEntry
            if media.type == "movie" { entry = CWorldQueueEntry(media: media) }
            else {
                guard let season = media.seasons?.first(where: { $0.number == message.season }),
                      let episode = season.episodes.first(where: { $0.number == message.episode }) else { return }
                entry = CWorldQueueEntry(media: media, season: season.number, episode: episode)
            }
            if message.command == "enqueue" { if host.queue.count < 100 { host.enqueue(entry) } }
            else { host.selectQueued?(entry.selection) }
        case "removeQueue": host.queue.removeAll { $0.id.uuidString == message.itemID }
        case "playQueue":
            if let entry = host.queue.first(where: { $0.id.uuidString == message.itemID }) { host.selectQueued?(entry.selection) }
        case "moveQueue":
            if let order = message.queueOrder, order.count == host.queue.count,
               Set(order) == Set(host.queue.map { $0.id.uuidString }) {
                let entries = Dictionary(uniqueKeysWithValues: host.queue.map { ($0.id.uuidString, $0) })
                host.queue = order.compactMap { entries[$0] }
            }
        case "audio":
            if let value = message.value, value.isFinite, value >= 0, value < Double(audioGroup?.options.count ?? 0),
               let group = audioGroup, let item = player.currentItem, item === audioItem {
                item.select(group.options[Int(value)], in: group)
            }
        case "play": host.play()
        case "pause": player.pause()
        case "seek": if let value = message.value, value.isFinite { host.remoteSeek(to: value) }
        case "back": host.remoteSeek(to: player.currentTime().seconds - 15)
        case "forward": host.remoteSeek(to: player.currentTime().seconds + 15)
        case "next": host.skipNext?()
        case "previous": host.skipPrevious?()
        case "intro": host.remoteSkipIntro?()
        case "outro": host.remoteSkipOutro?()
        case "captions": if host.hasSubtitles { host.toggleCaptions?() }
        case "volume": if let value = message.value, value.isFinite { host.remoteSetVolume?(Float(min(1, max(0, value)))) }
        default: return
        }
        publishState()
    }
    private func finishConnection(_ peer: MCPeerID) {
        handshakeTimeout?.cancel(); handshakeTimeout = nil
        connected = true; status = "Connected to \(peer.displayName)"
        advertiser?.stopAdvertisingPeer(); browser?.stopBrowsingForPeers(); code = ""
        if hosting { publishState() }
        else { CWorldPlaybackHost.shared.stop(); presented = true }
    }
}

extension DesktopRemote: MCSessionDelegate, MCNearbyServiceAdvertiserDelegate, MCNearbyServiceBrowserDelegate {
    nonisolated func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        Task { @MainActor in
            guard session === self.session else { return }
            if state == .connected {
                guard peerID == self.authorizedPeer, self.handshake != nil else { session.disconnect(); return }
                if self.hosting {
                    guard self.sessionKey != nil else { session.disconnect(); return }
                    if let secret = self.pairingSecret, let context = self.handshake?.context {
                        do {
                            let grant = RemotePairingGrant(secret: secret, context: context)
                            try session.send(JSONEncoder().encode(grant), toPeers: [peerID], with: .reliable)
                            self.pairingSecret = nil
                        } catch { self.stop(); return }
                    }
                    self.finishConnection(peerID)
                } else {
                    self.handshakeTimeout?.cancel()
                    self.handshakeTimeout = Task { [weak self] in
                        try? await Task.sleep(for: .seconds(10))
                        guard !Task.isCancelled, let self, !self.connected else { return }
                        self.stop(); self.status = "Could not verify this Mac. If pairing was reset, forget trusted devices and pair again."
                    }
                }
            } else if state == .notConnected {
                self.stop(); self.status = "Disconnected. Reconnect when the Mac is available."
                if let model = self.appModel { self.activate(appModel: model) }
            }
        }
    }
    nonisolated func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        Task { @MainActor in self.receive(data, from: peerID, in: session) }
    }
    nonisolated func session(_ session: MCSession, didReceive stream: InputStream, withName name: String, fromPeer peerID: MCPeerID) { stream.close() }
    nonisolated func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) { progress.cancel() }
    nonisolated func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
    nonisolated func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        Task { @MainActor in
            guard advertiser === self.advertiser, self.hosting, !self.connected, self.authorizedPeer == nil,
                  self.invitation == nil, self.failures < 5, let context, context.count < 2048,
                  let request = try? JSONDecoder().decode(RemoteInvitation.self, from: context),
                  request.scope == self.scope, !self.scope.isEmpty,
                  request.host == self.trust.deviceID, request.challenge == self.hostChallenge,
                  UUID(uuidString: request.device) != nil, UUID(uuidString: request.nonce) != nil else {
                self.failures += 1; invitationHandler(false, nil); return
            }
            if let proof = request.proof {
                guard let raw = self.trust.secrets[request.device], let secret = Data(base64Encoded: raw), secret.count == 32,
                      RemoteTrustCrypto.verifies(proof, secret: secret, context: request.context) else {
                    self.failures += 1; invitationHandler(false, nil); return
                }
                self.handshake = request; self.authorizedPeer = peerID
                self.sessionKey = RemoteTrustCrypto.key(secret: secret, context: request.context)
                invitationHandler(true, self.session)
                return
            }
            self.handshake = request; self.authorizedPeer = peerID
            self.pendingPhone = peerID.displayName; self.invitation = invitationHandler
        }
    }
    nonisolated func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
        Task { @MainActor in guard advertiser === self.advertiser else { return }; self.status = "Allow Local Network access in Settings, then retry. \(error.localizedDescription)" }
    }
    nonisolated func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        Task { @MainActor in
            guard browser === self.browser, info?["protocol"] == "3", info?["scope"] == self.scope, info?["playing"] == "1" else { return }
            self.discoveries[peerID] = info
            if !self.peers.contains(peerID) { self.peers.append(peerID) }
            if !self.connected && self.discoveredMac == nil && !self.offeredPeers.contains(peerID) {
                self.offeredPeers.insert(peerID); self.discoveredMac = peerID
            }
        }
    }
    nonisolated func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        Task { @MainActor in
            guard browser === self.browser else { return }; self.peers.removeAll { $0 == peerID }
            if self.discoveredMac == peerID { self.discoveredMac = nil }
        }
    }
    nonisolated func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
        Task { @MainActor in guard browser === self.browser else { return }; self.status = "Allow Local Network access in Settings, then retry. \(error.localizedDescription)" }
    }
}

struct DesktopRemoteCoordinator: ViewModifier {
    let appModel: AppModel
    @ObservedObject private var remote = DesktopRemote.shared
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @Environment(\.scenePhase) private var phase
    func body(content: Content) -> some View {
        content
            .task(id: "\(appModel.isAuthenticated):\(appModel.user?.id ?? -1):\(appModel.activeProfile?.id ?? -1)") {
                remote.activate(appModel: appModel)
            }
            .onChange(of: phase) { _, value in
                if value == .active { remote.activate(appModel: appModel, freshPrompt: true) }
            }
            .onChange(of: host.player) { _, _ in
                remote.activate(appModel: appModel)
            }
            .overlay(alignment: .topTrailing) {
                if remote.controllingMac {
                    Button { remote.presented = true } label: {
                        Label("Playing on Mac", systemImage: "desktopcomputer")
                            .font(.caption.bold()).padding(10).background(.ultraThinMaterial, in: Capsule())
                    }.padding(.trailing, 16).padding(.top, 52)
                }
            }
            .sheet(isPresented: $remote.presented) { DesktopRemoteView().environmentObject(appModel) }
            #if targetEnvironment(macCatalyst)
            // Unknown devices require approval; known devices prove their secret.
            .alert("Allow \(remote.pendingPhone ?? "iPhone") to control this Mac?", isPresented: Binding(
                get: { remote.pendingPhone != nil }, set: { if !$0 { remote.approve(false) } })) {
                Button("Allow and remember") { remote.approve(true) }
                Button("Deny", role: .cancel) { remote.approve(false) }
            } message: { Text("Only approve your phone. It can control this profile's playback and reconnect without asking again. You can revoke this in Mac Remote.") }
            #else
            .alert("SeedSpace is playing on \(remote.discoveredMac?.displayName ?? "your Mac")", isPresented: Binding(
                get: { remote.discoveredMac != nil }, set: { if !$0 { remote.discoveredMac = nil } })) {
                Button("Connect") { remote.requestConnection() }
                Button("Not now", role: .cancel) { remote.discoveredMac = nil }
            } message: { Text("Use your phone as a remote? Your Mac asks for approval the first time only.") }
            #endif
    }
}

struct DesktopRemoteView: View {
    @ObservedObject private var remote = DesktopRemote.shared
    @Environment(\.dismiss) private var dismiss
    @State private var position = 0.0
    @State private var volume = 1.0
    @State private var scrubbing = false
    @State private var addingToQueue = false
    @State private var confirmingForget = false
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(remote.status)
                    #if targetEnvironment(macCatalyst)
                    if !remote.connected {
                        Button("Allow iPhone remote") { remote.host(automatically: true) }
                        Text("Open SeedSpace on your phone and connect. New phones ask for approval on this Mac; remembered phones reconnect securely.").font(.caption)
                    }
                    #else
                    if !remote.connected {
                        Button("Find Macs") { remote.browse() }
                        ForEach(remote.peers, id: \.self) { peer in
                            Button(peer.displayName) { remote.discoveredMac = peer; remote.requestConnection() }
                        }
                    }
                    #endif
                    if remote.connected || remote.hosting { Button("Disconnect", role: .destructive) { remote.stop() } }
                    Button("Forget trusted devices", role: .destructive) { confirmingForget = true }
                } footer: { Text("Use the same local network and SeedSpace account/profile. Your Mac must be awake. Browse normally on your phone to play a different title on the connected Mac.") }
                if remote.connected && !remote.hosting, let state = remote.snapshot {
                    Section(state.title ?? "Mac playback") {
                        Slider(value: Binding(get: { scrubbing ? position : min(state.value ?? 0, max(1, state.duration ?? 1)) }, set: { position = $0 }),
                               in: 0...max(1, state.duration ?? 1), onEditingChanged: { editing in
                            scrubbing = editing; if !editing { remote.command("seek", value: position) }
                        }).disabled((state.duration ?? 0) <= 0).accessibilityLabel("Playback position")
                        HStack {
                            control("back", "gobackward.15", "Back 15 seconds")
                            control(state.playing == true ? "pause" : "play", state.playing == true ? "pause.fill" : "play.fill", "Play or pause")
                            control("forward", "goforward.15", "Forward 15 seconds")
                        }.buttonStyle(.borderless)
                        Button("Previous episode") { remote.command("previous") }.disabled(state.previous != true)
                        Button("Next episode") { remote.command("next") }.disabled(state.next != true)
                        Button("Skip intro") { remote.command("intro") }
                        Button("Skip outro") { remote.command("outro") }
                        Button(state.captions == true ? "Turn subtitles off" : "Turn subtitles on") { remote.command("captions") }.disabled(state.hasCaptions != true)
                        if let audio = state.audio, audio.count > 1 {
                            Menu("Audio track") {
                                ForEach(audio) { track in
                                    Button { remote.command("audio", value: Double(track.id)) } label: {
                                        Label(track.title, systemImage: track.selected ? "checkmark" : "waveform")
                                    }
                                }
                            }
                        }
                        VStack {
                            Text("Mac player volume")
                            Slider(value: $volume, in: 0...1, onEditingChanged: { editing in
                                if !editing { remote.command("volume", value: volume) }
                            })
                        }.onAppear { volume = state.volume ?? 1 }
                    }
                    Section("Up Next on Mac") {
                        ForEach(state.queue ?? []) { item in
                            Button(item.title) { remote.playQueued(item.id) }
                        }
                            .onDelete { offsets in
                                for index in offsets { if let items = state.queue, items.indices.contains(index) { remote.removeQueued(items[index].id) } }
                            }
                            .onMove { offsets, destination in remote.moveQueued(from: offsets, to: destination) }
                        Button("Add movies or episodes", systemImage: "plus") { addingToQueue = true }
                    }
                }
            }
            .navigationTitle("Mac Remote")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
                ToolbarItem(placement: .topBarLeading) { if remote.controllingMac { EditButton() } }
            }
            .sheet(isPresented: $addingToQueue) { CWorldQueuePicker() }
            .confirmationDialog("Forget all trusted remote devices for this profile?", isPresented: $confirmingForget, titleVisibility: .visible) {
                Button("Forget and disconnect", role: .destructive) { remote.forgetTrustedDevices() }
            } message: { Text("To pair again, use Forget trusted devices on both devices, then approve the new connection on your Mac.") }
        }.preferredColorScheme(.dark)
    }
    private func control(_ command: String, _ icon: String, _ label: String) -> some View {
        Button { remote.command(command) } label: { Image(systemName: icon).font(.title).frame(maxWidth: .infinity, minHeight: 55) }.accessibilityLabel(label)
    }
}

struct CWorldQueueEntry: Identifiable, Equatable {
    let id: UUID
    let selection: PlayerSelection
    let mediaTitle: String
    let artworkURL: URL?

    init(media: CWorldMedia, season: Int? = nil, episode: CWorldEpisode? = nil) {
        id = UUID()
        mediaTitle = media.title
        artworkURL = MacDesktopCatalog.placeholder(media, season: season, episode: episode?.number)
        let name = episode.map { EpisodeTitleCatalog.displayTitle(mediaID: media.id, season: season ?? 1, episode: $0.number) ?? $0.title }
        selection = PlayerSelection(mediaID: episode?.playbackRef.mediaId ?? media.movieAsset?.mediaId ?? media.id,
            season: season, episode: episode?.number,
            title: episode.map { "S\(season ?? 1)E\($0.number) · \(name ?? $0.title)" } ?? media.title,
            subtitleURL: episode?.subtitles.first ?? (episode == nil ? media.subtitleTracks.first : nil),
            skipIntroStart: episode?.skipIntroStart, skipIntroEnd: episode?.skipIntroEnd, skipOutroStart: episode?.skipOutroStart)
    }
}

extension CWorldPlaybackHost {
    func enqueue(_ item: CWorldQueueEntry) {
        if DesktopRemote.shared.controllingMac {
            DesktopRemote.shared.sendSelection(item.selection, enqueue: true); return
        }
        guard !queue.contains(where: { $0.selection.key == item.selection.key }),
              !(mediaID == item.selection.mediaID && season == item.selection.season && episode == item.selection.episode) else { return }
        queue.append(item)
    }
}

struct CWorldTVRemoteView: View {
    @State private var showingMacRemote = false
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @ObservedObject private var display = ExternalDisplaySession.shared
    @ObservedObject private var liveActivity = CWorldLiveActivityController.shared
    @Environment(\.dismiss) private var dismiss
    @State private var adding = false
    @State private var scrub = 0.0
    @State private var scrubbing = false

    var body: some View {
        NavigationStack {
            List {
                Section { Button("Mac Remote", systemImage: "desktopcomputer") { showingMacRemote = true } }
                Section {
                    HStack(spacing: 14) {
                        if let image = host.artworkImage {
                            Image(uiImage: image).resizable().scaledToFill().frame(width: 100, height: 60).clipped().clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        VStack(alignment: .leading, spacing: 5) {
                            Text(host.showTitle).font(.headline).lineLimit(2)
                            Text(host.title).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                        }
                    }
                    Label(host.connectionLost ? "TV disconnected · position saved" : host.isAirPlay ? "AirPlay video" : display.isConnected ? "Custom TV display" : "Playing on this device", systemImage: "tv")
                        .foregroundStyle(host.connectionLost ? .orange : .mint)
                    if host.connectionLost {
                        Text("Choose your TV below, then press Play. Or continue on your phone.").font(.caption)
                        Button("Continue on phone") { host.play(); host.minimized = false; dismiss() }
                    }
                    HStack {
                        Text("Choose or reconnect TV")
                        Spacer()
                        CWorldAirPlayPicker().frame(width: 44, height: 44)
                    }
                }
                Section("Playback") {
                    TimelineView(.periodic(from: .now, by: 1)) { _ in
                        let raw = host.player?.currentItem?.duration.seconds ?? 0
                        let duration = raw.isFinite ? max(1, raw) : 1
                        let time = host.player?.currentTime().seconds ?? 0
                        Slider(value: Binding(get: { scrubbing ? scrub : (time.isFinite ? min(time, duration) : 0) }, set: { scrub = $0 }), in: 0...duration) { editing in
                            scrubbing = editing
                            if !editing { host.remoteSeek(to: scrub) }
                        }.accessibilityLabel("Playback position")
                    }
                    HStack(spacing: 0) {
                        remoteButton("Previous episode", "backward.end.fill") { host.skipPrevious?() }.disabled(host.skipPrevious == nil)
                        remoteButton("Back 15 seconds", "gobackward.15") { seek(-15) }
                        remoteButton(host.isPlaying ? "Pause" : "Play", host.isPlaying ? "pause.fill" : "play.fill") { host.togglePlaybackFromRemote() }
                        remoteButton("Forward 15 seconds", "goforward.15") { seek(15) }
                        remoteButton("Next episode or queued title", "forward.end.fill") { host.skipNext?() }.disabled(!host.hasAutomaticNext && host.queue.isEmpty)
                    }.buttonStyle(.borderless)
                    Text("Swipe left or right here to seek").font(.caption).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).frame(height: 60).background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                        .gesture(DragGesture(minimumDistance: 20).onEnded { value in
                            guard abs(value.translation.width) > abs(value.translation.height) else { return }
                            seek(value.translation.width > 0 ? 15 : -15)
                        })
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Device volume").font(.caption).foregroundStyle(.secondary)
                        CWorldSystemVolume().frame(height: 36).accessibilityLabel("Playback device volume")
                    }
                    if host.hasSubtitles {
                        Button(host.subtitlesOn ? "Turn captions off" : "Turn captions on") { host.toggleCaptions?() }
                        if host.isAirPlay { Text("Separate caption files appear in custom TV mode. Direct AirPlay needs captions included in the stream.").font(.caption).foregroundStyle(.secondary) }
                    }
                    Button(host.isIntermission ? "End intermission" : "Cinema intermission", systemImage: "cup.and.saucer") { host.toggleIntermission() }
                        .disabled(!display.isConnected || host.isAirPlay)
                    if !display.isConnected || host.isAirPlay {
                        Text("The cinema artwork screen is available with the custom mirrored TV display.").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Section {
                    ForEach(host.queue) { entry in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(entry.mediaTitle).font(.headline)
                                Text(entry.selection.title).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button { host.selectQueued?(entry.selection) } label: { Image(systemName: "play.circle") }
                                .buttonStyle(.borderless).accessibilityLabel("Play \(entry.selection.title) now")
                        }
                    }.onDelete { host.queue.remove(atOffsets: $0) }
                        .onMove { host.queue.move(fromOffsets: $0, toOffset: $1) }
                    if host.queue.isEmpty { Text("The next episode plays automatically when this queue is empty.").font(.caption).foregroundStyle(.secondary) }
                    Button("Add movies or episodes", systemImage: "plus") { adding = true }
                } header: { Text("Up Next · \(host.queue.count)") }
                Section { Button("Stop playback", role: .destructive) { host.stop(); dismiss() } }
                if let message = liveActivity.message { Section("Live Activity") { Text(message).font(.caption) } }
            }
            .navigationTitle("TV Remote")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }; ToolbarItem(placement: .topBarLeading) { EditButton() } }
            .sheet(isPresented: $adding) { CWorldQueuePicker() }
            .sheet(isPresented: $showingMacRemote) { DesktopRemoteView() }
        }.preferredColorScheme(.dark).tint(.mint).onAppear { host.publishLockScreen() }
    }
    private func seek(_ delta: Double) { host.remoteSeek(to: (host.player?.currentTime().seconds ?? 0) + delta) }
    private func remoteButton(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: icon).font(.title2).frame(maxWidth: .infinity).frame(height: 60) }.accessibilityLabel(title)
    }
}

private struct CWorldSystemVolume: UIViewRepresentable {
    func makeUIView(context: Context) -> MPVolumeView { MPVolumeView(frame: .zero) }
    func updateUIView(_ view: MPVolumeView, context: Context) { }
}

struct CWorldQueuePicker: View {
    @ObservedObject private var remote = DesktopRemote.shared
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var host = CWorldPlaybackHost.shared
    @State private var query = ""
    var body: some View {
        NavigationStack {
            List {
                ForEach(appModel.catalog.filter { query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) }) { media in
                    if media.type == "movie" {
                        addButton(CWorldQueueEntry(media: media), title: media.title)
                    } else {
                        DisclosureGroup(media.title) {
                            ForEach(media.seasons ?? [], id: \.number) { season in
                                DisclosureGroup("Season \(season.number)") {
                                    ForEach(season.episodes) { episode in
                                        let item = CWorldQueueEntry(media: media, season: season.number, episode: episode)
                                        addButton(item, title: item.selection.title)
                                    }
                                }
                            }
                        }
                    }
                }
            }.searchable(text: $query, prompt: "Find a movie or show")
                .navigationTitle("Add to Up Next")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
    private func addButton(_ item: CWorldQueueEntry, title: String) -> some View {
        let added = remote.controllingMac ? (remote.snapshot?.queue ?? []).contains {
            $0.mediaID == item.selection.mediaID && $0.season == item.selection.season && $0.episode == item.selection.episode
        } : host.queue.contains { $0.selection.key == item.selection.key }
        let current = remote.controllingMac
            ? remote.snapshot?.mediaID == item.selection.mediaID && remote.snapshot?.season == item.selection.season && remote.snapshot?.episode == item.selection.episode
            : host.mediaID == item.selection.mediaID && host.season == item.selection.season && host.episode == item.selection.episode
        return Button { host.enqueue(item) } label: {
            HStack { Text(title); Spacer(); Image(systemName: current ? "play.fill" : added ? "checkmark" : "plus.circle") }
        }.disabled(added || current)
    }
}
