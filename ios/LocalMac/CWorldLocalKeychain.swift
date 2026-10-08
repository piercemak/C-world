import Foundation
import Security

// Loaded as a native macOS plug-in by the locally signed Catalyst build.
// Catalyst's SecItem API always uses the entitlement-scoped data-protection store.
// These native APIs access the encrypted login Keychain without an Apple team ID.
@objc(CWorldLocalKeychainBridge)
final class CWorldLocalKeychainBridge: NSObject {
    @objc func execute(_ request: NSDictionary) -> NSDictionary {
        guard let operation = request["operation"] as? String,
              let service = request["service"] as? String,
              let account = request["account"] as? String else {
            return ["status": NSNumber(value: errSecParam)]
        }
        let serviceBytes = Array(service.utf8)
        let accountBytes = Array(account.utf8)
        var item: SecKeychainItem?
        var length: UInt32 = 0
        var password: UnsafeMutableRawPointer?
        let status = serviceBytes.withUnsafeBytes { serviceBuffer in
            accountBytes.withUnsafeBytes { accountBuffer in
                SecKeychainFindGenericPassword(nil, UInt32(serviceBytes.count), serviceBuffer.baseAddress,
                    UInt32(accountBytes.count), accountBuffer.baseAddress, &length, &password, &item)
            }
        }
        defer { if let password { SecKeychainItemFreeContent(nil, password) } }
        if operation == "read" {
            guard status == errSecSuccess, let password else { return ["status": NSNumber(value: status)] }
            let token = String(data: Data(bytes: password, count: Int(length)), encoding: .utf8)
            return ["status": NSNumber(value: token == nil ? errSecDecode : errSecSuccess), "token": token ?? ""]
        }
        if operation == "delete" {
            let result = status == errSecItemNotFound ? errSecSuccess : (status == errSecSuccess ? item.map { SecKeychainItemDelete($0) } ?? errSecInternalError : status)
            return ["status": NSNumber(value: result)]
        }
        guard operation == "save", let token = request["token"] as? String else {
            return ["status": NSNumber(value: errSecParam)]
        }
        let data = Data(token.utf8)
        let result: OSStatus
        if status == errSecSuccess, let item {
            result = data.withUnsafeBytes { SecKeychainItemModifyAttributesAndData(item, nil, UInt32(data.count), $0.baseAddress) }
        } else if status == errSecItemNotFound {
            result = serviceBytes.withUnsafeBytes { serviceBuffer in
                accountBytes.withUnsafeBytes { accountBuffer in
                    data.withUnsafeBytes { tokenBuffer in
                        guard let bytes = tokenBuffer.baseAddress, !data.isEmpty else { return errSecParam }
                        return SecKeychainAddGenericPassword(nil, UInt32(serviceBytes.count), serviceBuffer.baseAddress,
                            UInt32(accountBytes.count), accountBuffer.baseAddress, UInt32(data.count), bytes, nil)
                    }
                }
            }
        } else { result = status }
        return ["status": NSNumber(value: result)]
    }
}
