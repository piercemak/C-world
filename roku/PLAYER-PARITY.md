# Catalyst player review and Roku build 13

Reference implementations reviewed:
- `ios/CWorldIOS/Features/Library/MediaDetailView.swift`: PersistentVideoPlayerView,
  playback loading/retry, captions, progress, next/previous, external playback,
  minimize/browse, phone remote, prefetch and completion behavior.
- `ios/CWorldIOS/Features/Mac/MacPlatform.swift`: MacPlaybackControls,
  MacSubtitleText, MacSubtitleSettings, MacOutroCard and its playback-time sweep.
- `ios/CWorldIOS/Features/Library/EpisodeSkipCatalog.swift`: marker validation,
  intro visibility, outro visibility and five-second next-episode countdown.

## Implemented Roku equivalents

| Catalyst behavior | Roku implementation |
| --- | --- |
| Title and episode heading; fading controls | Custom dark gradient chrome, title and SxxExx episode heading, four-second idle timeout and fades |
| Play/pause, restart, ±15 seconds | Bottom toolbar, dedicated remote Play, Replay/Rewind/Fast-forward keys |
| Timeline with elapsed and total time | Focus timeline with Up; Left/Right seeks 15 seconds |
| Previous/next | Catalog episode ordering, including season boundaries; unavailable directions do nothing |
| Skip intro after the cold open | Uses live `skipIntroStart` and `skipIntroEnd`; never assumes start zero |
| Skip outro and up-next artwork | Live `skipOutroStart`, next episode placeholder and name |
| Automatic outro skip; cancellation | Five playback seconds, not wall time; pause/buffering do not consume countdown; Down cancels |
| Auto-skip preference | Saved in Roku registry; also governs advancement at natural end |
| Subtitle defaults by title | `subtitlesDefaultEnabled` from catalog; manual choice retained across episodes of same title |
| Subtitle on/off and track choice | Native Roku caption rendering; track menu includes stream and supplied sidecar captions |
| Subtitle appearance | Saved size, available Roku font family, color, edge effect, background opacity and reset |
| Audio selection | Actual `availableAudioTracks`, current-track indicator, user-selectable identifiers; Roku decides compatibility |
| Mute | More menu; TV volume remains controlled by the TV/receiver remote |
| Progress color | Saved Roku-local color menu |
| Resume, watch history, progress | Existing authenticated endpoints; immutable queued progress snapshots prevent episode-switch races |
| Completion at outro | Episode progress reports full duration when the configured outro has been reached |
| Loading, buffering, errors | Fixed center status that never shifts controls; failure details with retry |
| Back | Returns directly to the selected media detail screen, retaining episode selection |

## Differences and remaining work

This is not full 1:1 parity. These features were identified but are not implemented
by this Roku build:

- Catalyst's iPhone remote pairing/connection/queue protocol, arbitrary Up Next queue,
  and playback handoff. The Roku hardware remote controls the implemented player.
- Minimized player and browsing while playback continues, Picture in Picture,
  external-monitor routing, and the outgoing AirPlay picker.
- Hover-frame previews and mouse/keyboard interactions. Roku seek thumbnails require
  a separately generated BIF/image track; this package does not invent thumbnail data.
- Preparing the next playback session in advance; Roku requests it when advancing.
- Exact Helvetica Neue/bold rendering, continuous subtitle size/opacity sliders,
  Apple material effects and the Mac's local preferences. Roku's native caption
  renderer offers enumerated fonts, sizes and effects instead. Its accessibility
  preferences and decoding capabilities remain device dependent.
- Offline downloads and production Roku channel certification.

The original iOS/Catalyst sources, web app, API code and S3 objects are not changed
by this implementation. Caption/auto-skip/color settings here are Roku-local, not
cross-device database settings. Native caption mode is restored when the player closes.

## Remote navigation

- OK reveals controls; Left/Right selects toolbar actions; OK activates.
- Up from toolbar selects timeline; another Up selects a visible skip card or Back.
- On the timeline, Left/Right seeks. Down returns to toolbar.
- With controls hidden, OK activates a visible Skip Intro/Next card.
- Down on the outro card (or with controls hidden) means Keep Watching.
- Play pauses/resumes. Rewind/Replay and Fast-forward seek −/+15 seconds.
- Star opens playback settings. Back exits to media details.
- Captions opens enable/disable, track choice and appearance; Audio lists real tracks.

## Validation and device acceptance

The BrightScript compiler, XML/package checks, pure skip-rule tests and fixed-grid
navigation tests run locally. Tests live in `roku/tests`; they are not included in
the sideload ZIP. Local tests do not establish TV decoding or visual acceptance.

On the physical Roku verify:
1. Up/Down moves focus between two stationary rows with no card overlap/artifacts.
2. Left/Right changes pages at edges, including a partial last page.
3. Play a movie and show; pause, seek while paused, restart, retry and Back.
4. Check a known cold open, intro skip, pause during outro countdown, cancel, and
   auto-skip off. Check the final episode and a cross-season Next transition.
5. Toggle captions, select audio, change subtitle style, exit and reopen.
6. Resume after leaving; verify the previous episode did not inherit new progress.
