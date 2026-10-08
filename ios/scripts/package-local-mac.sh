#!/bin/bash
set -euo pipefail

# A standalone Catalyst test release. No Apple account, provisioning, or notarization.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UPDATE_CONFIG="${CWORLD_UPDATE_CONFIG:-$REPO_ROOT/ios/LocalMac/updates.json}"
node -e 'const c=require(process.argv[1]); if(!/^\d+\.\d+\.\d+$/.test(c.version)||!Number.isSafeInteger(c.build)||c.build<2||!c.feedURL.startsWith("https://")||Buffer.from(c.publicKey,"base64").length!==32)throw Error("Invalid updater configuration");' "$UPDATE_CONFIG"
VERSION="$(node -p 'require(process.argv[1]).version' "$UPDATE_CONFIG")"
BUILD="$(node -p 'require(process.argv[1]).build' "$UPDATE_CONFIG")"
FEED_URL="$(node -p 'require(process.argv[1]).feedURL' "$UPDATE_CONFIG")"
PUBLIC_KEY="$(node -p 'require(process.argv[1]).publicKey' "$UPDATE_CONFIG")"
SPARKLE_ROOT="$(bash "$SCRIPT_DIR/prepare-sparkle.sh")"
OUTPUT_ROOT="${1:-$REPO_ROOT/dist/catalyst}"
mkdir -p "$OUTPUT_ROOT"
OUTPUT_ROOT="$(cd "$OUTPUT_ROOT" && pwd)"
BUILD_ROOT="$(mktemp -d /private/tmp/cworld-local-release.XXXXXX)"
STAGING="$BUILD_ROOT/disk"
APP_NAME="CWorld Test"
APP="$STAGING/$APP_NAME.app"
DMG="$OUTPUT_ROOT/CWorld-Test-$VERSION-$BUILD-$(date +%Y%m%d-%H%M%S).dmg"
LOG="$BUILD_ROOT/build.log"
printf 'Build workspace: %s\nBuild log: %s\n' "$BUILD_ROOT" "$LOG"

if ! xcodebuild \
    -project "$REPO_ROOT/CWorldIOS/CWorldIOS.xcodeproj" \
    -scheme CWorldIOS -configuration Release \
    -destination 'generic/platform=macOS,variant=Mac Catalyst' \
    -derivedDataPath "$BUILD_ROOT/DerivedData" \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO DEVELOPMENT_TEAM= \
    CODE_SIGN_ENTITLEMENTS= \
    'ARCHS=arm64 x86_64' ONLY_ACTIVE_ARCH=NO \
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) CWORLD_LOCAL_DISTRIBUTION' \
    'PRODUCT_BUNDLE_IDENTIFIER=com.cearaworld.cworld.mac.local' \
    "MARKETING_VERSION=$VERSION" "CURRENT_PROJECT_VERSION=$BUILD" \
    build > "$LOG" 2>&1; then
    tail -n 80 "$LOG"
    exit 1
fi

mkdir -p "$STAGING"
ditto "$BUILD_ROOT/DerivedData/Build/Products/Release-maccatalyst/CWorldIOS.app" "$APP"
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.cearaworld.cworld.mac.local' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleDisplayName CWorld Test' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleName CWorld Test' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :SUFeedURL string $FEED_URL" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :SUPublicEDKey string $PUBLIC_KEY" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUEnableInstallerLauncherService bool true' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUVerifyUpdateBeforeExtraction bool true' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SURequireSignedFeed bool true' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUSignedFeedFailureExpirationInterval integer 0' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUAutomaticallyUpdate bool false' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUEnableAutomaticChecks bool true' "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :SUEnableSystemProfiling bool false' "$APP/Contents/Info.plist"

PLUGIN="$APP/Contents/PlugIns/CWorldLocalKeychain.bundle"
mkdir -p "$PLUGIN/Contents/MacOS"
cp "$REPO_ROOT/ios/LocalMac/Info.plist" "$PLUGIN/Contents/Info.plist"
for architecture in arm64 x86_64; do
    xcrun swiftc -O -emit-library -target "$architecture-apple-macos14.0" \
        "$REPO_ROOT/ios/LocalMac/CWorldLocalKeychain.swift" \
        -o "$BUILD_ROOT/keychain-$architecture.dylib" >> "$LOG" 2>&1
done
lipo -create "$BUILD_ROOT/keychain-arm64.dylib" "$BUILD_ROOT/keychain-x86_64.dylib" \
    -output "$PLUGIN/Contents/MacOS/CWorldLocalKeychain"
codesign --force --sign - --timestamp=none "$PLUGIN"

mkdir -p "$APP/Contents/Frameworks"
ditto "$SPARKLE_ROOT/Sparkle.framework" "$APP/Contents/Frameworks/Sparkle.framework"
UPDATER_PLUGIN="$APP/Contents/PlugIns/CWorldUpdater.bundle"
mkdir -p "$UPDATER_PLUGIN/Contents/MacOS"
cp "$REPO_ROOT/ios/LocalMac/Updater-Info.plist" "$UPDATER_PLUGIN/Contents/Info.plist"
for architecture in arm64 x86_64; do
    xcrun swiftc -O -emit-library -target "$architecture-apple-macos14.0" \
        -F "$SPARKLE_ROOT" -framework Sparkle \
        -Xlinker -rpath -Xlinker '@executable_path/../Frameworks' \
        "$REPO_ROOT/ios/LocalMac/CWorldUpdater.swift" \
        -o "$BUILD_ROOT/updater-$architecture.dylib" >> "$LOG" 2>&1
done
lipo -create "$BUILD_ROOT/updater-arm64.dylib" "$BUILD_ROOT/updater-x86_64.dylib" \
    -output "$UPDATER_PLUGIN/Contents/MacOS/CWorldUpdater"
codesign --force --sign - --timestamp=none "$UPDATER_PLUGIN"
SPARKLE="$APP/Contents/Frameworks/Sparkle.framework/Versions/B"
for helper in "$SPARKLE/XPCServices/Installer.xpc" "$SPARKLE/XPCServices/Downloader.xpc" "$SPARKLE/Autoupdate" "$SPARKLE/Updater.app"; do
    codesign --force --sign - --timestamp=none --options runtime --preserve-metadata=entitlements "$helper"
done

# Refuse unexpected embedded profiles/extensions: this build must stand alone.
if find "$APP" \( -name '*.provisionprofile' -o -name '*.mobileprovision' -o -name '*.appex' \) -print | /usr/bin/grep -q .; then
    printf 'Unexpected provisioning profile or extension in the Mac build. Inspect %s\n' "$APP" >&2
    exit 1
fi
while IFS= read -r -d '' framework; do
    codesign --force --sign - --timestamp=none "$framework"
done < <(find "$APP/Contents" -depth -type d -name '*.framework' -print0)
codesign --force --sign - --timestamp=none \
    --entitlements "$REPO_ROOT/CWorldIOS/CWorldMacLocal.entitlements" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
lipo -archs "$APP/Contents/MacOS/CWorldIOS"
ln -s /Applications "$STAGING/Applications"
cp "$REPO_ROOT/ios/LOCAL-MAC-TEST.md" "$STAGING/READ ME.md"
cp "$SPARKLE_ROOT/LICENSE" "$STAGING/LICENSE-Sparkle.txt"
hdiutil create -volname 'CWorld Test' -srcfolder "$STAGING" -format UDZO "$DMG"
hdiutil verify "$DMG"
shasum -a 256 "$DMG"
node -e 'const fs=require("node:fs"); const c=require(process.argv[1]); fs.writeFileSync(process.argv[2]+".json",JSON.stringify({...c,installer:process.argv[2],bundleID:"com.cearaworld.cworld.mac.local"},null,2)+"\n");' "$UPDATE_CONFIG" "$DMG"
printf '\nInstaller: %s\nApp for local verification: %s\nBuild log: %s\n' "$DMG" "$APP" "$LOG"
