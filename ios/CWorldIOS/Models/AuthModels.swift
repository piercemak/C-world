import Foundation

struct LoginRequest: Encodable {
    let username: String
    let password: String
}

struct LoginResponse: Decodable {
    let token: String
    let user: CWorldUser
}

struct DeviceLoginStart: Decodable {
    let status: String
    let pollToken: String
    let deviceCode: String
    let verificationURL: URL
    let qrURL: URL
    let expiresIn: Int
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case status
        case pollToken
        case deviceCode
        case verificationURL = "verificationUrl"
        case qrURL = "qrUrl"
        case expiresIn
        case expiresAt
    }
}

struct DeviceLoginPoll: Decodable {
    let status: String
    let token: String?
    let user: CWorldUser?
    let error: String?
}

struct CWorldUser: Codable, Identifiable {
    let id: Int
    let username: String
    let email: String?
}

struct CWorldProfile: Decodable, Identifiable {
    let id: Int
    let name: String
    let avatarURL: String?
    let archiveBackdrop: String?
    let isKid: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case avatarURL = "avatar_url"
        case archiveBackdrop = "archive_backdrop"
        case isKid = "is_kid"
    }
}

struct ProfileUpdate: Encodable {
    let name: String?
    let avatarURL: String?
    let archiveBackdrop: String?

    init(avatarURL: String? = nil, archiveBackdrop: String? = nil, name: String? = nil) {
        self.name = name
        self.avatarURL = avatarURL
        self.archiveBackdrop = archiveBackdrop
    }

    enum CodingKeys: String, CodingKey {
        case avatarURL = "avatar_url"
        case archiveBackdrop = "archive_backdrop"
        case name
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(name, forKey: .name)
        if let avatarURL {
            try container.encode(avatarURL, forKey: .avatarURL)
        }
        if let archiveBackdrop {
            try container.encode(archiveBackdrop, forKey: .archiveBackdrop)
        }
    }
}

struct CreateProfileRequest: Encodable {
    let name: String
}
