//
//  CWorldIOSTests.swift
//  CWorldIOSTests
//
//  Created by Pierce on 9/9/26.
//

import Foundation
import Testing
import UIKit
import AVFoundation
import ImageIO
import Combine
import SwiftUI
@testable import CWorldIOS

private final class MacFixtureBundleMarker: NSObject {}

@Suite(.serialized)
@MainActor
struct CWorldIOSTests {

    #if !targetEnvironment(macCatalyst)
    @Test func liveActivityArtworkUsesRetinaPixelsAndSmallPayload() throws {
        let source = UIGraphicsImageRenderer(size: CGSize(width: 640, height: 360)).image { context in
            UIColor.systemMint.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 640, height: 360))
        }
        let data = try #require(CWorldWatchingArtwork.encodedImage(source))
        let decoded = try #require(UIImage(data: data, scale: 3))
        #expect(decoded.cgImage?.width == 192)
        #expect(decoded.cgImage?.height == 132)
        #expect(decoded.size == CGSize(width: 64, height: 44))
        let state = CWorldWatchingAttributes.ContentState(title: String(repeating: "E", count: 120), show: String(repeating: "S", count: 100),
            status: "On your TV", queued: 10, hasNext: true, elapsed: 100, duration: 1400, playing: true,
            updatedAt: Date(), thumbnail: nil, artworkFilename: UUID().uuidString + ".jpg")
        #expect(try JSONEncoder().encode(state).count < 1000)
        #expect(CWorldWatchingArtwork.url(for: "../outside.jpg") == nil)
    }

    @Test func liveActivityNextActionReachesPlaybackHost() async throws {
        let host = CWorldPlaybackHost.shared
        host.stop()
        defer { host.stop() }
        var advances = 0
        host.skipNext = { advances += 1 }
        _ = try await CWorldLiveNextIntent().perform()
        #expect(advances == 1)
    }

    @Test func liveActivityExtensionIsEmbeddedAndEnabled() throws {
        #expect(Bundle.main.object(forInfoDictionaryKey: "NSSupportsLiveActivities") as? Bool == true)
        let plugins = try #require(Bundle.main.builtInPlugInsURL)
        let extensionURL = plugins.appendingPathComponent("CWorldWatchingWidget.appex")
        let bundle = try #require(Bundle(url: extensionURL))
        let configuration = try #require(bundle.object(forInfoDictionaryKey: "NSExtension") as? [String: Any])
        #expect(configuration["NSExtensionPointIdentifier"] as? String == "com.apple.widgetkit-extension")
    }
    #endif

    @Test func tvRemoteFitsPhoneAndIntermissionRenders() async throws {
        let host = CWorldPlaybackHost.shared
        host.stop()
        defer { host.stop() }
        host.title = "S1E2 · A quiet evening"
        host.showTitle = "CearaWorld preview"
        host.enqueue(CWorldQueueEntry(media: try media("next-movie", title: "Up Next Movie")))
        let scene = try #require(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let previousWindow = scene.windows.first(where: \.isKeyWindow)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        window.rootViewController = UIHostingController(rootView: CWorldTVRemoteView().environmentObject(AppModel()).frame(width: 393, height: 852))
        window.isHidden = false
        defer { window.isHidden = true; previousWindow?.makeKeyAndVisible() }
        try await Task.sleep(for: .milliseconds(300))
        window.layoutIfNeeded()
        let image = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
        #expect(image.size == CGSize(width: 393, height: 852))
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("TVCompanionQA")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try #require(image.pngData()).write(to: directory.appendingPathComponent("remote.png"))
        let display = ExternalDisplaySession(readIdle: { false }, writeIdle: { _ in })
        display.connect(id: "intermission-test")
        display.attach(AVPlayer()) { _ in }
        host.isIntermission = true
        window.frame = CGRect(x: 0, y: 0, width: 1280, height: 720)
        window.rootViewController = UIHostingController(rootView: CWorldTVView(session: display, displayID: "intermission-test").frame(width: 1280, height: 720))
        try await Task.sleep(for: .milliseconds(200))
        let tv = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
        try #require(tv.pngData()).write(to: directory.appendingPathComponent("intermission.png"))
        print("TV_COMPANION_QA: \(directory.path)")
    }

    @Test func upNextRejectsDuplicatesAndCurrentTitleAndClearsOnStop() throws {
        let host = CWorldPlaybackHost.shared
        host.stop()
        defer { host.stop() }
        let first = CWorldQueueEntry(media: try media("queue-one"))
        let second = CWorldQueueEntry(media: try media("queue-two"))
        host.enqueue(first)
        host.enqueue(CWorldQueueEntry(media: try media("queue-one")))
        host.enqueue(second)
        #expect(host.queue.map(\.selection.mediaID) == ["queue-one", "queue-two"])
        host.queue.move(fromOffsets: IndexSet(integer: 1), toOffset: 0)
        #expect(host.queue.first?.selection == second.selection)
        host.stop(clearQueue: false)
        #expect(host.queue.count == 2)
        host.stop()
        #expect(host.queue.isEmpty)
        host.mediaID = first.selection.mediaID
        host.enqueue(first)
        #expect(host.queue.isEmpty)
    }

    @Test func tvDisconnectPreservesSessionAndOffersRecovery() async throws {
        let host = CWorldPlaybackHost.shared
        let display = ExternalDisplaySession.shared
        host.stop()
        let id = "recovery-\(UUID())"
        defer { host.stop(); display.disconnect(id: id) }
        let player = AVPlayer()
        host.player = player
        #expect(display.connect(id: id))
        // Let the same Combine delivery used by a screen connection run.
        try await Task.sleep(for: .milliseconds(50))
        host.toggleIntermission()
        #expect(host.isIntermission)
        #expect(host.player === player)
        display.disconnect(id: id)
        try await eventually { host.connectionLost }
        #expect(host.player === player)
        #expect(player.rate == 0)
        host.stop()
        #expect(!host.connectionLost)
        #expect(!host.isIntermission)
    }

    @Test func minimizingPlaybackPreservesPlayerUntilExplicitStop() {
        let host = CWorldPlaybackHost.shared
        defer { host.stop() }
        let player = AVPlayer()
        host.player = player
        host.surface = AnyView(Text("Playback fixture"))
        host.minimized = true
        #expect(host.player === player)
        #expect(host.surface != nil)
        host.minimized = false
        #expect(host.player === player)
        host.stop()
        #expect(host.player == nil)
        #expect(host.surface == nil)
        #expect(!host.minimized)
    }

    @Test func nextEpisodeCountdownFollowsPlaybackTimeAndShortOutros() {
        let markers = EpisodeSkipMarkers(introStart: nil, introEnd: nil, outroStart: 600)
        #expect(markers.nextEpisodeCountdown(at: 599, duration: 700) == nil)
        #expect(markers.nextEpisodeCountdown(at: 600, duration: 700) == 5)
        #expect(markers.nextEpisodeCountdown(at: 602, duration: 700) == 3)
        #expect(markers.nextEpisodeCountdown(at: 602, duration: 700) == 3)
        #expect(markers.nextEpisodeCountdown(at: 605, duration: 700) == 0)
        #expect(markers.nextEpisodeCountdown(at: 620, duration: 700) == 0)
        #expect(markers.nextEpisodeCountdown(at: 600, duration: 602) == 2)
        #expect(markers.nextEpisodeCountdown(at: 602, duration: 602) == 0)
        #expect(markers.nextEpisodeCountdown(at: .nan, duration: 700) == nil)
        #expect(markers.nextEpisodeCountdown(at: 600, duration: .infinity) == nil)
    }

    #if targetEnvironment(macCatalyst)
    @Test func catalystCanPersistItsLoginTokenInKeychain() throws {
        let service = "com.cearaworld.cworld.mac.tests.\(UUID().uuidString)"
        let store = KeychainStore(service: service, tokenAccount: "test-token")
        defer { store.deleteToken() }
        store.deleteToken()
        try store.saveToken("private-test-value")
        #expect(store.readToken() == "private-test-value")
        store.deleteToken()
        #expect(store.readToken() == nil)
    }
    #endif

    @Test func macPreferencesAreScopedAndPersistWithoutCrossingProfiles() throws {
        let suite = "cworld.mac.tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let preferences = MacDesktopPreferences(defaults: defaults)
        preferences.load(server: "https://one.invalid", userID: 1, profileID: 2)
        preferences.update { $0.palette = "Rose"; $0.reviews["movie"] = .init(text: "A review", rating: 4, watchedDate: "2026-09-11", watchlisted: true) }
        preferences.load(server: "https://one.invalid", userID: 1, profileID: 3)
        #expect(preferences.settings.palette == "Sky")
        #expect(preferences.settings.reviews.isEmpty)
        preferences.load(server: "https://two.invalid", userID: 1, profileID: 2)
        #expect(preferences.settings.reviews.isEmpty)
        preferences.load(server: "https://one.invalid", userID: 1, profileID: 2)
        #expect(preferences.settings.palette == "Rose")
        #expect(preferences.settings.reviews["movie"]?.rating == 4)
        preferences.load(server: "https://one.invalid", userID: nil, profileID: nil)
        preferences.update { $0.palette = "Forest" }
        #expect(preferences.settings.palette == "Sky")
    }

    @Test func desktopOrderPagingAndExactEpisodeSelection() throws {
        let catalog = [try media("new"), try media("perfectblue"), try media("stevenuniverse", type: "show")]
        let ordered = MacDesktopCatalog.ordered(catalog, reference: ["steven-universe", "perfect-blue"])
        #expect(ordered.map(\.id) == ["stevenuniverse", "perfectblue", "new"])
        #expect(MacDesktopCatalog.page(ordered, index: 999, size: 2).map(\.id) == ["new"])
        #expect(MacDesktopCatalog.page(ordered, index: -1, size: 2).count == 2)
        #expect(MacDesktopCatalog.page(ordered, index: 0, size: 0).isEmpty)
        #expect(MacDesktopCatalog.order.count >= 62)
        #expect(MacPlaybackSelection.first(catalog[0])?.playbackID == "new")
        #expect(MacPlaybackSelection.first(catalog[2]) == nil)
    }

    @Test func desktopRequestsUseExistingAuthenticatedAPIAndProfilePayload() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel(); StubURLProtocol.respond = nil }
        let client = try CWorldAPIClient(baseURLString: "https://fixture.invalid", token: "fixture", session: session)
        client.profileID = 9
        StubURLProtocol.respond = { request in
            #expect(request.url?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) == "api/send-request")
            #expect(request.httpMethod == "POST")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Token fixture")
            #expect(request.value(forHTTPHeaderField: "X-Profile-Id") == "9")
            return (200, Data(#"{"success":true}"#.utf8))
        }
        #expect(try await client.sendMediaRequest("A movie", language: "English subtitles"))
        let payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(ProfileUpdate(name: "New name"))) as? [String: String]
        #expect(payload == ["name": "New name"])
    }

    #if targetEnvironment(macCatalyst)
    @Test func desktopBackgroundModesFavoritesAndLegacyPreferencesPersist() throws {
        let suite = "cworld.background.tests.\(UUID())"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let preferences = MacDesktopPreferences(defaults: defaults)
        preferences.load(server: "https://fixture.invalid", userID: 1, profileID: 3)
        #expect(MacBackground.solidColors.count == 24)
        #expect(MacBackground.gradients.count == 18)
        #expect(MacBackground.hex(" #F0A ") == "#ff00aa")
        #expect(MacBackground.hex("#12xy00") == nil)
        #expect(MacBackground.hex("12345") == nil)
        for mode in MacBackground.Mode.allCases {
            let background = MacBackground(mode: mode, start: "#004aad", end: "#ff66c4")
            preferences.update { $0.background = background; $0.favoriteBackgrounds = Array(MacBackground.gradients.prefix(6)) }
            let reloaded = MacDesktopPreferences(defaults: defaults)
            reloaded.load(server: "https://fixture.invalid", userID: 1, profileID: 3)
            #expect(reloaded.settings.visualBackground == background)
            #expect(reloaded.settings.favoriteBackgrounds?.count == 6)
        }
        let legacy = try JSONDecoder().decode(MacDesktopPreferences.Settings.self, from: Data(#"{"palette":"Rose","profileBio":"Saved bio","reviews":{"test":{"text":"Keep me","rating":4,"watchedDate":"2026-09-11","watchlisted":true}},"reviewOrder":["test"]}"#.utf8))
        #expect(legacy.visualBackground == .legacy("Rose"))
        #expect(legacy.reviews["test"]?.text == "Keep me")
        #expect(legacy.reviews["test"]?.genres == nil)
        #expect(legacy.filmGrid == nil)
    }

    @Test func desktopArtworkAndExpandedGalleryStayBounded() throws {
        #expect(MacDesktopCatalog.desktopArtwork.count == 62)
        #expect(MacDesktopCatalog.newMedia.count == 7)
        for entry in MacDesktopCatalog.desktopArtwork.values {
            let url = try #require(Bundle.main.url(forResource: entry.image, withExtension: nil, subdirectory: "DesktopArtwork"))
            let source = try #require(CGImageSourceCreateWithURL(url as CFURL, nil))
            let properties = try #require(CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])
            let width = try #require(properties[kCGImagePropertyPixelWidth] as? Int)
            let height = try #require(properties[kCGImagePropertyPixelHeight] as? Int)
            #expect(max(width, height) <= 3072)
            #expect(width > height)
        }
        for width: CGFloat in [1200, 1440, 1728] {
            let size = CGSize(width: min(1400, width - 64) - 354, height: width == 1200 ? 555 : 650)
            for selected in 0..<6 {
                let main = MacGalleryGeometry.frame(index: selected, selected: selected, size: size, windowWidth: width)
                #expect(main.width == main.height)
                #expect(main.maxX <= size.width)
                #expect(main.maxY <= size.height)
                for index in 0..<6 where index != selected {
                    let rail = MacGalleryGeometry.frame(index: index, selected: selected, size: size, windowWidth: width)
                    #expect(!main.intersects(rail))
                    #expect(rail.maxX <= size.width)
                    #expect(rail.maxY <= size.height)
                }
            }
        }
    }

    @Test func catalystDesktopScreensRenderAtDesktopSizes() async throws {
        let bundle = Bundle(for: MacFixtureBundleMarker.self)
        let url = try #require(bundle.url(forResource: "mac-catalog", withExtension: "json"))
        let catalog = try JSONDecoder().decode([CWorldMedia].self, from: Data(contentsOf: url))
        #expect(!catalog.isEmpty)
        let fixture = try StartupFixture(catalog: catalog)
        defer { fixture.cleanUp() }
        StubURLProtocol.respond = { request in
            switch request.url?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) {
            case "api/auth/me": return (200, Data(#"{"user":{"id":1,"username":"CWorld","email":"Preview profile"}}"#.utf8))
            case "api/profiles": return (200, Data(#"[{"id":1,"name":"CWorld","avatar_url":null}]"#.utf8))
            case "api/catalog/v1": return (200, try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "mac-fixture", generatedAt: "", items: catalog)))
            case "api/progress", "api/watch-history": return (200, Data("[]".utf8))
            default: return (200, Data("[]".utf8))
            }
        }
        await fixture.model.restoreSession()
        let previousWindow = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow)
        let scene = try #require(previousWindow?.windowScene)
        let window = UIWindow(windowScene: scene)
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("CWorldMacQASnapshots")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { window.isHidden = true; previousWindow?.makeKeyAndVisible() }
        func capture(_ name: String, _ view: AnyView, size: CGSize = CGSize(width: 1440, height: 900)) async throws {
            window.frame = CGRect(origin: .zero, size: size)
            window.rootViewController = UIHostingController(rootView: view.ignoresSafeArea().environmentObject(fixture.model).preferredColorScheme(.dark))
            window.makeKeyAndVisible()
            try await Task.sleep(for: .milliseconds(900))
            window.layoutIfNeeded()
            let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
            let image = renderer.image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
            try #require(image.pngData()).write(to: directory.appendingPathComponent(name + ".png"))
            #expect(image.size.width >= 1200)
        }
        try await capture("mac-library", AnyView(MacDesktopView()))
        try await capture("mac-library-small", AnyView(MacDesktopView()), size: CGSize(width: 1200, height: 760))
        try await capture("mac-expanded", AnyView(MacDesktopView(initialExpandedID: catalog.first?.id)))
        try await capture("mac-colors", AnyView(MacDesktopView(presentsColorPicker: true)))
        try await capture("mac-recent", AnyView(MacDesktopView(presentsRecent: true)))
        try await capture("mac-reviews", AnyView(MacDesktopView(initialSection: .reviews)))
        let show = try #require(catalog.first { $0.type == "show" })
        try await capture("mac-title", AnyView(MacTitleView(media: show, initialSeason: nil, initialEpisode: nil, onBack: {}, onPlay: { _ in })))
        try await capture("mac-title-small", AnyView(MacTitleView(media: show, initialSeason: nil, initialEpisode: nil, onBack: {}, onPlay: { _ in })), size: CGSize(width: 1200, height: 760))
        try await capture("mac-episode-selected", AnyView(MacTitleView(media: show, initialSeason: 1, initialEpisode: 2, onBack: {}, onPlay: { _ in })))
        try await capture("mac-archive", AnyView(MacArchiveView(onBack: {}, onOpen: { _ in }, onPlay: { _ in })))
        try await capture("mac-profiles", AnyView(MacProfilePicker()))
        print("MAC_QA_SNAPSHOTS: \(directory.path)")
    }
    #endif

    @Test func externalDisplayPreservesPlayerAndRestoresIdleTimer() {
        var idle = false
        let session = ExternalDisplaySession(readIdle: { idle }, writeIdle: { idle = $0 })
        let player = AVPlayer()
        session.attach(player) { _ in }
        #expect(!idle)
        #expect(session.connect(id: "tv"))
        #expect(idle)
        #expect(!session.connect(id: "second-tv"))
        session.disconnect(id: "stale-tv")
        #expect(session.isConnected)
        session.disconnect(id: "tv")
        #expect(!session.isConnected)
        #expect(session.player === player)
        #expect(!idle)
        #expect(session.connect(id: "tv"))
        #expect(idle)
        session.detach(player)
        #expect(session.player == nil)
        #expect(!idle)
        #expect(session.isConnected)
    }

    @Test func externalDisplayRejectsStalePlaybackAndReadiness() {
        var idle = true
        let session = ExternalDisplaySession(readIdle: { idle }, writeIdle: { idle = $0 })
        let oldPlayer = AVPlayer()
        let currentPlayer = AVPlayer()
        var readyCount = 0
        session.connect(id: "tv")
        session.attach(oldPlayer) { _ in Issue.record("Old player received readiness") }
        session.attach(currentPlayer) { if $0 { readyCount += 1 } }
        let presentation = ExternalDisplaySession.Presentation(title: "Episode", subtitle: "Caption", state: .paused)
        session.update(presentation, for: currentPlayer)
        session.update(.init(title: "Stale"), for: oldPlayer)
        session.detach(oldPlayer)
        #expect(session.player === currentPlayer)
        #expect(session.presentation == presentation)
        session.reportReady(true, player: oldPlayer, displayID: "tv")
        session.reportReady(true, player: currentPlayer, displayID: "old-tv")
        #expect(readyCount == 0)
        session.reportReady(true, player: currentPlayer, displayID: "tv")
        #expect(readyCount == 1)
        session.disconnect(id: "tv")
        session.reportReady(true, player: currentPlayer, displayID: "tv")
        #expect(readyCount == 1)
        session.detach(currentPlayer)
        #expect(session.presentation == .init())
        #expect(idle) // Preserve an idle-timer lease held before TV playback.
    }

    @Test func externalDisplayConfigurationAndTVLayout() async throws {
        let manifest = try #require(Bundle.main.object(forInfoDictionaryKey: "UIApplicationSceneManifest") as? [String: Any])
        let configurations = try #require(manifest["UISceneConfigurations"] as? [String: Any])
        let external = try #require(configurations["UIWindowSceneSessionRoleExternalDisplayNonInteractive"] as? [[String: Any]])
        let delegateName = try #require(external.first?["UISceneDelegateClassName"] as? String)
        #expect(NSClassFromString(delegateName) == CWorldExternalDisplayDelegate.self)
        let session = ExternalDisplaySession(readIdle: { false }, writeIdle: { _ in })
        let renderer = ImageRenderer(content: CWorldTVView(session: session, displayID: "preview").frame(width: 1920, height: 1080))
        #expect(renderer.uiImage?.size == CGSize(width: 1920, height: 1080))
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("CWorldUITestSnapshots")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try #require(renderer.uiImage?.pngData()).write(to: directory.appendingPathComponent("tv-idle.png"))
        let url = try #require(Bundle.main.url(forResource: "CworldIntro", withExtension: "mp4"))
        let player = AVPlayer(url: url)
        player.isMuted = true
        player.allowsExternalPlayback = false
        var hasFrame = false
        session.connect(id: "preview")
        session.attach(player) { hasFrame = $0 }
        let previousWindow = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first(where: \.isKeyWindow)
        let scene = try #require(previousWindow?.windowScene)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 1920, height: 1080)
        let controller = UIHostingController(rootView: CWorldTVView(session: session, displayID: "preview"))
        window.rootViewController = controller
        window.isHidden = false
        defer {
            player.pause()
            session.detach(player)
            window.isHidden = true
            previousWindow?.makeKeyAndVisible()
        }
        player.play()
        for _ in 0..<40 {
            if hasFrame { break }
            try await Task.sleep(for: .milliseconds(100))
        }
        #expect(hasFrame)
        player.pause()
        session.update(.init(title: "S01E01 · A TV layout preview", subtitle: "TV-friendly subtitles stay with the video.\nEven when your phone shows the controls.", state: .paused, nextTitle: "S01E02 · The next episode"), for: player)
        try await Task.sleep(for: .milliseconds(100))
        window.layoutIfNeeded()
        let captionRenderer = UIGraphicsImageRenderer(bounds: window.bounds)
        let captionImage = captionRenderer.image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
        try #require(captionImage.pngData()).write(to: directory.appendingPathComponent("tv-captions.png"))
        print("TV_QA_SNAPSHOTS: \(directory.path)")
    }

    @Test func subtitlesSupportShortVTTAndSRTAndCueSettings() throws {
        let cues = SubtitleParser.parse("\u{FEFF}WEBVTT\r\n\r\nopening\r\n00:25.490 --> 00:29.240 align:start\r\n<v speaker><i>Hello &amp; welcome</i>\r\nSecond line\r\n\r\n2\r\n01:02:03,500 --> 01:02:05,000\r\nLong timestamp\r\n")
        #expect(cues.count == 2)
        #expect(cues[0].start == 25.49)
        #expect(cues[0].end == 29.24)
        #expect(cues[0].text == "Hello & welcome\nSecond line")
        #expect(cues[1].start == 3723.5)
        #expect(SubtitleParser.timestamp("01:02.300") == 62.3)
        #expect(SubtitleParser.timestamp("00:61.000") == nil)
        #expect(SubtitleParser.timestamp("nan:10.000") == nil)
        #expect(SubtitleParser.parse("00:02.000 --> 00:01.000\nInvalid\n").isEmpty)
        #expect(SubtitleParser.parse("NOTE ignored\n00:01.000 --> 00:02.000\nComment\n\n00:02.000 --> 00:03.000\nCaption").count == 1)
        #expect(SubtitleParser.parse("00:01.000 --> 00:03.000\nA\n\n00:02.000 --> 00:04.000\nB").count == 2)
    }

    @Test func subtitleLoaderReportsHTTPAndEmptyFileFailures() async throws {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel(); StubURLProtocol.respond = nil }
        let url = URL(string: "https://fixture.invalid/captions.vtt")!
        StubURLProtocol.respond = { _ in (404, Data("not found".utf8)) }
        await #expect(throws: SubtitleLoadError.self) { try await SubtitleLoader.load(url, session: session) }
        StubURLProtocol.respond = { _ in (200, Data("WEBVTT\n\n".utf8)) }
        await #expect(throws: SubtitleLoadError.self) { try await SubtitleLoader.load(url, session: session) }
        StubURLProtocol.respond = { _ in (200, Data("WEBVTT\n\n00:01.000 --> 00:02.000\nCaption\n".utf8)) }
        #expect(try await SubtitleLoader.load(url, session: session).first?.text == "Caption")
    }

    @Test func outroCompletionIncludesBoundaryAndEndButNotInvalidMarkers() {
        let markers = EpisodeSkipMarkers(introStart: nil, introEnd: nil, outroStart: 600)
        #expect(!markers.hasReachedOutro(at: 599.99, duration: 700))
        #expect(markers.hasReachedOutro(at: 600, duration: 700))
        #expect(markers.hasReachedOutro(at: 700, duration: 700))
        #expect(!markers.hasReachedOutro(at: 600, duration: 0))
        #expect(!markers.hasReachedOutro(at: .nan, duration: 700))
        #expect(!EpisodeSkipMarkers(introStart: nil, introEnd: nil, outroStart: nil).hasReachedOutro(at: 600, duration: 700))
    }

    @Test func continueWatchingUsesExactEpisodeAndHonorsLatestReset() throws {
        let show = try episodicMedia()
        let old = WatchProgressRecord(id: 1, showID: "playback-alias", season: 1, episode: 1, currentTime: 80, duration: 600, updatedAt: "2026-01-01")
        let recent = WatchProgressRecord(id: 2, showID: "playback-alias", season: 1, episode: 2, currentTime: 120, duration: 600, updatedAt: "2026-01-02")
        let entries = ContinueWatchingItem.make(catalog: [show], records: [old, recent])
        #expect(entries.count == 1)
        #expect(entries.first?.episode?.number == 2)
        #expect(entries.first?.playbackID == "playback-alias")
        #expect(entries.first?.progress.currentTime == 120)
        let reset = WatchProgressRecord(id: 2, showID: "playback-alias", season: 1, episode: 2, currentTime: 0, duration: 600, updatedAt: "2026-01-03")
        #expect(ContinueWatchingItem.make(catalog: [show], records: [old, reset]).isEmpty)
        let stale = WatchProgressRecord(id: 3, showID: "playback-alias", season: 9, episode: 9, currentTime: 120, duration: 600, updatedAt: "2026-01-04")
        #expect(ContinueWatchingItem.make(catalog: [show], records: [stale]).isEmpty)
    }

    @Test func clearingProgressWaitsForAutosaveAndSurvivesRefresh() async throws {
        let show = try episodicMedia()
        let fixture = try StartupFixture(catalog: [show])
        defer { fixture.cleanUp() }
        let catalog = try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "test", generatedAt: "", items: [show]))
        var server: [String: Any] = ["id": 1, "show_id": "playback-alias", "season": 1, "episode": 2, "current_time": 80, "duration": 600, "updated_at": "2026-01-01"]
        var posted: [Double] = []
        var allowAutosave = false
        var failReset = false
        var holdRefresh = false
        var refreshStarted = false
        var releaseRefresh = false
        StubURLProtocol.respond = { request in
            let path = request.url!.path
            if path.contains("auth/me") { return (200, Data(#"{"user":{"id":1,"username":"tester"}}"#.utf8)) }
            if path.contains("profiles") { return (200, Data(#"[{"id":7,"name":"Test"}]"#.utf8)) }
            if path.contains("catalog/v1") { return (200, catalog) }
            if path.contains("progress") {
                #expect(request.value(forHTTPHeaderField: "X-Profile-Id") == "7")
                if request.httpMethod == "POST" {
                    let body = try requestJSON(request)
                    let time = (body["current_time"] as! NSNumber).doubleValue
                    posted.append(time)
                    if time > 0 { while !allowAutosave { try await Task.sleep(for: .milliseconds(5)) } }
                    if time == 0 && failReset { return (500, Data("{}".utf8)) }
                    server["current_time"] = time
                    server["updated_at"] = "2026-01-03"
                    return (200, try JSONSerialization.data(withJSONObject: server))
                }
                let snapshot = try JSONSerialization.data(withJSONObject: [server])
                if holdRefresh {
                    refreshStarted = true
                    while !releaseRefresh { try await Task.sleep(for: .milliseconds(5)) }
                }
                return (200, snapshot)
            }
            return (200, Data("[]".utf8))
        }
        await fixture.model.restoreSession()
        let saving = Task { await fixture.model.saveWatchProgress(showID: "playback-alias", season: 1, episode: 2, currentTime: 120, duration: 600) }
        defer { saving.cancel() }
        try await eventually { posted == [120] }
        let clearing = Task { await fixture.model.clearWatchProgress(showID: "playback-alias", season: 1, episode: 2) }
        defer { clearing.cancel() }
        try await eventually { fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0 }
        #expect(posted == [120])
        // Foreground refresh can begin AFTER an optimistic clear while its
        // serialized POST is waiting. It must not restore the server's 80s.
        await fixture.model.refreshSharedWatchData()
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0)
        allowAutosave = true
        await saving.value
        #expect(await clearing.value)
        #expect(posted == [120, 0])
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0)
        let profile = try #require(fixture.model.activeProfile)
        await fixture.model.selectProfile(profile)
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0)
        #expect(ContinueWatchingItem.make(catalog: [show], records: Array(fixture.model.watchProgress.values)).isEmpty)
        // An explicit rewatch creates a fresh resume point. A failed reset is
        // surfaced and restores that point rather than silently losing it.
        await fixture.model.saveWatchProgress(showID: "playback-alias", season: 1, episode: 2, currentTime: 50, duration: 600)
        failReset = true
        #expect(!(await fixture.model.clearWatchProgress(showID: "playback-alias", season: 1, episode: 2)))
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 50)
        #expect(fixture.model.errorMessage != nil)
        failReset = false
        #expect(await fixture.model.removeFromContinueWatching(show))
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0)
        // A GET started before the clear must not restore its stale snapshot.
        server["current_time"] = 75
        holdRefresh = true
        let refreshing = Task { await fixture.model.selectProfile(profile) }
        defer { refreshing.cancel() }
        try await eventually { refreshStarted }
        #expect(await fixture.model.clearWatchProgress(showID: "playback-alias", season: 1, episode: 2, duration: 600))
        releaseRefresh = true
        await refreshing.value
        #expect(fixture.model.progress(for: "playback-alias", season: 1, episode: 2)?.currentTime == 0)
    }

    @Test func progressWritesStayWithTheirOriginalProfile() async throws {
        let fixture = try StartupFixture(catalog: [media("movie")])
        defer { fixture.cleanUp() }
        let catalog = try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "test", generatedAt: "", items: [media("movie")]))
        var postStarted = false
        var allowPost = false
        StubURLProtocol.respond = { request in
            let path = request.url!.path
            if path.contains("auth/me") { return (200, Data(#"{"user":{"id":1,"username":"tester"}}"#.utf8)) }
            if path.contains("catalog/v1") { return (200, catalog) }
            if path.contains("profiles") { return (200, Data(#"[{"id":7,"name":"First"},{"id":8,"name":"Second"}]"#.utf8)) }
            if path.contains("progress") && request.httpMethod == "POST" {
                #expect(request.value(forHTTPHeaderField: "X-Profile-Id") == "7")
                postStarted = true
                while !allowPost { try await Task.sleep(for: .milliseconds(5)) }
                return (200, Data(#"{"id":1,"show_id":"movie","current_time":80,"duration":600,"updated_at":"2026-01-01"}"#.utf8))
            }
            return (200, Data("[]".utf8))
        }
        await fixture.model.restoreSession()
        await fixture.model.selectProfile(fixture.model.profiles[0])
        let saving = Task { await fixture.model.saveWatchProgress(showID: "movie", currentTime: 80, duration: 600) }
        defer { saving.cancel() }
        try await eventually { postStarted }
        await fixture.model.selectProfile(fixture.model.profiles[1])
        allowPost = true
        await saving.value
        #expect(fixture.model.activeProfile?.id == 8)
        #expect(fixture.model.watchProgress.isEmpty)
    }

    private func requestJSON(_ request: URLRequest) throws -> [String: Any] {
        var data = request.httpBody ?? Data()
        if data.isEmpty, let stream = request.httpBodyStream {
            stream.open()
            defer { stream.close() }
            var buffer = [UInt8](repeating: 0, count: 4096)
            while true {
                let count = stream.read(&buffer, maxLength: buffer.count)
                if count <= 0 { break }
                data.append(contentsOf: buffer.prefix(count))
            }
        }
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }

    private func episodicMedia() throws -> CWorldMedia {
        try JSONDecoder().decode(CWorldMedia.self, from: Data(#"""
        {"id":"fixture-show","assetId":"fixture-show","type":"show","title":"Fixture Show","description":"",
         "artwork":{},"metadata":{"creator":"Director","rating":"","year":"","genres":[],"duration":"","ageRating":""},
         "seasons":[{"number":1,"episodes":[
          {"number":1,"title":"First","description":"","airDate":"","duration":"10m","playbackRef":{"mediaId":"playback-alias","season":1,"episode":1}},
          {"number":2,"title":"Second","description":"","airDate":"","duration":"10m","playbackRef":{"mediaId":"playback-alias","season":1,"episode":2}}
         ]}]}
        """#.utf8))
    }

    @Test func profilePhotosDecodeInlineAndUploadAtBoundedResolution() async throws {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let original = UIGraphicsImageRenderer(size: CGSize(width: 1600, height: 1200), format: format).image { context in
            UIColor.systemTeal.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 1600, height: 1200))
        }
        let data = try #require(original.pngData())
        let encoded = try ProfilePhotoEncoder.jpeg(from: data)
        let url = try #require(URL(string: "data:image/jpeg;base64,\(encoded.base64EncodedString())"))
        #expect(ImageCache.inlineImageData(from: url) == encoded)
        let image = try #require(await ImageCache.shared.image(for: url))
        let bitmap = try #require(image.cgImage)
        #expect(bitmap.width == 768)
        #expect(bitmap.height == 576)
        #expect(ImageCache.inlineImageData(from: URL(string: "data:text/plain;base64,aGVsbG8=")!) == nil)
        #expect(throws: ProfilePhotoError.self) { try ProfilePhotoEncoder.jpeg(from: Data("invalid".utf8)) }
    }

    @Test func profileSelectionCommitsBeforeIntroAndAvatarUpdatesStayVisible() async throws {
        let fixture = try StartupFixture(catalog: [media("cached")])
        defer { fixture.cleanUp() }
        let catalog = try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "test", generatedAt: "", items: []))
        var patchFails = false
        var patchCount = 0
        let avatar = "data:image/jpeg;base64,/9j/2Q=="
        StubURLProtocol.respond = { request in
            let path = request.url!.path
            if path.contains("auth/me") { return (200, Data(#"{"user":{"id":1,"username":"tester"}}"#.utf8)) }
            if path.contains("catalog/v1") { return (200, catalog) }
            if request.httpMethod == "PATCH" {
                patchCount += 1
                if patchFails { return (500, Data(#"{"detail":"Photo save failed"}"#.utf8)) }
                return (200, try JSONSerialization.data(withJSONObject: ["id": 7, "name": "Test", "avatar_url": avatar]))
            }
            if path.contains("profiles") { return (200, Data(#"[{"id":7,"name":"Test"},{"id":8,"name":"Other"}]"#.utf8)) }
            return (200, Data("[]".utf8))
        }
        await fixture.model.restoreSession()
        #expect(fixture.model.needsProfileSelection)
        #expect(!fixture.model.isShowingHomeIntro)
        let profile = try #require(fixture.model.profiles.first)
        var checkedOrdering = false
        let observation = fixture.model.$isShowingHomeIntro.sink { showing in
            if showing {
                #expect(fixture.model.activeProfile?.id == profile.id)
                checkedOrdering = true
            }
        }
        await fixture.model.selectProfile(profile, startHomeIntro: true)
        #expect(checkedOrdering)
        #expect(fixture.model.isShowingHomeIntro)
        fixture.model.finishHomeIntro()
        #expect(!fixture.model.isShowingHomeIntro)
        #expect(await fixture.model.updateProfileAvatar(profile, dataURL: avatar))
        #expect(patchCount == 1)
        #expect(fixture.model.activeProfile?.avatarURL == avatar)
        #expect(fixture.model.profiles.first?.avatarURL == avatar)
        patchFails = true
        #expect(!(await fixture.model.updateProfileAvatar(profile, dataURL: "different")))
        #expect(fixture.model.activeProfile?.avatarURL == avatar)
        #expect(fixture.model.errorMessage != nil)
        observation.cancel()
        fixture.model.logout()
        await fixture.model.selectProfile(profile, startHomeIntro: true)
        #expect(!fixture.model.isShowingHomeIntro)
        #expect(fixture.model.activeProfile == nil)
    }

    @Test func episodeSkipTimingsIncludeColdOpensAndMissingCatalogMarkers() throws {
        #expect(EpisodeSkipCatalog.episodes.count == 1252)
        let steven = EpisodeSkipCatalog.markers(mediaID: "steven-universe", season: 1, episode: 1, introEnd: nil, outroStart: nil)
        #expect(steven.introTarget(at: 1, duration: 700) == 25)
        #expect(!steven.canSkipOutro(at: 669, duration: 700))
        #expect(steven.canSkipOutro(at: 670, duration: 700))
        let laterSteven = EpisodeSkipCatalog.markers(mediaID: "steven-universe", season: 2, episode: 9, introEnd: nil, outroStart: nil)
        #expect(laterSteven.introEnd == 22)
        let mob = EpisodeSkipCatalog.markers(mediaID: "mob-psycho", season: 1, episode: 2, introEnd: nil, outroStart: nil)
        #expect(mob.introTarget(at: 60, duration: 1500) == nil)
        #expect(mob.introTarget(at: 61, duration: 1500) == 154)
        #expect(mob.introTarget(at: 154, duration: 1500) == nil)
        #expect(mob.introTarget(at: 62, duration: 0) == nil)
        #expect(mob.introTarget(at: .nan, duration: 1500) == nil)
        let noIntro = EpisodeSkipCatalog.markers(mediaID: "mob-psycho", season: 1, episode: 1, introEnd: nil, outroStart: nil)
        #expect(noIntro.introTarget(at: 1, duration: 1500) == nil)
        let future = EpisodeSkipCatalog.markers(mediaID: "unknown", season: 1, episode: 1, introEnd: 90, outroStart: 1200)
        #expect(future.introTarget(at: 1, duration: 1400) == 90)
        #expect(!future.canSkipOutro(at: 1200, duration: 900))
    }

    @Test func searchFindsTitlesEpisodesCodesAndNormalizesInput() throws {
        let source = Data(#"""
        {"id":"fixture-show","assetId":"fixture-show","type":"show","title":"Café Stories","description":"",
         "artwork":{},"metadata":{"creator":"Director","rating":"","year":"2026","genres":[],"duration":"","ageRating":""},
         "seasons":[{"number":2,"episodes":[
            {"number":3,"title":"The Glass House","description":"","airDate":"","duration":"22m","playbackRef":{"mediaId":"fixture-show","season":2,"episode":3}},
            {"number":4,"title":"Home Again","description":"","airDate":"","duration":"22m","playbackRef":{"mediaId":"fixture-show","season":2,"episode":4}}
         ]}]}
        """#.utf8)
        let show = try JSONDecoder().decode(CWorldMedia.self, from: source)
        let index = try CatalogSearchIndex(catalog: [show, media("movie", title: "Glass Moon")])
        #expect(index.search("  CAFE  ", scope: .titles).first?.media.id == "fixture-show")
        #expect(index.search("glass", scope: .episodes).first?.episode == 3)
        #expect(index.search("glass", scope: .titles).first?.media.id == "movie")
        #expect(index.search("cafe S02E03").first?.episode == 3)
        #expect(index.search("S2E3").first?.season == 2)
        #expect(index.search("season 2 episode 4").first?.episode == 4)
        #expect(index.search("the glass house").first?.title == "The Glass House")
        #expect(index.search("glass").map(\.id).count == 2)
        #expect(index.search("   ").isEmpty)
        #expect(index.search("!!!").isEmpty)
        #expect(index.search("nonexistent").isEmpty)
    }

    @Test func searchPresentationRendersWithResults() async throws {
        let fixture = try StartupFixture(catalog: [media("movie", title: "Glass Moon"), media("show", title: "Glass Stories", type: "show")])
        defer { fixture.cleanUp() }
        let previousWindow = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows).first(where: \.isKeyWindow)
        let scene = try #require(previousWindow?.windowScene)
        let window = UIWindow(windowScene: scene)
        window.frame = scene.coordinateSpace.bounds
        let controller = UIHostingController(rootView: CatalogSearchView(query: "glass").environmentObject(fixture.model))
        window.rootViewController = controller
        window.makeKeyAndVisible()
        defer { window.isHidden = true; previousWindow?.makeKeyAndVisible() }
        try await Task.sleep(for: .milliseconds(700))
        window.layoutIfNeeded()
        let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
        let image = renderer.image { _ in window.drawHierarchy(in: window.bounds, afterScreenUpdates: true) }
        let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("CWorldUITestSnapshots")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let file = directory.appendingPathComponent("search.png")
        try #require(image.pngData()).write(to: file)
        print("SEARCH_QA_SNAPSHOT: \(file.path)")
        #expect(image.size.width > 0)
    }

    @Test func mobileArtworkResourcesArePackagedAndHaveExpectedDimensions() throws {
        #expect(MobileArtwork.assets.count == 124)
        for (original, asset) in MobileArtwork.assets {
            let url = try #require(URL(string: original))
            let full = try #require(MobileArtwork.bundledURL(for: url))
            let thumbnail = try #require(MobileArtwork.bundledURL(for: url, maxPixelSize: 240))
            #expect(full.isFileURL && thumbnail.isFileURL)
            #expect(full.lastPathComponent == asset.image)
            #expect(thumbnail.lastPathComponent == asset.thumbnail)
            #expect(MobileArtwork.bundledURL(for: url, maxPixelSize: 321) == full)
            #expect(MobileArtwork.bundledURL(for: url, maxPixelSize: 320) == thumbnail)
            for (file, expectedWidth, expectedHeight) in [
                (full, asset.width, asset.height),
                (thumbnail, Int((Double(asset.width) * 320 / Double(max(asset.width, asset.height))).rounded()),
                 Int((Double(asset.height) * 320 / Double(max(asset.width, asset.height))).rounded()))
            ] {
                let source = try #require(CGImageSourceCreateWithURL(file as CFURL, nil))
                let properties = try #require(CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])
                #expect(properties[kCGImagePropertyPixelWidth] as? Int == expectedWidth)
                #expect(properties[kCGImagePropertyPixelHeight] as? Int == expectedHeight)
            }
        }
    }

    @Test func mobileArtworkDecodesNativelyAtRequestedSize() async throws {
        let original = try #require(MobileArtwork.assets.keys.sorted().first.flatMap(URL.init(string:)))
        let local = try #require(MobileArtwork.bundledURL(for: original, maxPixelSize: 240))
        let image = try #require(await ImageCache.shared.image(for: local, maxPixelSize: 240))
        let bitmap = try #require(image.cgImage)
        #expect(max(bitmap.width, bitmap.height) == 240)
        #expect(ImageCache.decodedMemoryCost(image) == bitmap.bytesPerRow * bitmap.height)
        let largeLocal = try #require(MobileArtwork.bundledURL(for: original, maxPixelSize: 1024))
        let largeImage = try #require(await ImageCache.shared.image(for: largeLocal, maxPixelSize: 1024))
        let largeBitmap = try #require(largeImage.cgImage)
        #expect(max(largeBitmap.width, largeBitmap.height) == 1024)
    }

    @Test func newMediaCardsDecodeAtRetinaResolution() async throws {
        let original = try #require(URL(string: "https://cearaworld.com/images/cardimages/stevenUniverseLogo1.svg"))
        let asset = try #require(MobileArtwork.assets[original.absoluteString])
        for (scale, largePixels, smallPixels) in [(CGFloat(1), 240, 118), (CGFloat(2), 480, 236), (CGFloat(3), 720, 354)] {
            let large = ArchiveView.artworkPixelSize(width: 240, height: 240, displayScale: scale)
            let small = ArchiveView.artworkPixelSize(width: 118, height: 112, displayScale: scale)
            #expect(large == largePixels)
            #expect(small == smallPixels)
            for pixels in [large, small] {
                let local = try #require(MobileArtwork.bundledURL(for: original, maxPixelSize: pixels))
                #expect(local.lastPathComponent == (pixels <= 320 ? asset.thumbnail : asset.image))
                let image = try #require(await ImageCache.shared.image(for: local, maxPixelSize: pixels))
                let bitmap = try #require(image.cgImage)
                #expect(bitmap.width == pixels)
                #expect(bitmap.height == pixels)
            }
        }
        #expect(ArchiveView.artworkPixelSize(width: 112, height: 118, displayScale: 3) == 354)
        #expect(ArchiveView.artworkPixelSize(width: 118.5, height: 112, displayScale: 3) == 356)
    }

    @Test func unknownArtworkKeepsExistingFallback() throws {
        let unknown = try #require(URL(string: "https://cearaworld.com/images/future-artwork.svg"))
        #expect(MobileArtwork.bundledURL(for: unknown) == nil)
        let raster = try #require(URL(string: "https://cearaworld.com/images/photo.jpg"))
        #expect(MobileArtwork.bundledURL(for: raster) == nil)
    }

    @Test func catalogAcceptsLegacySubtitleFields() throws {
        let data = Data(#"""
        {
          "schemaVersion": 1,
          "catalogRevision": "test",
          "generatedAt": "2026-01-01T00:00:00Z",
          "items": [{
            "id": "demo-show",
            "assetId": "demo-show",
            "type": "show",
            "title": "Demo Show",
            "description": "",
            "artwork": {"card": null, "poster": null, "backdrop": null},
            "metadata": {"creator": "", "rating": "", "year": "", "genres": [], "duration": "", "ageRating": ""},
            "subtitles": false,
            "subtitleTracks": [],
            "seasons": [{
              "number": 1,
              "episodes": [{
                "number": 1,
                "title": "Pilot",
                "description": "",
                "airDate": "",
                "duration": "22m",
                "playbackRef": {"mediaId": "demo-show", "season": 1, "episode": 1},
                "subtitles": []
              }]
            }]
          }]
        }
        """#.utf8)

        let catalog = try JSONDecoder().decode(CatalogEnvelope.self, from: data)

        #expect(catalog.items.count == 1)
        #expect(catalog.items[0].rokuSubtitleTracks.isEmpty)
        #expect(catalog.items[0].seasons?[0].episodes[0].rokuSubtitles.isEmpty == true)
    }

    @Test func watchProgressUsesBackendFieldNames() throws {
        let payload = WatchProgressPayload(
            showId: "demo-show",
            season: 2,
            episode: 3,
            currentTime: 120.5,
            duration: 1320
        )
        let encoded = try JSONEncoder().encode(payload)
        let object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        #expect(object["show_id"] as? String == "demo-show")
        #expect(object["current_time"] as? Double == 120.5)
        #expect(object["duration"] as? Double == 1320)
        #expect(object["season"] as? Int == 2)
        #expect(object["episode"] as? Int == 3)
    }

    @Test func archiveSnapshotPreservesDatesFiltersAndPagination() throws {
        let catalog = try [
            media("a", title: "Alpha", date: "2025-01-01", rating: "4", type: "movie"),
            media("b", title: "Beta", date: "1/2/25", rating: "9", type: "show"),
            media("c", title: "Gamma", date: "1-2-25", rating: "9", type: "show"),
            media("d", title: "Delta", date: nil, rating: "", type: "movie")
        ]
        let newest = ArchiveCatalogSnapshot(catalog: catalog, pageSize: 3)
        #expect(newest.items.map(\.id) == ["b", "c", "a", "d"])
        #expect(newest.pages.map { $0.map(\.id) } == [["b", "c", "a"], ["d"]])
        #expect(newest.latest.map(\.id) == ["b", "c", "a"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, sort: .oldest).items.map(\.id) == ["d", "a", "b", "c"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, sort: .highestRated).items.map(\.id) == ["b", "c", "a", "d"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, sort: .lowestRated).items.map(\.id) == ["d", "a", "b", "c"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, sort: .alphabetical).items.map(\.id) == ["a", "b", "d", "c"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, query: " BETA ", type: .shows).items.map(\.id) == ["b"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, query: "director", type: .movies).items.map(\.id) == ["a", "d"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, query: "missing").pages.isEmpty)
    }

    @Test func archiveLegacyDatesKeepInsertionFallback() throws {
        let catalog = try (0..<7).map { try media(String($0), date: nil) }
        let snapshot = ArchiveCatalogSnapshot(catalog: catalog)
        #expect(snapshot.items.map(\.id) == ["6", "5", "4", "3", "2", "1", "0"])
        #expect(snapshot.pages.map(\.count) == [6, 1])
        #expect(snapshot.latest.map(\.id) == ["6", "5", "4"])
        #expect(ArchiveCatalogSnapshot(catalog: catalog, sort: .oldest).items.map(\.id) == catalog.map(\.id))
        #expect(ArchiveCatalogSnapshot().pages.isEmpty)
    }

    @Test func imageCacheChargesDecodedPixelsRegardlessOfJPEGSizeOrScale() throws {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: CGSize(width: 512, height: 512), format: format).image {
            UIColor.red.setFill()
            $0.fill(CGRect(x: 0, y: 0, width: 512, height: 512))
        }
        let bitmap = try #require(image.cgImage)
        let jpeg = try #require(image.jpegData(compressionQuality: 0.1))
        let expectedBytes = bitmap.bytesPerRow * bitmap.height
        #expect(ImageCache.decodedMemoryCost(image) == expectedBytes)
        #expect(expectedBytes > jpeg.count * 10)
        let scaled = UIImage(cgImage: bitmap, scale: 3, orientation: .up)
        #expect(ImageCache.decodedMemoryCost(scaled) == expectedBytes)
    }

    @Test func playerWaitsForFirstFrameAndResumeAndReportsBufferingAndFailure() {
        #expect(PlaybackDisplayState.resolve(itemStatus: .unknown, transport: .paused,
                                             hasFirstFrame: false, isSeekingToResume: false) == .preparing)
        #expect(PlaybackDisplayState.resolve(itemStatus: .readyToPlay, transport: .playing,
                                             hasFirstFrame: false, isSeekingToResume: false) == .preparing)
        #expect(PlaybackDisplayState.resolve(itemStatus: .readyToPlay, transport: .playing,
                                             hasFirstFrame: true, isSeekingToResume: true) == .preparing)
        #expect(PlaybackDisplayState.resolve(itemStatus: .readyToPlay, transport: .playing,
                                             hasFirstFrame: true, isSeekingToResume: false) == .playing)
        #expect(PlaybackDisplayState.resolve(itemStatus: .readyToPlay, transport: .waitingToPlayAtSpecifiedRate,
                                             hasFirstFrame: true, isSeekingToResume: false) == .buffering)
        #expect(PlaybackDisplayState.resolve(itemStatus: .readyToPlay, transport: .paused,
                                             hasFirstFrame: true, isSeekingToResume: false) == .paused)
        #expect(PlaybackDisplayState.resolve(itemStatus: .failed, transport: .playing,
                                             hasFirstFrame: true, isSeekingToResume: false) == .failed)
    }

    @Test func cachedStartupRefreshesCatalogBeforeValidationAndDoesNotWaitForHistory() async throws {
        let fixture = try StartupFixture(catalog: [media("cached")])
        defer { fixture.cleanUp() }
        var allowValidation = false
        var allowProgress = false
        var allowHistory = false
        var requested = Set<String>()
        let freshCatalog = try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "fresh",
                                                                   generatedAt: "", items: [media("fresh")]))
        StubURLProtocol.respond = { request in
            let path = "/" + request.url!.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/"
            requested.insert(path)
            switch path {
            case "/api/catalog/v1/": return (200, freshCatalog)
            case "/api/auth/me/":
                while !allowValidation { try await Task.sleep(for: .milliseconds(5)) }
                return (200, Data(#"{"user":{"id":1,"username":"tester"}}"#.utf8))
            case "/api/profiles/":
                while !allowValidation { try await Task.sleep(for: .milliseconds(5)) }
                return (200, Data(#"[{"id":7,"name":"Test"}]"#.utf8))
            case "/api/progress/":
                #expect(request.value(forHTTPHeaderField: "X-Profile-Id") == "7")
                while !allowProgress { try await Task.sleep(for: .milliseconds(5)) }
                return (200, Data(#"[{"id":1,"show_id":"fresh","current_time":120,"duration":600,"updated_at":"2026-01-01"}]"#.utf8))
            case "/api/history/":
                while !allowHistory { try await Task.sleep(for: .milliseconds(5)) }
                return (200, Data("[]".utf8))
            case "/api/playback/session/":
                return (200, Data(#"{"mediaId":"fresh","url":"https://fixture.invalid/video.mp4","expiresAt":"later"}"#.utf8))
            default: throw URLError(.unsupportedURL)
            }
        }
        let model = fixture.model
        #expect(model.isRestoringSession)
        #expect(model.canBrowseCachedCatalog)
        let restore = Task { await model.restoreSession() }
        defer { restore.cancel() }
        try await eventually { model.catalogRevision == "fresh" }
        #expect(model.isRestoringSession)
        #expect(requested.contains("/api/auth/me/"))
        #expect(requested.contains("/api/profiles/"))
        allowValidation = true
        try await eventually { !model.isRestoringSession && requested.contains("/api/history/") && requested.contains("/api/progress/") }
        #expect(model.activeProfile?.id == 7)
        var playbackReturned = false
        let playback = Task {
            _ = try await model.requestPlaybackSession(mediaID: "fresh")
            playbackReturned = true
        }
        defer { playback.cancel() }
        try await eventually { requested.contains("/api/playback/session/") }
        #expect(!playbackReturned)
        allowProgress = true
        try await eventually { playbackReturned }
        #expect(!allowHistory)
        #expect(model.progress(for: "fresh")?.currentTime == 120)
        allowHistory = true
        try await playback.value
        await restore.value
    }

    @Test func expiredSessionCannotBeRepopulatedByLateCatalogResponse() async throws {
        let fixture = try StartupFixture(catalog: [media("cached")])
        defer { fixture.cleanUp() }
        var releaseCatalog = false
        var catalogRequested = false
        let catalog = try JSONEncoder().encode(CatalogEnvelope(schemaVersion: 1, catalogRevision: "late",
                                                              generatedAt: "", items: [media("late")]))
        StubURLProtocol.respond = { request in
            if request.url!.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) == "api/catalog/v1" {
                catalogRequested = true
                while !releaseCatalog { try await Task.sleep(for: .milliseconds(5)) }
                return (200, catalog)
            }
            while !catalogRequested { try await Task.sleep(for: .milliseconds(5)) }
            return (401, Data(#"{"detail":"Expired"}"#.utf8))
        }
        let restore = Task { await fixture.model.restoreSession() }
        defer { restore.cancel() }
        try await eventually { fixture.model.token == nil }
        releaseCatalog = true
        await restore.value
        #expect(fixture.model.catalog.isEmpty)
        #expect(!fixture.model.isRestoringSession)
        #expect(fixture.model.errorMessage?.contains("expired") == true)
        await #expect(throws: CWorldAPIError.self) { try await fixture.model.requestPlaybackSession(mediaID: "cached") }
    }

    @Test func offlineStartupKeepsCachedBrowsingButCannotStartAuthenticatedPlayback() async throws {
        let fixture = try StartupFixture(catalog: [media("cached")])
        defer { fixture.cleanUp() }
        StubURLProtocol.respond = { _ in throw URLError(.notConnectedToInternet) }
        await fixture.model.restoreSession()
        #expect(fixture.model.canBrowseCachedCatalog)
        #expect(!fixture.model.isRestoringSession)
        #expect(fixture.model.isAuthenticated)
        #expect(fixture.model.errorMessage != nil)
        await #expect(throws: CWorldAPIError.self) { try await fixture.model.requestPlaybackSession(mediaID: "cached") }
    }

    private func media(_ id: String, title: String? = nil, date: String? = "2025-01-01",
                       rating: String = "", type: String = "movie") throws -> CWorldMedia {
        var object: [String: Any] = [
            "id": id, "assetId": id, "type": type, "title": title ?? id, "description": "",
            "artwork": [:], "metadata": ["creator": "Director", "rating": rating, "year": "",
                                            "genres": [], "duration": "", "ageRating": ""]
        ]
        object["dateAdded"] = date
        return try JSONDecoder().decode(CWorldMedia.self, from: JSONSerialization.data(withJSONObject: object))
    }

    private func eventually(_ condition: () -> Bool) async throws {
        let deadline = ContinuousClock.now + .seconds(5)
        while !condition(), ContinuousClock.now < deadline {
            try await Task.sleep(for: .milliseconds(5))
        }
        try #require(condition(), "Asynchronous condition did not complete")
    }
}

@MainActor
private final class StartupFixture {
    let model: AppModel
    private let defaults: UserDefaults
    private let suite: String
    private let keychain: TestTokenStore
    private let directory: URL
    private let session: URLSession

    init(catalog: [CWorldMedia]) throws {
        suite = "cworld.tests.\(UUID())"
        defaults = UserDefaults(suiteName: suite)!
        defaults.set("https://fixture.invalid", forKey: AppModel.apiBaseURLKey)
        defaults.set(try JSONEncoder().encode(CWorldUser(id: 1, username: "tester", email: nil)), forKey: "cworld.cachedUser")
        keychain = TestTokenStore()
        keychain.saveToken("test-token")
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(suite)
        let cache = CatalogCache(directory: directory)
        cache.save(CatalogEnvelope(schemaVersion: 1, catalogRevision: "cached", generatedAt: "", items: catalog))
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        session = URLSession(configuration: configuration)
        model = AppModel(defaults: defaults, keychain: keychain, catalogCache: cache, session: session)
    }

    func cleanUp() {
        model.logout()
        session.invalidateAndCancel()
        keychain.deleteToken()
        defaults.removePersistentDomain(forName: suite)
        try? FileManager.default.removeItem(at: directory)
        StubURLProtocol.respond = nil
    }
}

@MainActor
private final class TestTokenStore: TokenStore {
    private var token: String?
    func readToken() -> String? { token }
    func saveToken(_ token: String) { self.token = token }
    func deleteToken() { token = nil }
}

private final class StubURLProtocol: URLProtocol, @unchecked Sendable {
    @MainActor static var respond: ((URLRequest) async throws -> (Int, Data))?
    nonisolated(unsafe) private var loadingTask: Task<Void, Never>?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let request = request
        loadingTask = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                guard let respond = Self.respond else { throw URLError(.unsupportedURL) }
                let (status, data) = try await respond(request)
                guard !Task.isCancelled else { return }
                let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil,
                                               headerFields: ["Content-Type": "application/json"])!
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: data)
                client?.urlProtocolDidFinishLoading(self)
            } catch {
                if !Task.isCancelled { client?.urlProtocol(self, didFailWithError: error) }
            }
        }
    }

    override func stopLoading() { loadingTask?.cancel() }
}
