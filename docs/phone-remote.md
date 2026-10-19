# Phone remote for Catalyst

Rebuild both apps after changing the remote protocol. No server deployment is needed.

## Connect

1. Use the same local network, SeedSpace account, and profile on both devices.
2. Allow Local Network access. Start a title on the Mac.
3. Open the iPhone app and choose Connect in the discovery prompt.
4. Choose Allow and remember in the Mac's app-wide prompt on the first connection.

The Mac advertises automatically while a player exists, including paused playback.
Discovery is filtered by an account/profile scope; this filter is **not authentication**.
The first connection requires explicit Mac approval. Protocol v3 stores a per-device
shared secret in Keychain, scoped to the account/profile. Later connections prove possession
of that secret; device names alone never grant access. Fresh connection challenges and
authenticated, sequenced commands protect reconnects. Multipeer Connectivity also requires
encrypted transport. Existing pre-v3 pairings require one new approval after rebuilding both apps.
Use Forget trusted devices in remote settings on both devices to revoke/reset pairing.

## Connected behavior

- The Playing on Mac badge opens the remote. Closing the remote leaves the connection active.
- On Mac, only a small connected iPhone icon appears in the player toolbar and hides with
  the controls. It opens remote settings; there is no persistent connection overlay.
- Normal movie/episode Play navigation on the phone sends a catalog ID to the Mac.
  The Mac resolves it against its own catalog; the phone cannot provide playback URLs.
- Add to Up Next targets the Mac. Its queue can be inspected, played, removed, and reordered.
- Transport, seeking, intro/outro skips, captions, audio-track selection, and player volume
  target the Mac. Player volume is not macOS system output volume.
- The Mac owns watch-progress writes and playback. Existing local phone playback stops
  when the remote connects. Disconnecting does not stop the Mac's video.
- Profile switching and sign-out disconnect the remote. Reopening the phone app offers
  discovery again. A suspended phone may need to reconnect; background remote connectivity
  is not guaranteed.

## Device acceptance checklist

- Discovery with matching profile; no offer for a different account/profile.
- Deny on Mac: phone must not control playback. Allow: state appears and transport works.
- Reconnect an approved phone: no repeat Mac approval. Forget on both devices: approval returns.
- Play a different episode from the phone's detail page; only the Mac starts it.
- Add/remove/reorder/play queue items; check the Mac queue and automatic next episode.
- Seek, pause, captions, available audio tracks, and player-volume changes.
- Lock/unlock phone, quit Mac, switch profiles, and reconnect without duplicate players.

Build and policy tests do not replace testing Bonjour discovery on physical devices.
