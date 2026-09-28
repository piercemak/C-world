# Adding incomplete shows

Add to CWorld can keep the full TMDB episode catalog even if only some videos
have been uploaded. Do not reduce the episode count or renumber the files to
close gaps. S11E05 remains episode 5 when episodes 2–4 are missing.

The browser, iPhone, and Mac Catalyst detail screens check the selected season
using `/api/catalog/v1/media/<id>/availability/?season=N`. Confirmed missing
episodes are disabled and labeled “Not uploaded yet.” Known missing next
episodes are not automatically skipped over to later episodes. Playback still
uses the existing resolver as the final authority.

The backend recognizes:

- Existing `asset/seasonN-mp4s/SxxExx_…mp4` objects supported by the MP4 resolver.
- Canonical `hls/asset/season-N/sxxexx/master.m3u8` objects. Complete the HLS
  upload with its master last, as the migration tool already does.

Availability is cached for 60 seconds. Detail screens refresh approximately
every 65 seconds while open (browser also refreshes on window focus). Later
uploads therefore appear without editing or re-adding the catalog entry.
S3/network errors mean unknown, not unavailable. This checks object presence,
not whether every HLS segment is intact or a codec is playable.

Checks are read-only and require the existing ListBucket/GetObject permissions.
They add S3 LIST/HEAD requests, scoped to the viewed season, not a whole-library
scan. They do not upload, delete, tag, or alter lifecycle rules.

Deploy backend/frontend changes and rebuild native apps to use the feature.
Roku's episode-list UI is unchanged. Existing subtitle import/numbering rules
are unchanged; do not sequentially renumber subtitles across missing episodes.
