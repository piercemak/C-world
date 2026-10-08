import AppKit
import Sparkle

@objc(CWorldUpdaterBridge)
final class CWorldUpdaterBridge: NSObject {
    private var controller: SPUStandardUpdaterController?
    private var observation: NSKeyValueObservation?
    private let notification = Notification.Name("cworld.mac.updater.state")

    @objc func start() {
        guard controller == nil else { return }
        let controller = SPUStandardUpdaterController(startingUpdater: false, updaterDelegate: nil, userDriverDelegate: nil)
        self.controller = controller
        // Enable checks once for installations upgrading from the opt-in build.
        // Subsequent launches preserve any change made in the app menu.
        let defaults = UserDefaults.standard
        let migrationKey = "cworld.updater.automaticChecksDefault.v1"
        if !defaults.bool(forKey: migrationKey) {
            if !controller.updater.automaticallyChecksForUpdates {
                controller.updater.automaticallyChecksForUpdates = true
            }
            defaults.set(true, forKey: migrationKey)
        }
        observation = controller.updater.observe(\.canCheckForUpdates, options: [.initial, .new]) { [weak self] _, _ in
            self?.publishState()
        }
        controller.startUpdater()
        publishState()
    }

    @objc func checkForUpdates() { controller?.checkForUpdates(nil) }

    @objc func setAutomaticChecks(_ enabled: NSNumber) {
        controller?.updater.automaticallyChecksForUpdates = enabled.boolValue
        publishState()
    }

    private func publishState() {
        guard let updater = controller?.updater else { return }
        NotificationCenter.default.post(name: notification, object: nil, userInfo: [
            "canCheck": updater.canCheckForUpdates,
            "automaticChecks": updater.automaticallyChecksForUpdates
        ])
    }
}
