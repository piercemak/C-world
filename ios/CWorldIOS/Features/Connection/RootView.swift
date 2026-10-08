import SwiftUI
import UIKit

struct RootView: View {
    @EnvironmentObject private var appModel: AppModel

    var body: some View {
        ZStack {
            CWorldTheme.background.ignoresSafeArea()
            Group {
                if appModel.isRestoringSession && !appModel.canBrowseCachedCatalog {
                    ProgressView("Restoring CWorld session…")
                        .tint(.white)
                        .foregroundStyle(.white)
                } else if appModel.isAuthenticated && appModel.needsProfileSelection {
                    #if targetEnvironment(macCatalyst)
                    MacProfilePicker()
                    #else
                    ProfilePickerView()
                    #endif
                } else if appModel.isAuthenticated && appModel.activeProfile != nil && appModel.isShowingHomeIntro {
                    CWorldIntroView {
                        appModel.finishHomeIntro()
                    }
                } else if appModel.isAuthenticated {
                    #if targetEnvironment(macCatalyst)
                    MacDesktopView()
                    #else
                    CWorldHomeView()
                    #endif
                } else {
                    ConnectionView()
                }
            }
            .animation(.easeInOut(duration: 1.2), value: appModel.isShowingHomeIntro)
            .ignoresSafeArea()
        }
        .safeAreaInset(edge: .bottom) {
            if appModel.canBrowseCachedCatalog && !appModel.isShowingHomeIntro {
                if appModel.isRestoringSession {
                    HStack(spacing: 8) {
                        ProgressView().tint(.white)
                        Text("Reconnecting… You can browse saved titles.")
                    }
                    .font(.caption)
                    .foregroundStyle(.white)
                    .padding(10)
                    .frame(maxWidth: .infinity)
                    .background(.black.opacity(0.85))
                } else if let error = appModel.errorMessage {
                    HStack {
                        Text(error).font(.caption)
                        Spacer()
                        Button("Retry") { Task { await appModel.retryConnection() } }
                        Button { appModel.dismissError() } label: {
                            Image(systemName: "xmark")
                        }
                        .accessibilityLabel("Dismiss connection message")
                    }
                    .padding(10)
                    .background(.black.opacity(0.85))
                    .foregroundStyle(.white)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in
            Task { await ImageCache.shared.clearMemory() }
        }
        .preferredColorScheme(.dark)
        .overlay { CWorldPlaybackOverlay() }
        .onOpenURL { url in
            guard url.scheme == "cearaworld", url.host == "remote", CWorldPlaybackHost.shared.surface != nil else { return }
            CWorldPlaybackHost.shared.remotePresented = true
        }
        .onChange(of: appModel.activeProfile?.id) { _, _ in CWorldPlaybackHost.shared.stop() }
        .onChange(of: appModel.isAuthenticated) { _, authenticated in
            if !authenticated { CWorldPlaybackHost.shared.stop() }
        }
    }
}

struct ConnectionView: View {
    @EnvironmentObject private var appModel: AppModel
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isRegistering = false

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color(red: 0.10, green: 0.18, blue: 0.20), .black],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 22) {
                        CWorldLogo(size: 32)

                        Text(isRegistering ? "Request Access" : "Log In")
                            .cworldRoundedFont(32, weight: .bold)
                            .foregroundStyle(.white)

                        VStack(spacing: 12) {
                            TextField("API URL", text: $appModel.apiBaseURL)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.URL)
                                .autocorrectionDisabled()
                                .textContentType(.URL)
                                .padding(.horizontal, 14)
                                .frame(height: 44)
                                .foregroundStyle(.white)
                                .tint(.white)
                                .cworldGlass(cornerRadius: 10, fill: Color.white.opacity(0.12))

                            TextField("Username", text: $username)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .textContentType(.username)
                                .padding(.horizontal, 14)
                                .frame(height: 44)
                                .foregroundStyle(.white)
                                .tint(.white)
                                .cworldGlass(cornerRadius: 10, fill: Color.white.opacity(0.12))

                            if isRegistering {
                                TextField("Email (optional)", text: $email)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .textContentType(.emailAddress)
                                    .keyboardType(.emailAddress)
                                    .padding(.horizontal, 14)
                                    .frame(height: 44)
                                    .foregroundStyle(.white)
                                    .tint(.white)
                                    .cworldGlass(cornerRadius: 10, fill: Color.white.opacity(0.12))
                            }

                            SecureField("Password", text: $password)
                                .textContentType(.password)
                                .padding(.horizontal, 14)
                                .frame(height: 44)
                                .foregroundStyle(.white)
                                .tint(.white)
                                .cworldGlass(cornerRadius: 10, fill: Color.white.opacity(0.12))

                            if isRegistering {
                                Text("Password must be at least 12 characters.")
                                    .font(.caption)
                                    .foregroundStyle(password.count >= 12 ? CWorldTheme.secondaryText : .orange)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }

                        Button {
                            Task {
                                if isRegistering {
                                    await appModel.requestAccount(username: username, email: email, password: password)
                                } else {
                                    await appModel.login(username: username, password: password)
                                }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                if appModel.isLoading {
                                    ProgressView()
                                        .tint(.white)
                                        .controlSize(.small)
                                }
                                Text(appModel.isLoading ? (isRegistering ? "Submitting…" : "Logging in…") : (isRegistering ? "Request Account" : "Log In"))
                            }
                            .cworldRoundedFont(16, weight: .bold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(.black, in: Capsule())
                        }
                        .disabled(appModel.isLoading || username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty || (isRegistering && password.count < 12))

                        Button {
                            isRegistering.toggle()
                            appModel.dismissError()
                        } label: {
                            Text(isRegistering ? "Already approved? Sign in" : "Request an account")
                                .foregroundStyle(CWorldTheme.secondaryText)
                        }
                        .buttonStyle(.plain)

                        if let message = appModel.accountRequestMessage {
                            Label(message, systemImage: "checkmark.circle")
                                .foregroundStyle(.green)
                                .font(.caption)
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .cworldGlass(cornerRadius: 14, fill: Color.green.opacity(0.12))
                        }

                        NavigationLink {
                            DeviceLoginView()
                        } label: {
                            Text("Use device code instead")
                                .foregroundStyle(CWorldTheme.secondaryText)
                        }

                        if let errorMessage = appModel.errorMessage {
                            HStack(alignment: .top, spacing: 10) {
                                Label(errorMessage, systemImage: "exclamationmark.triangle")
                                    .foregroundStyle(.red)
                                Spacer()
                                Button {
                                    appModel.dismissError()
                                } label: {
                                    Image(systemName: "xmark")
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel("Dismiss error")
                            }
                            .font(.caption)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .cworldGlass(cornerRadius: 14, fill: Color.red.opacity(0.12))
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: 430)
                    .cworldGlass(cornerRadius: 28, fill: Color.white.opacity(0.16))
                    .padding(24)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }
}
