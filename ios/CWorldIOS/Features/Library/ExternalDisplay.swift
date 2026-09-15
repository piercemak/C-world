import AVKit
import Combine
import SwiftUI
import UIKit

/// A projection of the existing playback session, never a second player or progress writer.
@MainActor
final class ExternalDisplaySession: ObservableObject {
    static let shared = ExternalDisplaySession()

    struct Presentation: Equatable {
        var title = ""
        var subtitle = ""
        var state: PlaybackDisplayState = .preparing
        var message: String?
        var nextTitle: String?
    }

    @Published private(set) var displayID: String?
    @Published private(set) var player: AVPlayer?
    @Published private(set) var presentation = Presentation()
    private var readyHandler: ((Bool) -> Void)?
    private var previousIdleSetting: Bool?
    private let readIdle: @MainActor () -> Bool
    private let writeIdle: @MainActor (Bool) -> Void

    var isConnected: Bool { displayID != nil }

    init(readIdle: @escaping @MainActor () -> Bool = { UIApplication.shared.isIdleTimerDisabled },
         writeIdle: @escaping @MainActor (Bool) -> Void = { UIApplication.shared.isIdleTimerDisabled = $0 }) {
        self.readIdle = readIdle
        self.writeIdle = writeIdle
    }

    @discardableResult
    func connect(id: String) -> Bool {
        guard displayID == nil || displayID == id else { return false }
        displayID = id
        updateIdleTimer()
        return true
    }

    func disconnect(id: String) {
        guard displayID == id else { return }
        // Do not recreate, seek, or stop the player when its rendering surface moves.
        displayID = nil
        updateIdleTimer()
    }

    func attach(_ player: AVPlayer, ready: @escaping (Bool) -> Void) {
        self.player = player
        readyHandler = ready
        updateIdleTimer()
    }

    func update(_ value: Presentation, for player: AVPlayer) {
        guard self.player === player, presentation != value else { return }
        presentation = value
    }

    func reportReady(_ ready: Bool, player: AVPlayer, displayID: String) {
        guard self.player === player, self.displayID == displayID else { return }
        readyHandler?(ready)
    }

    func detach(_ player: AVPlayer) {
        guard self.player === player else { return }
        self.player = nil
        readyHandler = nil
        presentation = Presentation()
        updateIdleTimer()
    }

    private func updateIdleTimer() {
        if isConnected && player != nil {
            if previousIdleSetting == nil { previousIdleSetting = readIdle() }
            writeIdle(true)
        } else if let previousIdleSetting {
            writeIdle(previousIdleSetting)
            self.previousIdleSetting = nil
        }
    }
}

@MainActor
final class CWorldAppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     configurationForConnecting session: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        if session.role == .windowExternalDisplayNonInteractive {
            let configuration = UISceneConfiguration(name: "CWorld TV", sessionRole: session.role)
            configuration.delegateClass = CWorldExternalDisplayDelegate.self
            return configuration
        }
        return UISceneConfiguration(name: nil, sessionRole: session.role)
    }
}

@MainActor
final class CWorldExternalDisplayDelegate: NSObject, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard session.role == .windowExternalDisplayNonInteractive,
              let windowScene = scene as? UIWindowScene,
              ExternalDisplaySession.shared.connect(id: session.persistentIdentifier) else { return }
        let window = UIWindow(windowScene: windowScene)
        window.backgroundColor = .black
        window.rootViewController = UIHostingController(rootView:
            CWorldTVView(session: .shared, displayID: session.persistentIdentifier))
        window.isHidden = false
        self.window = window
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        ExternalDisplaySession.shared.disconnect(id: scene.session.persistentIdentifier)
        window?.isHidden = true
        window?.windowScene = nil
        window = nil
    }
}

struct CWorldTVView: View {
    @ObservedObject var session: ExternalDisplaySession
    @ObservedObject private var host = CWorldPlaybackHost.shared
    let displayID: String

    var body: some View {
        GeometryReader { geometry in
            let margin = max(24, min(geometry.size.width, geometry.size.height) * 0.06)
            ZStack {
                Color.black
                if let player = session.player {
                    CWorldPlayerSurface(player: player) { ready in
                        session.reportReady(ready, player: player, displayID: displayID)
                    }
                    .id(ObjectIdentifier(player))

                    if host.isIntermission {
                        ZStack {
                            if let image = host.artworkImage {
                                Image(uiImage: image).resizable().scaledToFill()
                                    .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                            }
                            Color.black.opacity(0.68)
                            VStack(spacing: 18) {
                                Text("CEARAWORLD").font(.system(size: 20, weight: .semibold)).tracking(6).foregroundStyle(.mint)
                                Image(systemName: "cup.and.saucer.fill").font(.system(size: 44))
                                Text("Back shortly").font(.system(size: 48, weight: .semibold, design: .rounded))
                                Text(host.showTitle).font(.title).lineLimit(2)
                                Text(host.title).font(.title3).foregroundStyle(.white.opacity(0.65)).lineLimit(2)
                            }.padding(margin)
                        }
                    } else if session.presentation.state == .failed {
                        Color.black
                        status("Playback unavailable", detail: "Use your iPhone to retry.")
                    } else {
                        if session.presentation.state == .preparing || session.presentation.state == .buffering {
                            ProgressView(session.presentation.state == .preparing ? "Preparing playback…" : "Buffering…")
                                .tint(.white).foregroundStyle(.white)
                                .padding(20).background(.black.opacity(0.8), in: RoundedRectangle(cornerRadius: 16))
                        }
                        VStack {
                            if session.presentation.state == .paused {
                                HStack {
                                    Text(session.presentation.title).lineLimit(2)
                                    Spacer()
                                    Label("Paused", systemImage: "pause.fill")
                                }
                                .font(.system(size: max(20, geometry.size.height * 0.032), weight: .semibold))
                                .padding(18).background(.black.opacity(0.75), in: RoundedRectangle(cornerRadius: 16))
                            }
                            Spacer()
                            if !session.presentation.subtitle.isEmpty {
                                Text(session.presentation.subtitle)
                                    .font(.system(size: max(22, geometry.size.height * 0.042), weight: .semibold, design: .rounded))
                                    .multilineTextAlignment(.center)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .padding(.horizontal, 20).padding(.vertical, 10)
                                    .background(.black.opacity(0.72), in: RoundedRectangle(cornerRadius: 10))
                                    .frame(maxWidth: geometry.size.width * 0.84)
                            }
                            if let message = session.presentation.message {
                                Text(message).font(.system(size: 18)).padding(10)
                                    .background(.black.opacity(0.8), in: Capsule())
                            }
                            if let nextTitle = session.presentation.nextTitle {
                                Text("Up next · \(nextTitle)")
                                    .font(.system(size: 18, weight: .medium)).lineLimit(2)
                                    .padding(12).background(.black.opacity(0.8), in: RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(margin)
                    }
                } else {
                    status("CWorld", detail: "Choose a movie or episode on your iPhone.")
                }
            }
            .foregroundStyle(.white)
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .ignoresSafeArea()
    }

    private func status(_ title: String, detail: String) -> some View {
        VStack(spacing: 18) {
            Image(systemName: "tv").font(.system(size: 48, weight: .light))
            Text(title).font(.system(size: 38, weight: .semibold, design: .rounded))
            Text(detail).font(.system(size: 22)).foregroundStyle(.white.opacity(0.65))
        }
        .multilineTextAlignment(.center).padding(40)
    }
}
