# The Drama HLS pilot

This pilot changes only `thedrama` to HLS. Every other title continues to use
the existing signed MP4 playback path.

The original object remains untouched at:

```text
s3://all-shows/thedrama/thedrama.mp4
```

The HLS rendition is added beside it under:

```text
s3://all-shows/thedrama/hls/
```

That means the pilot is reversible: remove the `playback` entry for `thedrama`
from the catalog and redeploy the backend/catalog, and CWorld will use the
original MP4 again.

## Create the package

Download a local copy of the source MP4, then run:

```bash
python3 scripts/package_hls_pilot.py \
  --input /path/to/thedrama.mp4 \
  --output /path/to/thedrama-hls \
  --subtitle /path/to/thedrama_subtitles.vtt \
  --ffmpeg /opt/homebrew/bin/ffmpeg \
  --ffprobe /opt/homebrew/bin/ffprobe
```

The source must contain a multichannel AAC, AC-3, or E-AC-3 audio track. The
Drama currently contains AAC 5.1, so the pilot preserves that surround track
and creates a stereo AAC fallback. The package contains:

- one copied video rendition;
- the original AC-3/E-AC-3 surround audio;
- a 192 kbps AAC stereo audio rendition, selected by default for AirPlay;
- the existing VTT copied into the package for reference.

The script never modifies the input file.

## Upload the package

Upload the generated folder so that `master.m3u8` ends up at
`thedrama/hls/master.m3u8`:

```bash
aws s3 sync /path/to/thedrama-hls s3://all-shows/thedrama/hls/ \
  --storage-class INTELLIGENT_TIERING
```

Make sure S3 metadata is correct: `.m3u8` files should use
`application/vnd.apple.mpegurl`, `.m4s` and `.mp4` files should use
`video/mp4`, and `.vtt` files should use `text/vtt`. The objects must also be
available through the existing CloudFront distribution used for media.

## Deploy and test

Deploy the backend and catalog changes, then test `thedrama` on iOS/AirPlay.
The playback-session response should contain a URL ending in
`/api/playback/hls/thedrama/master.m3u8` and `playbackType: "hls"`.

The pilot keeps subtitles on CWorld's existing VTT path; it does not yet make
subtitles an HLS-native track. This isolates the audio compatibility test.

## Rollback

Remove the `thedrama` entry from `HLS_PILOT` in
`frontend/scripts/generate-catalog-v1.mjs`, remove the matching `playback`
object from the generated catalog if it is committed there, regenerate/deploy,
and the existing MP4 playback path will be used again. The extra HLS objects
can then be removed from S3 when no longer needed.
