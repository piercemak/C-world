# CWorld Catalog Contract v1

This contract is the shared metadata boundary for the React/Tauri client, the Roku client, and MediaScraper. The first implementation may generate it from the existing CWorld source files, but clients must consume the normalized shape rather than reconstructing S3 paths from episode titles.

## Public endpoint

The planned endpoint is:

```text
GET /api/catalog/v1
GET /api/catalog/v1/media/:mediaId
```

The response must be JSON, served over HTTPS, and contain absolute HTTPS artwork URLs for Roku. The catalog may be cached by clients using `catalogRevision` and `Cache-Control` headers.

## Identity rules

- `id` is the canonical CWorld media ID and does not change when artwork or filenames change.
- `assetId` is the normalized asset-folder ID used by local artwork and storage tooling.
- An episode is identified by `mediaId`, `season`, and `episode`.
- Episode display titles and descriptions are independent from playback object filenames.
- Movies use `type: "movie"` and have `movieAsset`; shows use `type: "show"` and have `seasons`.
- Public clients receive `playbackRef`, not an unsigned S3 URL or a private signing key.
- `subtitleTracks` contains absolute, public WebVTT caption URLs for desktop and iOS; episode-level `subtitles` contains WebVTT URLs for that episode.
- `rokuSubtitleTracks` and episode-level `rokuSubtitles` contain absolute Roku-compatible SRT URLs.
- `artwork.cardIOS`, `artwork.backdropIOS`, and `artwork.mobileBackdropIOS` are optional optimized raster variants for iOS. iOS should prefer them when present and fall back to the standard artwork fields when they are absent.

## Playback rules

Clients request a signed URL using the stable playback reference:

```json
{
  "mediaId": "steven-universe",
  "season": 1,
  "episode": 10
}
```

The backend resolves the reference to the actual object key and returns a short-lived CloudFront URL. This keeps filename spelling, spaces, and renamed objects out of client logic.

## Update behavior

- Metadata, artwork, subtitle mappings, and newly published titles update when clients refresh the catalog.
- A Roku code release is only required for Roku UI or player-code changes, not ordinary catalog changes.
- `schemaVersion` changes only when the response shape is incompatible.
- `catalogRevision` changes for every published catalog update.
- Missing optional metadata is represented by an empty string or empty array, never by a client-specific fallback title.
- Caption files are published in a Roku-compatible format by the frontend build; clients should consume the URLs from the catalog.

## Example

```json
{
  "schemaVersion": 1,
  "catalogRevision": "2026-09-08T00:00:00Z",
  "generatedAt": "2026-09-08T00:00:00Z",
  "items": [
    {
      "id": "steven-universe",
      "assetId": "stevenuniverse",
      "type": "show",
      "title": "Steven Universe",
      "description": "A coming-of-age story about Steven and the Crystal Gems.",
      "artwork": {
        "card": "https://cearaworld.com/images/cardimages/stevenUniverseLogo1.svg",
        "poster": "https://cearaworld.com/images/stevenuniverse/covers/stevenuniverseIcon.jpg",
        "backdrop": "https://cearaworld.com/images/stevenuniverse/covers/stevenuniverse_backdrop.svg"
      },
      "metadata": {
        "creator": "Rebecca Sugar",
        "rating": "8.2",
        "year": "",
        "genres": [],
        "duration": "22m",
        "ageRating": ""
      },
      "subtitles": true,
      "subtitleTracks": [],
      "rokuSubtitleTracks": [],
      "seasons": [
        {
          "number": 1,
          "episodes": [
            {
              "number": 10,
              "title": "Steven's Lion",
              "description": "",
              "airDate": "",
              "duration": "22m",
              "playbackRef": {
                "mediaId": "steven-universe",
                "season": 1,
                "episode": 10
              },
              "subtitles": [],
              "rokuSubtitles": []
            }
          ]
        }
      ]
    }
  ]
}
```

## Publisher requirements

MediaScraper must validate this contract before publishing. It should resolve and report the private object-key mapping separately, so a filename mismatch can be shown as a warning without changing the episode's display title or identity.
