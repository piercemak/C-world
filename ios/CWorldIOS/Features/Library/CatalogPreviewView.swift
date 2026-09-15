import SwiftUI

struct CatalogPreviewView: View {
    @EnvironmentObject private var appModel: AppModel
    @State private var showingProfiles = false

    var body: some View {
        NavigationStack {
            List {
                if !appModel.profiles.isEmpty {
                    Section("Profile") {
                        Picker("Active profile", selection: Binding(
                            get: { appModel.activeProfile?.id ?? appModel.profiles[0].id },
                            set: { id in
                                if let profile = appModel.profiles.first(where: { $0.id == id }) {
                                    Task { await appModel.selectProfile(profile) }
                                }
                            }
                        )) {
                            ForEach(appModel.profiles) { profile in
                                Text(profile.name).tag(profile.id)
                            }
                        }
                    }
                }

                Section("Catalog") {
                    if appModel.catalog.isEmpty {
                        Text("No catalog items loaded.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(appModel.catalog) { media in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(media.title)
                                    .font(.headline)
                                Text(media.type.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("All Titles")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign out") { appModel.logout() }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Profiles") { showingProfiles = true }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await appModel.refreshCatalog() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(appModel.isLoading)
                }
            }
            .sheet(isPresented: $showingProfiles) {
                ProfilePickerView()
            }
        }
    }
}
