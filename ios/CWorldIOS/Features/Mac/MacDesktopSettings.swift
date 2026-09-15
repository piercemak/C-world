#if targetEnvironment(macCatalyst)
import SwiftUI
import UIKit
import UniformTypeIdentifiers
import ImageIO

struct MacProfilePicker: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    var isSwitching = false
    var onContinue: (() -> Void)?
    @State private var managing = false
    @State private var selecting = false
    @State private var editingProfile: CWorldProfile?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            LinearGradient(colors: [.clear, .white.opacity(0.09)], startPoint: .center, endPoint: .bottom).ignoresSafeArea()
            VStack(spacing: 0) {
                CWorldLogo(size: 34).padding(.top, 8)
                Spacer(minLength: 28)
                Text("Who's\nWatching?").font(.custom(CWorldFonts.poppins(.bold), size: 50)).lineSpacing(-10).multilineTextAlignment(.center)
                GeometryReader { geometry in
                  ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 24) {
                        ForEach(appModel.profiles) { profile in
                          VStack(spacing: 20) {
                            Button {
                                selecting = true
                                Task {
                                    await appModel.selectProfile(profile, startHomeIntro: true)
                                    selecting = false
                                    if let onContinue { onContinue() }
                                    else if isSwitching { dismiss() }
                                }
                            } label: {
                                ZStack(alignment: .bottom) {
                                    if let raw = profile.avatarURL, let url = URL(string: raw), !raw.isEmpty {
                                        CatalogImage(url: url, showsBorder: false, maxPixelSize: 900).frame(width: 300, height: 400).clipped()
                                    } else {
                                        Color(white: 0.16)
                                        Image(systemName: "person.fill").font(.system(size: 145)).foregroundStyle(.white.opacity(0.25)).frame(maxWidth: .infinity, maxHeight: .infinity)
                                    }
                                    HStack(spacing: 10) {
                                        Circle().fill(.green).frame(width: 9, height: 9)
                                        Text(profile.name).font(.custom(CWorldFonts.poppins(.semibold), size: 17)).lineLimit(1)
                                    }.foregroundStyle(.black).padding(.horizontal, 18).frame(height: 40).background(.white, in: Capsule()).padding(24)
                                }.frame(width: 300, height: 400).clipShape(RoundedRectangle(cornerRadius: 32))
                                    .overlay { RoundedRectangle(cornerRadius: 32).stroke(.white.opacity(0.20)) }
                                    .shadow(color: .white.opacity(0.05), radius: 15, y: 10)
                            }.disabled(selecting).buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.05, pressedScale: 0.9))
                            Button { editingProfile = profile } label: {
                                VStack(spacing: 6) { Image(systemName: "pencil").font(.system(size: 23)); Capsule().frame(width: 40, height: 2) }
                            }.help("Edit \(profile.name)'s photo").buttonStyle(MacInteractiveButtonStyle(hoverScale: 1.2))
                          }
                        }
                    }.padding(24).frame(minWidth: geometry.size.width)
                  }
                }.frame(height: 505).padding(.top, 16)
                HStack(spacing: 24) {
                    Button("Manage Profiles") { managing = true }
                    if isSwitching { Button("Back") { if let onContinue { onContinue() } else { dismiss() } } }
                    Button("Log out") { appModel.logout() }.foregroundStyle(.black).padding(.horizontal, 20).padding(.vertical, 8).background(.white, in: Capsule())
                }.font(.system(size: 14, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
                Spacer(minLength: 24)
            }.frame(maxWidth: .infinity)
        }.foregroundStyle(.white).buttonStyle(MacInteractiveButtonStyle())
            .frame(minWidth: 650, minHeight: 500)
            .fullScreenCover(isPresented: $managing) { MacProfileManagement().environmentObject(appModel) }
            .sheet(item: $editingProfile) { MacProfileEditor(profile: $0).environmentObject(appModel) }
    }
}

struct MacRequestView: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var request = ""
    @State private var language = ""
    @State private var sending = false
    @State private var sent = false
    var onClose: (() -> Void)?
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack { Text("Requests").font(.title2.bold()); Spacer(); Button { if let onClose { onClose() } else { dismiss() } } label: { Image(systemName: "xmark").frame(width: 24, height: 24) }.keyboardShortcut(.cancelAction) }
            Text("Want a movie or show added? You can also report a playback problem here.").foregroundStyle(.secondary)
            TextEditor(text: $request).frame(height: 140).overlay { RoundedRectangle(cornerRadius: 8).stroke(.secondary.opacity(0.25)) }
            TextField("Language or subtitles (optional)", text: $language).textFieldStyle(.roundedBorder)
            if sent { Label("Your request was sent.", systemImage: "checkmark.circle.fill").foregroundStyle(.green) }
            else if let error = appModel.errorMessage { Text(error).foregroundStyle(.red).font(.caption) }
            Button(sending ? "Sending…" : "Send Request") {
                sending = true
                Task { sent = await appModel.sendMediaRequest(request, language: language); sending = false }
            }.buttonStyle(.borderedProminent).disabled(sending || sent || request.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }.padding(4).frame(width: 540, height: 430)
    }
}

struct MacProfileManagement: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var editing: CWorldProfile?
    @State private var removing: CWorldProfile?
    @State private var creating = false
    var body: some View {
        VStack(spacing: 20) {
            HStack { Text("Manage Profiles").font(.title2); Spacer(); Button("Done") { dismiss() } }
            ScrollView {
                ForEach(appModel.profiles) { profile in
                    HStack(spacing: 14) {
                        ProfileAvatar(profile: profile, size: 50)
                        Text(profile.name); Spacer()
                        Button("Edit photo") { editing = profile }
                        Button(role: .destructive) { removing = profile } label: { Image(systemName: "trash") }.help("Delete profile")
                    }.padding(12).macPanel()
                }
            }
            HStack {
                TextField("New profile name", text: $name).textFieldStyle(.roundedBorder)
                Button("Create") { creating = true; Task { await appModel.createProfile(name: name); name = ""; creating = false } }
                    .disabled(creating || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            if let error = appModel.errorMessage { Text(error).font(.caption).foregroundStyle(.red) }
        }.padding(28).frame(width: 560, height: 480)
                        .sheet(item: $editing) { MacProfileEditor(profile: $0).environmentObject(appModel) }
            .confirmationDialog("Delete this profile and its watch data?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } })) {
                Button("Delete Profile", role: .destructive) {
                    guard let profile = removing else { return }; removing = nil
                    Task { await appModel.deleteProfile(profile) }
                }
            }
    }
}

struct MacProfileEditor: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    let profile: CWorldProfile
    @State private var importing = false
    @State private var saving = false
    @State private var error: String?
    private var current: CWorldProfile { appModel.profiles.first { $0.id == profile.id } ?? profile }
    var body: some View {
        VStack(spacing: 24) {
            HStack { Text("Profile picture").font(.title2); Spacer(); Button("Done") { dismiss() }.disabled(saving) }
            ProfileAvatar(profile: current, size: 170).clipShape(RoundedRectangle(cornerRadius: 24))
            Text(current.name).font(.headline)
            Button(saving ? "Saving…" : "Choose an image…") { importing = true }.disabled(saving).buttonStyle(.borderedProminent)
            if let error { Text(error).foregroundStyle(.red).font(.caption) }
        }.padding(30).frame(width: 440)
            .interactiveDismissDisabled(saving)
            .fileImporter(isPresented: $importing, allowedContentTypes: [.image]) { result in
                switch result {
                case .success(let url):
                    saving = true; error = nil
                    Task {
                        do {
                            let dataURL = try await MacSelectedImage.dataURL(url, maxPixelSize: 768)
                            if !(await appModel.updateProfileAvatar(profile, dataURL: dataURL)) { error = appModel.errorMessage ?? "Could not save the picture." }
                        } catch { self.error = error.localizedDescription }
                        saving = false
                    }
                case .failure(let error): self.error = error.localizedDescription
                }
            }
    }
}

enum MacSelectedImage {
    static func dataURL(_ url: URL, maxPixelSize: Int) async throws -> String {
        try await Task.detached(priority: .userInitiated) {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
                  let bitmap = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                    kCGImageSourceCreateThumbnailFromImageAlways: true,
                    kCGImageSourceCreateThumbnailWithTransform: true,
                    kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
                  ] as CFDictionary),
                  let data = UIImage(cgImage: bitmap).jpegData(compressionQuality: 0.9) else { throw ProfilePhotoError.invalidImage }
            return "data:image/jpeg;base64,\(data.base64EncodedString())"
        }.value
    }
}

struct MacBackdropPicker: View {
    @EnvironmentObject private var appModel: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var importing = false
    @State private var saving = false
    @State private var error: String?
    var body: some View {
        VStack(spacing: 18) {
            HStack { Text("Archive backdrop").font(.title2); Spacer(); Button("Done") { dismiss() } }
            Button("Choose your own image…") { importing = true }.disabled(saving)
            if let error { Text(error).font(.caption).foregroundStyle(.red) }
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 14) {
                    ForEach(appModel.catalog.filter { $0.artwork.backdrop != nil }) { media in
                        Button { if let url = media.artwork.backdrop { save(url.absoluteString) } } label: {
                            VStack(alignment: .leading) {
                                CatalogImage(url: media.artwork.backdrop, maxPixelSize: 640).frame(height: 110).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
                                Text(media.title).font(.caption).lineLimit(1)
                            }
                        }.buttonStyle(.plain).disabled(saving)
                    }
                }
            }
        }.padding(28).frame(width: 760, height: 580).interactiveDismissDisabled(saving)
            .fileImporter(isPresented: $importing, allowedContentTypes: [.image]) { result in
                switch result {
                case .success(let url):
                    saving = true
                    Task {
                        do { let value = try await MacSelectedImage.dataURL(url, maxPixelSize: 3072); await performSave(value) }
                        catch { self.error = error.localizedDescription; saving = false }
                    }
                case .failure(let error): self.error = error.localizedDescription
                }
            }
    }
    private func save(_ value: String) { saving = true; Task { await performSave(value) } }
    private func performSave(_ value: String) async {
        if await appModel.updateArchiveBackdrop(value) { dismiss() }
        else { error = appModel.errorMessage ?? "Could not update the backdrop." }
        saving = false
    }
}
#endif
