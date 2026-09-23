# Incremental HLS migration

Deploy the backend and browser changes before migrating. Native iOS/Catalyst already
plays the session URL with AVPlayer. Repackage Roku to include HLS stream detection.

## S3 convention (bucket: all-shows)

- Episodes: `hls/adventuretime/season-1/s01e01/master.m3u8`
- Movies: `hls/exmachina/master.m3u8`

Use the catalog `assetId` with hyphens removed and lowercase. For shows, use
`season-1` (no zero padding) and `s01e01` (two digits minimum). The show catalog ID
can still be `adventure-time`; display titles, artwork and progress IDs do not change.
Episode title text is not part of the storage path. Retain the filenames and
relative directories inside each generated HLS package.

## Upload one episode

1. Keep the local MP4 as the offline copy.
2. Generate the HLS package; its outer folder may be renamed `s01e01`.
3. Upload video, audio, subtitles, initialization files and child playlists into
   `hls/adventuretime/season-1/s01e01/`.
4. Upload `master.m3u8` **last**. Its presence activates HLS for that episode.
5. Test CWorld playback, seek/resume, subtitles, next episode and AirPlay.
6. Only after testing, delete the original S3 MP4 using your migration procedure.

The resolver checks the exact master key on each playback request. If it does not
exist (404), it uses the existing MP4 resolver. Authentication/permission errors
are surfaced rather than mistaken for missing media. The existing `thedrama/hls`
pilot remains a fallback when `hls/thedrama/master.m3u8` is absent.

The API signs and rewrites manifests, including initialization file URIs, while
CloudFront serves media bytes. Tokens and CloudFront policies are scoped to the
episode folder. The API IAM identity needs GetObject and ListBucket access for
the new prefix so missing objects return 404. CloudFront must allow the new paths
and browser CORS access. The app's signed API manifest URL is the playback entry;
a raw private CloudFront master URL alone is not sufficient.

Uploading HLS does not delete old objects or configure lifecycle rules. In a
versioned bucket, noncurrent MP4s remain billable until expiration eligibility.
Tag-filtered rules cannot include expired-delete-marker cleanup; that requires a
separate prefix/bucket-scoped cleanup rule. Leave “newer noncurrent versions to
retain” unset if the migration rule is intended to expire every tagged old version.
