# iPhone controlling Catalyst

The phone uses PersistentVideoPlayerView in remote mode: the same controls, safe areas and minimize presentation as local playback. No second AVPlayer downloads the movie. Mac snapshots supply time, play/pause, captions, audio tracks and queue. Progress remains owned by the Mac.

First-time pairing still requires approval. Encrypted reconnects target only the previously connected Mac in the same account/profile. Backgrounding disconnects the transport but preserves that route and the player/minimized state. Foregrounding rediscovers and authenticates the Mac without reopening the controller sheet. Three unsuccessful recovery cycles leave a manual Reconnect action. Explicit Disconnect, logout/profile changes and Forget clear the route. Force-quitting the app does not persist the active route.

MultipeerConnectivity cannot maintain a usable session through iOS background suspension. This is automatic recovery on return, not AirPlay or a lock-screen remote implementation. Catalyst keeps playing independently. No silent audio or fake background playback is used.

## Device acceptance

Build both iPhone and Catalyst from this revision. On the same network/profile:

1. Start playback on Mac and connect the phone. Approve a new phone once.
2. Verify normal player controls: pause/play, ±15, scrubbing, captions, audio, intro/outro and next/previous.
3. Add two queue entries; Next must follow the Mac queue. Verify reorder/remove.
4. Minimize and browse; the mini bar controls Mac playback. Reopen with its artwork/title.
5. Lock the phone for at least a minute. Mac should continue playing. Unlock/open SeedSpace; it should reconnect to that Mac and show its latest time without another approval or controller sheet. Repeat while minimized and after switching apps.
6. Turn Mac/network off: keep player state, disable transport, show Reconnect. Restore network and retry.
7. Disconnect explicitly, switch profile, or forget trust: no automatic reconnection to the old session.

Shared UI and protocol changes require both native builds. No backend deploy is required.
