# Media authoring

`frontend/src/data/mediaRegistry.json` is the authoring source for media identity,
presentation, episode filenames/metadata, subtitle references, and skip timings.
Do not edit the generated modules or put timing tables back into `Show.jsx`.

Each entry under `media` is keyed by its permanent CWorld ID. Keep that ID and
`assetId` stable: watch progress, routes, S3 paths, and native catalogs depend on them.

| What to change | Field within a media entry |
| --- | --- |
| Main title, description, year, genre, duration | `library` |
| Detail cover image | `library.background` |
| Mobile backdrop, poster, card image | `mobile.background`, `mobile.keyart`, `mobile.card` |
| Rating, creator, added date | `mobile.ratings`, `mobile.creator`, `mobile.dateadded` |
| Intentionally different mobile/sidebar title | `mobile.title` / `sidebar.title` (otherwise inherits `library.title`) |
| Sidebar identity and order | `sidebar.cardId`, `sidebar.order` |
| Carousel order or deliberate image/title override | `carousel` (otherwise inherits the main cover/title) |
| Movie captions or series caption template | `captions.movie` / `captions.series` |
| Episode filename tokens | `episodeTitles[season]` |
| Episode display titles/descriptions | `episodeMetadata[season]` |
| Legacy next/previous episode navigation limits | `seasonLengths[season]` |
| Skip times | `skipTimes.seasons[season][episode]`, or `skipTimes.default` |

The filename tokens and display episode titles serve different purposes. Do not
rename filename tokens casually: legacy MP4 lookup still uses them. Existing
navigation limits are preserved even where they differ from imported episode data;
review `seasonLengths` when intentionally changing a show's available seasons.

`newMedia` at the registry root controls the newest-first shelf. Entries reference
`showSlug`; `showTitle` is only needed for an intentional display override.
`review` contains legacy review presentation overrides; `reviewFields` preserves
the fields that screen used before the migration. Ordinary matching values inherit
from `library`, including the title and description.

For example, One Punch Man S1E5 is authored at:

```text
media.onepunchman.skipTimes.seasons.1.5
intro.start = 70.05
intro.end = 159.8
outro.start = 1322.53
```

Zero-length intros and zero outro starts mean disabled. Default timing rules use
`fromSeason` and `fromEpisode`: they apply from that episode in that season and
through subsequent seasons. An explicit episode entry overrides defaults/rules.
The browser and native generators use the same resolver.

After a manual registry edit, from `frontend` run:

```sh
npm run media:generate
npm run media:check
```

This regenerates web modules, episode JSON, both public catalog copies, bundled
native timing fallbacks, and the Mac shelf reference. Commit these outputs with
the registry. A production build checks for drift and fails with the stale filename
if someone changed generated data without updating the registry. Development
startup regenerates it automatically.

After changing image files, also regenerate native artwork (from the repository root):

```sh
node ios/scripts/generate-mobile-artwork.mjs
node ios/scripts/generate-desktop-artwork.mjs
```

MediaScraper's **Add to CWorld** now writes the registry, generates compatible web
data, copies artwork/subtitles, and runs the existing native preparation workflow.
Preview remains read-only. Its **Skip Times Studio** writes registry timings and
regenerates the public catalog and native fallback; undo refuses to overwrite newer
registry changes. Restart MediaScraper's backend after updating these tools.

`episodes:metadata` also updates the registry before regenerating episode data.
CSS card presentation remains styling code; adding a title still adds its card rule.

Publish regenerated catalog/assets to update the deployed web/native data. Native
code changes and bundled artwork still need an app rebuild. This registry does not
upload video or HLS captions to S3; those publication steps remain in the migration tools.
