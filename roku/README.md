# CWorld Roku proof of concept

This is a standalone Roku SceneGraph client for the Phase 2 rollout. It reads the shared catalog from CWorld and requests short-lived signed CloudFront URLs from the playback-session API. The existing React/Tauri desktop app is not used by this channel and is unchanged.

## Local setup

1. Leave `authToken` empty in `source/Config.brs` to use the Roku sign-in screen, or set it locally to a token from `POST /api/auth/login/` to skip sign-in. Do not commit that value.
2. `source/Config.local.brs.example` is a reference template for local configuration; it is not loaded automatically by Roku.
3. Package the contents of this directory as a Roku channel, or sideload it from the Roku developer web page.

To create a sideload package from the repository, run `sh package-roku.sh`. Open the generated `dist/cworld-roku.zip` in the Roku developer installer. The package script includes only the manifest, BrightScript source, and SceneGraph components.

The default API host is `https://cearaworld.com`. For local testing, set `CWORLD_API_BASE` to a host reachable from the Roku, such as your computer's LAN IP. `localhost` will refer to the Roku itself and will not reach a development server running on the computer.

## Controls

- Sign in with your CWorld account when prompted, then choose a profile.
- Use the directional pad to move through the catalog.
- Select a title to open its detail view.
- Select an episode or the movie play button to start playback.
- Press Back to return from playback to details, then from details to the catalog.

When a title has saved progress for the selected profile, playback resumes from that position. Progress is written periodically and when leaving the player; watch history is updated when playback starts.

## Phase 2 boundary

This client covers the end-to-end catalog, authentication, profile, playback, basic watch-progress, caption, and sideload-package path. It does not yet implement downloads or production channel certification. Those are subsequent phases and do not require changes to the desktop frontend.
