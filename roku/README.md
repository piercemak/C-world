# CWorld Roku proof of concept

This is a standalone Roku SceneGraph client for the Phase 2 rollout. It reads the shared catalog from CWorld and requests short-lived signed CloudFront URLs from the playback-session API. The existing React/Tauri desktop app is not used by this channel and is unchanged.

## Local setup

1. Open `source/Config.brs` locally and set `authToken` to a token from `POST /api/auth/login/`. Do not commit that value.
2. `source/Config.local.brs.example` is a reference template for those local values; it is not loaded automatically by Roku.
3. Package the contents of this directory as a Roku channel, or sideload it from the Roku developer web page.

The default API host is `https://cearaworld.com`. For local testing, set `CWORLD_API_BASE` to a host reachable from the Roku, such as your computer's LAN IP. `localhost` will refer to the Roku itself and will not reach a development server running on the computer.

## Controls

- Use the directional pad to move through the catalog.
- Select a title to open its detail view.
- Select an episode or the movie play button to start playback.
- Press Back to return from playback to details, then from details to the catalog.

## Phase 2 boundary

This client intentionally covers the end-to-end catalog and playback path only. It does not yet implement Roku-native login, profile selection, watch-progress sync, subtitles, downloads, or production channel packaging. Those are subsequent phases and do not require changes to the desktop frontend.
