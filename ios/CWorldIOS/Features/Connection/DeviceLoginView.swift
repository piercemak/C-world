import SwiftUI

struct DeviceLoginView: View {
    @EnvironmentObject private var appModel: AppModel
    @State private var session: DeviceLoginStart?
    @State private var statusMessage = "Starting device login…"
    @State private var isLoading = true

    var body: some View {
        Form {
            Section("Approve this device") {
                if let session {
                    Text("Enter this code at the CWorld device-login page:")
                    Text(session.deviceCode)
                        .font(.system(.title2, design: .monospaced).weight(.bold))
                        .textSelection(.enabled)
                    Link("Open approval page", destination: session.verificationURL)
                    Text("This code expires in about \(session.expiresIn / 60) minutes.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(statusMessage)
                    .foregroundStyle(.secondary)
            }

            if isLoading {
                ProgressView()
            }
        }
        .scrollContentBackground(.hidden)
        .background(CWorldTheme.background)
        .navigationTitle("Device Login")
        .task {
            await startAndPoll()
        }
    }

    private func startAndPoll() async {
        do {
            let newSession = try await appModel.beginDeviceLogin()
            session = newSession
            statusMessage = "Waiting for approval…"
            isLoading = false

            while !Task.isCancelled {
                try await Task.sleep(for: .seconds(2))
                let response = try await appModel.pollDeviceLogin(pollToken: newSession.pollToken)
                if response.status == "approved" {
                    statusMessage = "Approved. Loading your CWorld library…"
                    await appModel.completeDeviceLogin(response)
                    return
                }
                if response.status == "expired" {
                    statusMessage = response.error ?? "This device code expired."
                    return
                }
            }
        } catch {
            isLoading = false
            statusMessage = error.localizedDescription
        }
    }
}
