# AirPlay and persistent playback

## TV companion additions

- Open **TV Remote** using the remote icon in either the full player or mini-player. It includes play/pause, previous/next, 15-second skips, timeline seeking, a swipe-to-seek pad, system device volume, and caption controls.
- **Up Next** is a session queue shared across navigation. Add from the remote's catalog picker or long-press an iPhone movie/episode placeholder. Use Edit to drag-reorder and remove entries. Explicit queued entries take priority over automatic episode order. Stop/logout/profile change clears the queue; changing the current title preserves it. It is not a server-synced or cross-launch playlist.
- **Cinema intermission** pauses into a dedicated artwork screen on the custom mirrored TV display. End intermission or Play resumes. Direct video AirPlay cannot display this custom overlay.
- **Connection recovery** pauses on TV disconnection, retaining the player and its position. The banner opens the remote. Select the TV in the route picker, then Play, or choose Continue on phone. Reconnection uses the system picker, not automatic device selection.
- **Live Activity**: the app embeds `CWorldWatchingWidget.appex` for iPhone Lock Screen/Dynamic Island presentation. It includes title/episode, artwork, route status, progress, queue count, play/pause, and expanded next-item controls. Tapping TV Remote opens `cearaworld://remote`. Start playback with the app foregrounded; updates then follow the active session. No push server is required. Live Activities must be enabled in device settings. Artwork is a 192×132-pixel, high-quality JPEG rendered at 64×44 points and stored in the shared `group.com.cearaworld.cworld` App Group. Only its unique filename enters the activity payload, avoiding ActivityKit's 4 KB limit. Both iOS targets use `CWorldWatching.entitlements`; device provisioning must include that App Group (check Signing & Capabilities on both targets if signing fails). Catalyst retains its separate entitlements. A low-resolution inline fallback remains if shared storage is unavailable. Files remain readable after the first device unlock and are retained for seven days before cleanup so previous activity renders remain valid. Full Lock Screen media artwork remains separate.

The new widget target uses automatic signing with the app's development team and bundle identifier `com.cearaworld.cworld.watching`. Build/run the containing CWorldIOS app to install the extension. The extension is excluded from Catalyst; the remote, queue, and custom intermission work there.

Checked: iOS app/extension builds, Catalyst build, queue/dedup/lifetime/recovery tests, embedded-extension metadata, Live Activity next action dispatch, and rendered iPhone remote/TV intermission layouts. Still validate on a physical phone and receiver: route drops during playback, remote volume support, Live Activity delivery and button execution while locked, and mixed movie/episode queue handoffs. The simulator does not establish those hardware behaviors.

Implementation references: [Apple Live Activities guide](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities) and [LiveActivityIntent](https://developer.apple.com/documentation/appintents/liveactivityintent).

## Playback behavior

Playback now lives in a root-owned host. Navigation launchers hand their selection to that host and dismiss; minimizing keeps the same player and playback surface alive. The down arrow minimizes, the mini-player restores or pauses playback, and X stops it. Logging out or changing profile stops playback.

Video AirPlay is enabled with a video-prioritized route picker, playback audio session, audio background mode, and `continuesIfPossible`. The local video surface detaches when minimized or backgrounded. The existing external-display scene continues to use the same player.

The outro countdown uses playback time: five seconds from the valid outro marker, or the episode end if sooner. Pausing freezes it; seeking recalculates it. The next episode's signed URL is prepared near the outro and reused only within 60 seconds. Handoff reuses the AVPlayer and has a finite background-task allowance for a signing request. This is not a gapless AVQueuePlayer implementation: receiver/network handoff can still buffer. Missing/failed prefetch falls back to normal playback loading. Episode completion clears progress; the final episode ends without advancing.

## Physical-device acceptance checks

Use a signed build on an iPhone and a real AirPlay video receiver. Simulator or Catalyst tests cannot validate TV routing or iOS lock-screen behavior.

1. Start a show, select a TV using the player's AirPlay button, and confirm video/audio are on the TV.
2. Lock the phone for at least a minute. Confirm playback continues, then exercise lock-screen pause and play.
3. Switch to another app and confirm TV playback continues. Return, minimize using the down arrow, browse Library/Archive, restore the player, and verify the same position/session.
4. Seek before the outro. Verify the five-second countdown, pause/resume it, then verify advancement and cleared outgoing progress. Repeat while locked and in another app; verify two successive episode handoffs and a season boundary.
5. Verify end-of-file advances if no valid outro exists, and the final episode does not loop.
6. Disconnect/reconnect AirPlay, interrupt with a phone call, and test an unavailable next-episode URL. Confirm errors are visible on restoration and no duplicate audio plays.
7. Repeat browsing with Control Center screen mirroring/custom TV mode. That mode may need the app foregrounded and phone unlocked; it is distinct from direct video AirPlay.
8. Verify subtitles separately. App-rendered sidecar captions and the custom countdown overlay appear on the custom mirrored display, not on direct video AirPlay. Direct AirPlay needs captions packaged in the media stream. The countdown/advance logic still runs on the phone.
9. Stop playback and change profiles/logout; confirm the old session stops and lock-screen controls clear.

Automated checks cover countdown boundary/seek behavior, persistent host minimization/stop, and external-display ownership. Hardware acceptance remains required.
