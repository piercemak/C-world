# CWorld Mac laptop test

This is the native Mac Catalyst app packaged for direct installation without a
paid Apple Developer account. It is locally signed and is not notarized by Apple.
It includes both Apple Silicon and Intel code; the minimum macOS version is listed
in the built app's Info.plist. It uses the production CWorld API.

## Install

1. Copy or download the CWorld-Test DMG onto your other Mac and open it.
2. Drag **CWorld Test** into **Applications**, then eject the disk image.
3. Open **CWorld Test** from Applications. If macOS blocks this trusted test copy,
   use **System Settings > Privacy & Security > Open Anyway** after trying to open it.
   Do not disable Gatekeeper globally. Managed Macs may prohibit exceptions.
4. Sign in using your CWorld account and select your profile.

This test uses bundle ID `com.cearaworld.cworld.mac.local`, separate from the Xcode
app. Preferences, caches, offline downloads, and login storage start separately.
Server-backed profiles and viewing progress still use your existing account.
Login uses the regular Mac login Keychain; macOS may request Keychain access.

## Check on the laptop

- Artwork, library, search, media details, and recently watched load.
- Login survives quitting and reopening the app.
- A movie and an episode play, seek, pause, and resume correctly.
- Subtitles, skip markers, audio selection, and AirPlay behave as expected.
- An offline download works, including after restarting the app without internet.
- Profile photo selection and other file pickers work.

Install version 1.0.1 manually once to gain the updater. Afterward use the app menu's
**Check for Updates…**. **Automatically Check for Updates** is enabled by default
starting with version 1.0.2 and can be disabled from the app menu. Installation
requires your confirmation. Updates and their feed are cryptographically signed
and hosted publicly on GitHub. No media library is included in the installer.
Local signing may cause permission or Keychain prompts again after an update;
test this before distributing broadly. Apple installation warnings still apply.
See `ios/MAC-UPDATES.md` for publishing future updates.

## Build another test

From the repository root:

```sh
bash ios/scripts/package-local-mac.sh
```

Installers are created in `dist/catalyst/` (ignored by git). Each run uses a new
temporary build workspace and reports the path to its log. The local-distribution
compile flag applies only to this script; normal Xcode/iPhone signing is unchanged.
