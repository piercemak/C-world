import SwiftUI

@main
struct CWorldIOSApp: App {
    @UIApplicationDelegateAdaptor(CWorldAppDelegate.self) private var appDelegate
    @StateObject private var appModel = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .ignoresSafeArea()
                .environmentObject(appModel)
                .task {
                    await appModel.restoreSession()
                }
        }
        #if targetEnvironment(macCatalyst)
        .defaultSize(width: 1440, height: 900)
        .commands { CWorldMacCommands() }
        #endif
    }
}
