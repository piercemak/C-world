# CWorld iOS

This directory contains the native SwiftUI client foundation for CWorld.

The current foundation includes:

- a SwiftUI app entry point and navigation shell;
- Keychain-backed auth-token storage;
- typed requests for login, profiles, catalog, and playback sessions;
- the shared CWorld catalog-v1 models;
- a cached catalog library with All Titles, Movies, Shows, search, artwork cards, and media/episode detail screens;
- native AVKit playback that requests signed movie or episode URLs only when playback starts.
- profile-scoped watch progress and watch history synchronized through the existing CWorld API.

Phase 4 connects detail-screen playback references to the native video player.
Phase 5 adds resume playback plus periodic and exit-time progress/history synchronization.
Phase 6 adds a Continue Watching shelf and foundational Swift Testing coverage for catalog compatibility and API payload encoding.
Phase 7 prepares the app for local physical-device installation with an iOS 17 deployment target and automatic signing.
Phase 8 adds clearer connection errors, session recovery for temporary outages, background progress saves, and dismissible error states.
Phase 9 adds synced Watch History with resume navigation, removal, and catalog-ID matching for movies and episodes.

The app is intentionally backed by the existing CWorld Django API. It does not copy the React/Tauri frontend, Roku code, S3 credentials, or private CloudFront signing logic.

## Open in Xcode

The local Xcode project is at `CWorldIOS/CWorldIOS.xcodeproj`. It uses the shared source folder at `ios/CWorldIOS`, has an iOS 17 deployment target, and uses bundle identifier `com.cearaworld.cworld`.

## Run on your iPhone

For the native Mac version, see [Mac Catalyst](#mac-catalyst-desktop-app) below.

1. In Xcode, open Settings > Apple Accounts and sign in with your Apple Account.
2. Connect the iPhone to the Mac and trust the Mac when prompted.
3. On the iPhone, enable Settings > Privacy & Security > Developer Mode if Xcode requests it.
4. Select the `CWorldIOS` target, open Signing & Capabilities, and choose your Personal Team with automatic signing enabled.
5. Select the iPhone as the run destination and click Run.

This is for local development installation and does not publish the app to the App Store.

If XcodeGen is installed, the adjacent `project.yml` can be used to generate the project automatically.

The default API URL is the same one currently used by the Roku client. It can be changed from the connection screen.

## Mac Catalyst desktop app

Open `CWorldIOS/CWorldIOS.xcodeproj`, select the **CWorldIOS** scheme, then choose
**My Mac (Mac Catalyst)** and Run. The same scheme still runs the existing iPhone
and iPad interface when you choose an iOS device or simulator. Use your Apple
development team if Xcode requests signing. No backend or React deployment is
required. The Mac bundle identifier is `com.cearaworld.cworld.mac`; it is separate
from both the iOS identifier and the existing Tauri desktop app.

The native desktop implementation lives in `Features/Mac`. It follows the current
web desktop's light translucent gallery, six-card paging/sidebar, expanded cards,
full-backdrop title pages, season/episode rail, and separate full-window Archive.
Movies open their title page before playback. Search covers titles and episodes.
Archive includes exact-episode Continue Watching and right-click removal. Profile
images and custom Archive backdrops use the Mac file picker, with bounded native
image decoding. Reviews, ratings, watched dates, watchlist, and drag-reordering are
available from the Library heading's navigation menu. The Users button opens the
full Who's Watching screen; the sidebar name, bio, and photo have inline edit actions.

The Mac player reuses the iOS AVPlayer, signed playback API, resume/history writes,
subtitle parser, skip markers, first-frame readiness, and outro completion logic.
It adds desktop transport controls, volume, and bounded on-demand timeline image
previews. Space toggles playback, arrow keys seek 15 seconds, and Escape returns
to the title page. Use the green macOS window button for native full screen.
Command-/ (or / while browsing) opens catalog search; Command-R refreshes the library and watch
data. Foreground activation refreshes shared watch data when not playing.

The sandboxed Catalyst target has its own Keychain access group and uses the
data-protection Keychain for the login token. After changing signing or pulling
entitlement updates, choose **Product > Clean Build Folder** once before running
again so macOS does not launch an older app signature.

Sign in with the same server/account/profile to share catalog, profile names and
images, Archive backdrop, watch progress, and history with iOS and the web desktop.
This is server-backed synchronization on fetch/save, not instantaneous UI mirroring.
Mac sign-in storage is separate; you may need to log in again. Desktop appearance,
bio, reviews, and watchlist are profile-scoped local preferences, just as the web
desktop's localStorage features are local. Existing Tauri/browser preferences are
not automatically imported or synchronized. No passwords or tokens are imported.

The desktop-fidelity pass restores the ColorPicker.jsx swatches (24 solids and
18 gradients), arbitrary colors, four custom-gradient styles, six saved favorites,
Apply/Cancel/Reset, and the browser's dimmed/blurred dialog. Expanded cards animate
in place into the large card and five cropped rail cards. Recently Watched displays
history, a rotating eight-second cover banner, and the frontend's New on CearaWorld
list. Removing a history item does not clear unfinished progress; Archive retains
its separate Remove from Continue Watching action.

Title pages use the exact desktop cover sources, with native bounded decoding.
Clicking an episode selects it; Play/Continue starts playback. Hovering for 1.5
seconds previews the episode details, matching BetterEpisodePreview.jsx (the
current browser route does not auto-play a video on hover). Reviews includes its
muted waterfall background, date picker, three genre tags, stars, watchlist filters,
drag ordering, and selectable watched-film collection. Ambient animation pauses
offscreen/inactive and respects Reduce Motion. Player volume is remembered and
its slider expands on hover; raising volume also clears mute.

This remains a native recreation, not an embedded JSX renderer or a pixel-identical
port. macOS owns its file/color/date panels and full-screen window behavior. Web
offline-download handling and the decorative holiday snow toggle are not ported.
The original React/Tauri frontend and backend are unchanged.

The desktop catalog order is generated from the existing frontend data module:

```sh
node ios/scripts/generate-desktop-reference.mjs
node ios/scripts/generate-desktop-reference.mjs --verify
node ios/scripts/generate-desktop-artwork.mjs
node ios/scripts/generate-desktop-artwork.mjs --verify
```

Commit the generated `Resources/desktop-reference.json` and `Resources/DesktopArtwork`
with changes. The latter contains 62 desktop covers at up to 3072 pixels plus
640-pixel thumbnails (about 30 MB); the checked-in Xcode project includes this
folder only in Catalyst builds. No large SVG web views are used. New titles
not yet in that order append in catalog order. `--fixtures` also regenerates the
small catalog used for Mac layout tests; it does not submit any API writes.

Regression tests stub authentication, profile changes, and media requests rather
than altering a live account or sending request emails. The Catalyst-only layout
test captures Library and title pages at 1440×900 and 1200×760, expanded cards, color
picker, selected episode, Recently Watched, Reviews, Archive, and the profile
picker in the test app's `Library/Caches/CWorldMacQASnapshots` directory. A real
account playback session, live upload, and a physical external display still need
manual acceptance testing. Distribution signing/notarization is not configured by
this local-development change.

## Native mobile artwork

The current catalog's 124 SVG artwork URLs resolve to bundled native images through
`MobileArtwork` in `ImageCache.swift`. This also works with cached catalogs, offline,
and with profile backdrops using those same URLs. Original SVGs and backend/catalog
URLs are unchanged. Unknown SVG URLs retain the existing WebKit fallback.

Exports preserve the complete SVG composition. Cards are 1024 pixels on their longest
side, posters 1536, and backdrops 3072, with separate 320-pixel thumbnails. Opaque
images use quality-94 JPEG with 4:4:4 chroma; transparent images use lossless PNG.
These are high-quality raster copies, not pixel-identical replacements at arbitrary
zoom. Views still downsample to their requested size using the native image cache.

The initial export occupies approximately 86 MB in the app bundle (versus 682 MB of
source SVGs across the entire catalog). This trades a larger install for immediate
artwork with no artwork download or WebKit startup for known SVGs. It does not imply
the old app downloaded the whole source catalog on every launch.

To regenerate after changing artwork, install the frontend dependencies (the current
toolchain provides Sharp 0.33.5), then from the repository root run:

```sh
node ios/scripts/generate-mobile-artwork.mjs --output /private/tmp/cworld-mobile-artwork-new
```

Use a fresh output directory. Review `generation-report.json` and the generated
images, then replace `ios/CWorldIOS/Resources/MobileArtwork` with that complete
directory. Source and URL hashes version filenames; replacing the directory avoids
keeping obsolete exports. Commit generated resources along with the manifest and
rebuild the app. Changing an SVG at the same URL requires regeneration and a new
app build; remote changes cannot invalidate a bundled copy. Update the coverage
test's expected count when the catalog changes. `--samples --qa-output <directory>`
generates representative side-by-side lossless-reference/JPEG comparisons.

Run `node ios/scripts/generate-mobile-artwork.mjs --verify` to check current catalog
coverage, source hashes, and exported dimensions without changing any files.

The Xcode resource is a folder reference so `MobileArtwork/manifest.json` and its
images retain their relative paths inside the app. No server deployment is needed.

## Profile, playback, and search polish

Profile uploads are orientation-corrected and resized to at most 768 pixels before
JPEG encoding off the main actor. Both profile avatars and header images support
the backend's existing `data:image/...;base64` format as well as remote URLs.
The editor observes the refreshed profile and reports/retries failed saves.
Profile selection is committed before the intro flag changes; the root requires
an active profile before playing the intro. Restoring a saved profile does not
automatically play the intro. Leaving the intro stops its player.

Movie cards now open `MediaDetailView`, where Play/Resume explicitly starts video.
Search in Home and Archive presents a shared, debounced search screen with native
Liquid Glass on iOS 26, a material fallback on older iOS, and an opaque accessibility
fallback for Reduce Transparency. Search includes titles, creators, episode names,
and episode codes (for example `S01E02`), with All/Titles/Episodes scopes. Selecting
an episode opens its show page at that season and highlights/scrolls to the episode.

Skip actions remain visible independently of the auto-hiding transport controls.
`Resources/episode-markers.json` expands the existing web player's timing rules for
1,252 episodes, including cold-open start times omitted by the catalog. Unknown
episodes retain catalog timing fallback; no timings are invented for uncovered
episodes. Invalid/out-of-duration timings are ignored. Skip Outro advances to the
next episode when available, otherwise finishes the current one. Outgoing progress
is captured before switching selections so it cannot be attributed to the next one.

After changing the web player's timing table or adding episodes, regenerate:

```sh
node ios/scripts/generate-episode-markers.mjs
```

The script reads only the local `skipTimes` table and current catalog; it does not
change the website or backend. Commit the generated JSON and rebuild iOS. The
bundled timings take precedence for covered episodes; changes require regeneration.
Update the coverage test count if the number of covered episodes changes.

Liquid Glass API reference: [Apple's custom-view guidance](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views).

## Continue Watching, outro completion, and subtitles

At a show's known outro start, the player resets that episode's resume timestamp
to zero through the existing progress POST API. It keeps watching the credits;
no automatic episode jump is introduced. A per-playback completion flag prevents
periodic, exit, or background saves from bringing back the cleared timestamp.
Reopening the episode starts a new viewing session and can save progress again.
Episodes without a known outro clear on reaching the actual end. Watch history
is retained. No backend deletion endpoint or deployment is required.

Progress writes are serialized per profile/episode, duplicate resets share a
pending request, and late fetch/save responses cannot overwrite newer local state.
Reset failures are surfaced and can be retried (the playback sync loop retries
while the player remains open). A reset is stored as a zero-time record, not a
deleted database row. The latest record controls shelf eligibility so completion
does not reveal an older partially watched episode underneath it.

Archive Continue Watching cards resume the exact saved movie or episode with its
subtitle/skip metadata. Long-press a card and choose **Remove from Continue Watching**
to reset this title's progress; a VoiceOver action is also available. Other title
cards still open detail pages.

The subtitle parser supports both `MM:SS.mmm` and `HH:MM:SS.mmm` WebVTT timestamps,
SRT comma decimals, identifiers, cue settings, markup/entities, and overlapping
captions. Download/empty-file failures expose Retry; cancellation and attempt
identity checks prevent captions from a previous episode appearing in the next.
Parsing runs off the main actor. See the [WebVTT specification](https://www.w3.org/TR/webvtt1/).

Read-only mapping/file audit (add `--remote` to fetch all mapped caption files):

```sh
node ios/scripts/audit-subtitles.mjs --report /private/tmp/cworld-subtitle-audit.json
```

The September 10 audit verified 462 mapped tracks across 45 subtitle-enabled titles,
including 88 Attack on Titan episodes. All remote files returned HTTP 200 and matched
their local counterparts. The production Swift parser read 205,307 cues; 35 existing
empty or non-positive-duration cue blocks were safely ignored. This verifies track
availability and parsing, not the linguistic accuracy or timing alignment of every
caption against the videos.
