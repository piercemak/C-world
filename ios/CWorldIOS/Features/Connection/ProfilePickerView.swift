import SwiftUI

struct ProfilePickerView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingManagement = false
    @State private var isSelecting = false

    var body: some View {
        NavigationStack {
            ZStack {
                CWorldTheme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 28) {
                        CWorldLogo(size: 30)

                        Text("Who's Watching?")
                            .cworldRoundedFont(42, weight: .bold)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity, alignment: .center)

                        VStack(spacing: 22) {
                            ForEach(appModel.profiles) { profile in
                                Button {
                                    isSelecting = true
                                    Task { await appModel.selectProfile(profile, startHomeIntro: true) }
                                    dismiss()
                                } label: {
                                    VStack(spacing: 12) {
                                        ProfileAvatar(profile: profile, size: 260)

                                        HStack(spacing: 8) {
                                            CWorldStatusDot()
                                            Text(profile.name)
                                                .cworldRoundedFont(17, weight: .semibold)
                                                .lineLimit(1)
                                        }
                                        .foregroundStyle(.black)
                                        .padding(.horizontal, 14)
                                        .frame(height: 38)
                                        .background(.white, in: Capsule())
                                    }
                                    .padding(12)
                                    .cworldGlass(cornerRadius: 24, fill: Color.white.opacity(0.08))
                                }
                                .buttonStyle(.plain)
                                .disabled(isSelecting)
                                .frame(width: 284)
                                .contentShape(RoundedRectangle(cornerRadius: 24))
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 28)
                    .padding(.bottom, 40)
                    .frame(maxWidth: .infinity)
                }
            }
            .toolbarBackground(.hidden, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign out") { appModel.logout() }
                        .foregroundStyle(.white.opacity(0.72))
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Manage") { showingManagement = true }
                        .foregroundStyle(.white)
                }
            }
            .sheet(isPresented: $showingManagement) {
                ProfileManagementView()
            }
        }
    }
}

struct ProfileAvatar: View {
    let profile: CWorldProfile
    let size: CGFloat

    var body: some View {
        Group {
            if let avatarURL = profile.avatarURL,
               let url = URL(string: avatarURL),
               ["http", "https", "data"].contains(url.scheme?.lowercased() ?? "") {
                CachedRemoteImage(url: url) {
                    placeholder
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.22))
    }

    private var placeholder: some View {
        ZStack {
            Color.gray.opacity(0.3)
            Text(String(profile.name.prefix(1)).uppercased())
                .font(.system(size: size * 0.38, weight: .bold))
        }
    }
}
