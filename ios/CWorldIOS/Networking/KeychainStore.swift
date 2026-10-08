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

    #if targetEnvironment(macCatalyst) && CWORLD_LOCAL_DISTRIBUTION
    private func localKeychain(_ operation: String, token: String? = nil) -> (OSStatus, String?) {
        guard let url = Bundle.main.builtInPlugInsURL?.appendingPathComponent("CWorldLocalKeychain.bundle"),
              let bundle = Bundle(url: url), bundle.load(),
              let bridgeClass = bundle.principalClass as? NSObject.Type else {
            return (errSecNotAvailable, nil)
        }
        let bridge = bridgeClass.init()
        var request: [String: String] = ["operation": operation, "service": service, "account": tokenAccount]
        request["token"] = token
        guard let result = bridge.perform(NSSelectorFromString("execute:"), with: request as NSDictionary)?.takeUnretainedValue() as? NSDictionary,
              let status = result["status"] as? NSNumber else { return (errSecInternalError, nil) }
        return (status.int32Value, result["token"] as? String)
    }
    #endif

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
        #if targetEnvironment(macCatalyst) && CWORLD_LOCAL_DISTRIBUTION
        let (status, token) = localKeychain("read")
        return status == errSecSuccess ? token : nil
        #else
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
        #endif
    }

    func saveToken(_ token: String) throws {
        #if targetEnvironment(macCatalyst) && CWORLD_LOCAL_DISTRIBUTION
        let (status, _) = localKeychain("save", token: token)
        guard status == errSecSuccess else { throw KeychainError(status: status) }
        #else
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
        #endif
    }

    func deleteToken() {
        #if targetEnvironment(macCatalyst) && CWORLD_LOCAL_DISTRIBUTION
        _ = localKeychain("delete")
        #else
        let query = query()
        SecItemDelete(query as CFDictionary)
        #endif
    }
}

struct KeychainError: LocalizedError {
    let status: OSStatus

    var errorDescription: String? {
        let reason = SecCopyErrorMessageString(status, nil) as String? ?? "Unknown security error"
        return "Keychain operation failed (\(status)): \(reason)"
    }
}
