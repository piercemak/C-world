# CWorld Roku proof of concept

This is a standalone Roku SceneGraph client for the Phase 2 rollout. It reads the shared catalog from CWorld and requests short-lived signed CloudFront URLs from the playback-session API. The existing React/Tauri desktop app is not used by this channel and is unchanged.

## Local setup

1. Leave `authToken` empty in `source/Config.brs` to use the QR-code sign-in screen, or set it locally to a token from `POST /api/auth/login/` to skip sign-in. Do not commit that value.
2. `source/Config.local.brs.example` is a reference template for local configuration; it is not loaded automatically by Roku.
3. Package the contents of this directory as a Roku channel, or sideload it from the Roku developer web page.

To create a sideload package from the repository, run `sh package-roku.sh`. Open the generated `dist/cworld-roku.zip` in the Roku developer installer. The package script includes only the manifest, BrightScript source, and SceneGraph components.

The default API host is `https://cearaworld.com`. For local testing, set `CWORLD_API_BASE` to a host reachable from the Roku, such as your computer's LAN IP. `localhost` will refer to the Roku itself and will not reach a development server running on the computer.

## Controls

- Sign in with your CWorld account when prompted, then choose a profile.
- Scan the QR code shown on the sign-in screen, sign in at the browser URL, and approve the Roku. Use `Use remote login` if phone approval is unavailable.
- Use the directional pad to move through the catalog.
- Select a title to open its detail view.
- Select an episode or the movie play button to start playback.
- Press Back to return from playback to details, then from details to the catalog.

When a title has saved progress for the selected profile, playback resumes from that position. Progress is written periodically and when leaving the player; watch history is updated when playback starts.

## Phase 2 boundary

This client covers the end-to-end catalog, authentication, profile, playback, basic watch-progress, caption, and sideload-package path. It does not yet implement downloads or production channel certification. Those are subsequent phases and do not require changes to the desktop frontend.


## Catalyst-style library prototype (2026-11-18)

Rollback checkpoint: `checkpoint/roku-before-catalyst-library-2026-11-18`
(commit `91650756b17db6e3bc70bc7bc5d7a10108655aa2`). This is a local Git tag,
not a published release. Ask to revert the Roku library prototype to this checkpoint;
restore only its Roku changes so subsequent unrelated app edits are preserved.

This first slice has six square card images, a focused-title sidebar, animated
focus, a library entrance transition, and the existing authenticated episode player.
It is not the completed Catalyst feature set. It uses a 1280×720 logical TV canvas.
The packager prepares rounded PNGs from existing native artwork for the Roku package;
rerun packaging after adding titles or updating artwork. It does not modify native
artwork or web catalogs. Python 3 and Pillow are required; the packager uses the backend virtual environment when available.

### Physical Roku acceptance test

1. Enable developer mode on a Roku and open its developer installer from a computer
   on the same network. Install `dist/cworld-roku.zip` (or the supplied prototype ZIP).
2. Sign in via QR approval or remote login, then select a profile.
3. Check six cards fit without overlap; move focus across both fixed rows and use Left/Right to page horizontally. The sidebar must follow focus, and Up at the top returns to navigation.
4. Open a show with an already playable HLS episode (e.g. Adventure Time S1E1).
   Play, pause, seek, and Back to details/library. Reopen to check saved progress.
5. Open Continue Watching and verify it uses the selected profile's progress.
6. Test on the oldest intended Roku as well as the newest; verify artwork loading,
   focus transitions and playback on hardware. Compilation is not a playback test.

The native iOS/Catalyst apps, backend, S3 objects and browser are unchanged.


### Build 10: browsing and details

- Browse menu: Movies, Shows, newest ten titles, artwork view toggle, local title
  search and profile switching. New-title references and bundled artwork refresh
  when the package is rebuilt; the main catalog still comes from the live API.
- Continue Watching: up to ten distinct titles ordered by their latest resumable
  episode's progress timestamp.
- Episode details: four landscape placeholder tiles per visible row, a scrollable
  season picker, focused episode description, watched/progress labels, large preview
  and progress bars. Press Up from episodes to choose another season; Back returns.
- Episode placeholders use the same CloudFront convention as Catalyst. Movie
  placeholders use website images, including The Grey's existing cache version.
  Missing images fall back to bundled desktop cover thumbnails.
- The native Roku player remains in use. This build does not claim full Catalyst
  player/requests/remote-control feature parity or Apple Liquid Glass rendering.

Test filtered-title selection, 20+ season selection, Continue Watching, movie
placeholders, and Back during playback loading on the physical Roku. Compilation
and URL checks do not replace that hardware acceptance test.


### Build 11: direct Catalyst visual alignment

Compared with the running Catalyst library and MacDesktopView/MacTitleView:
Poppins font files, full-size existing native artwork exports, a neutral gradient
behind one inset panel, six-card pages, profile/title sidebar and stacked recent
artwork. Cards use a rounded mask and gloss rather than an outline. Left/Right at
an outer column changes page; Down from the bottom row advances the page.
The detail page uses the actual cover as its background, a left hero/action area,
a 360px right preview rail, progress/runtime statistics, and caption footers beneath
episode placeholders. The third statistic says Playback/Stream, not Offline,
because this Roku client does not implement local downloads.

Roku focus replaces mouse hover. Apple Liquid Glass is approximated with translucent
surfaces; MaskGroup rounding depends on the device graphics backend. The six-card
layout is adapted to a 1280×720 logical TV canvas; this is not a claim of pixel-perfect
SwiftUI rendering. Artwork view switching still uses Roku's paged library structure.


### Build 13: fixed library and custom player

The library is now a non-scrolling Group with exactly six fixed card slots. Up/Down
changes selection, never the container position; Left/Right at an edge changes the
page. Rounded corners are baked into the bundled PNGs; runtime MaskGroups are gone.

The player now uses `SeedPlayer` over the native Roku video decoder. See
[PLAYER-PARITY.md](PLAYER-PARITY.md) for the Catalyst comparison, controls, implemented
behavior, and features that remain platform-specific or unported.
