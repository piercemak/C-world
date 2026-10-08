import SwiftUI

@main
struct CWorldIOSApp: App {
    @UIApplicationDelegateAdaptor(CWorldAppDelegate.self) private var appDelegate
    @StateObject private var appModel = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .ignoresSafeArea()
                .environmentObject(appModel)
                .task {
                    #if targetEnvironment(macCatalyst) && CWORLD_LOCAL_DISTRIBUTION
                    CWorldMacUpdater.shared.start()
                    #endif
                    await appModel.restoreSession()
                }
                .onChange(of: scenePhase) { _, phase in
                    #if !targetEnvironment(macCatalyst)
                    if phase == .active { Task { await appModel.refreshSharedWatchData() } }
                    #endif
                }
        }
        #if targetEnvironment(macCatalyst)
        .defaultSize(width: 1440, height: 900)
        .commands { CWorldMacCommands() }
        #endif
    }
}
