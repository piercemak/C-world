# Direct-download Mac updates

The local Catalyst distribution includes Sparkle 2.10.0 through a native macOS
bridge. Regular iOS and Xcode builds are unchanged. The standalone bundle ID
remains `com.cearaworld.cworld.mac.local`; do not change it between releases.

## Release workflow

1. Edit `ios/LocalMac/updates.json`: increase `build` for EVERY new published
   binary, and update the three-part version. Never reuse a published build.
2. Write plain-text release notes in `ios/LocalMac/release-notes.txt`.
3. Run `bash ios/scripts/package-local-mac.sh` from the repository root.
4. Run `node ios/scripts/publish-mac-update.mjs /absolute/path/to/installer.dmg`
   to prepare and sign the release without uploading it.
5. Test the installer, then repeat that command with `--publish`.

Keep the generated `.dmg.json` beside the DMG. Publishing verifies the signing
key, uploads a GitHub prerelease and checksum, confirms the download is public,
then publishes the signed appcast on the dedicated `mac-updates` branch. Tags
start with `mac-catalyst-` so they do not trigger the legacy Tauri release job.
This does NOT commit or push pending application source changes or deploy the
website. Source control remains a separate step.

The feed is https://raw.githubusercontent.com/piercemak/C-world/mac-updates/appcast.xml.
Installers are public, but contain no media library; CWorld sign-in is required.

## Security and recovery

The Ed25519 private signing key is in this Mac's login Keychain, account
`cworld-mac-local`. Only its public key belongs in source control. Preserve a
secure private backup before retiring this Mac; never commit/export the private
key into the repository or release assets. Do not generate a replacement casually:
existing installations trust the original public key.

Signed feeds and archive verification are required; feed verification never
expires into permissive mode. Automatic checking is enabled by default starting
with 1.0.2; upgrading installations enable it once, then preserve changes made
using the menu toggle. Users can disable checking, and updates ask
before installation. Sparkle signatures authenticate releases but do not replace
Apple notarization: macOS installation and Keychain warnings may still occur.

If publishing fails, retry with the same unchanged DMG. Matching uploaded assets
are reused. Conflicting contents are refused; use a new build number. The feed
is changed last so interrupted uploading does not advertise an incomplete release.

Users with the original non-updater build must replace it manually once. Install
in Applications, not directly from the mounted disk image. Server-side catalog
updates still do not require a new app binary.

## Verification performed

On October 7, 2026, the universal Release build and strict recursive code-signing
verification passed. A separate sandboxed Catalyst test app using the same updater
bridge and framework discovered a signed local feed, downloaded its update,
accepted Install and Relaunch, and its installed bundle and visible build changed
from 1 to 2. This did not replace the user's CWorld installation or access their
account. Feed and DMG Ed25519 signatures were also independently verified with
Node's cryptography API. Test the first real update on the laptop before wider
distribution, particularly Keychain prompts and Intel hardware.
