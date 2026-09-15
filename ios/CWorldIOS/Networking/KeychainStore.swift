import Foundation
import Security

@MainActor
protocol TokenStore {
    func readToken() -> String?
    func saveToken(_ token: String) throws
    func deleteToken()
}

final class KeychainStore: TokenStore {
    private let service: String
    private let tokenAccount: String

    init(service: String = "com.cearaworld.cworld.ios", tokenAccount: String = "auth-token") {
        self.service = service
        self.tokenAccount = tokenAccount
    }

    private func query() -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
        ]
        #if targetEnvironment(macCatalyst)
        // Catalyst otherwise targets the legacy file-based Mac keychain. Its
        // sandboxed app token belongs in the entitlement-scoped data-protection keychain.
        query[kSecUseDataProtectionKeychain as String] = true
        #endif
        return query
    }

    func readToken() -> String? {
        var query = query()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        return token
    }

    func saveToken(_ token: String) throws {
        let data = Data(token.utf8)
        let query = query()
        let attributes: [String: Any] = [kSecValueData as String: data]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData as String] = data
            let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw KeychainError(status: addStatus)
            }
        } else if updateStatus != errSecSuccess {
            throw KeychainError(status: updateStatus)
        }
    }

    func deleteToken() {
        let query = query()
        SecItemDelete(query as CFDictionary)
    }
}

struct KeychainError: LocalizedError {
    let status: OSStatus

    var errorDescription: String? {
        let reason = SecCopyErrorMessageString(status, nil) as String? ?? "Unknown security error"
        return "Keychain operation failed (\(status)): \(reason)"
    }
}
