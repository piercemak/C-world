import SwiftUI
import PhotosUI
import UIKit
import ImageIO

struct ProfileManagementView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var newProfileName = ""
    @State private var selectedProfile: CWorldProfile?

    var body: some View {
        NavigationStack {
            List {
                Section("Profiles") {
                    ForEach(appModel.profiles) { profile in
                        Button {
                            selectedProfile = profile
                        } label: {
                            HStack(spacing: 12) {
                                ProfileAvatar(profile: profile, size: 42)
                                Text(profile.name)
                                Spacer()
                                Image(systemName: "pencil")
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .onDelete { offsets in
                        let profiles = offsets.map { appModel.profiles[$0] }
                        Task {
                            for profile in profiles {
                                await appModel.deleteProfile(profile)
                            }
                        }
                    }
                }

                Section("Add profile") {
                    TextField("Profile name", text: $newProfileName)
                    Button("Create profile") {
                        let name = newProfileName.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !name.isEmpty else { return }
                        Task {
                            await appModel.createProfile(name: name)
                            newProfileName = ""
                        }
                    }
                    .disabled(newProfileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .scrollContentBackground(.hidden)
            .background(CWorldTheme.background)
            .navigationTitle("Manage Profiles")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(item: $selectedProfile) { profile in
                ProfileEditorView(profile: profile)
            }
        }
    }
}

struct ProfileEditorView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    let profile: CWorldProfile
    @State private var photoItem: PhotosPickerItem?
    @State private var isSaving = false
    @State private var saveError: String?

    private var currentProfile: CWorldProfile {
        appModel.profiles.first(where: { $0.id == profile.id }) ?? profile
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    HStack {
                        ProfileAvatar(profile: currentProfile, size: 86)
                        PhotosPicker(selection: $photoItem, matching: .images) {
                            Label("Choose image", systemImage: "photo")
                        }
                        .disabled(isSaving)
                    }
                    if isSaving {
                        ProgressView("Saving…")
                    }
                    if let saveError {
                        Text(saveError).font(.callout).foregroundStyle(.red)
                        Button("Retry saving photo") { Task { await saveSelectedPhoto() } }
                            .disabled(isSaving)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(CWorldTheme.background)
            .navigationTitle(profile.name)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .disabled(isSaving)
                }
            }
            .task(id: photoItem) {
                await saveSelectedPhoto()
            }
            .interactiveDismissDisabled(isSaving)
        }
    }

    private func saveSelectedPhoto() async {
        guard let photoItem else { return }
        isSaving = true
        saveError = nil
        defer { isSaving = false }

        do {
            guard let data = try await photoItem.loadTransferable(type: Data.self) else {
                throw ProfilePhotoError.invalidImage
            }
            let jpeg = try await Task.detached(priority: .userInitiated) {
                try ProfilePhotoEncoder.jpeg(from: data)
            }.value
            try Task.checkCancellation()
            let saved = await appModel.updateProfileAvatar(
                profile,
                dataURL: "data:image/jpeg;base64,\(jpeg.base64EncodedString())"
            )
            if !saved { saveError = appModel.errorMessage ?? "Photo couldn't be saved. Please try again." }
        } catch is CancellationError {
            return
        } catch {
            saveError = error.localizedDescription
        }
    }
}

enum ProfilePhotoError: LocalizedError {
    case invalidImage
    var errorDescription: String? { "This photo couldn't be opened. Please choose another image." }
}

enum ProfilePhotoEncoder {
    nonisolated static func jpeg(from data: Data) throws -> Data {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let bitmap = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true,
                kCGImageSourceThumbnailMaxPixelSize: 768
              ] as CFDictionary),
              let jpeg = UIImage(cgImage: bitmap).jpegData(compressionQuality: 0.85) else {
            throw ProfilePhotoError.invalidImage
        }
        return jpeg
    }
}
