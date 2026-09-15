import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { buildLibraryShows } from "../src/data/libraryShowsData.js";
import { SHOWS } from "../src/components/mobileshowsData.js";
import { getSubtitleTrackSrc } from "../src/data/subtitleTracks.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const cworldDir = path.resolve(frontendDir, "..");
const titlesPath = path.join(frontendDir, "src", "data", "episodeTitles.json");
const metadataPath = path.join(frontendDir, "src", "data", "episodeMetadata.json");
const playerSourcePath = path.join(frontendDir, "src", "components", "Show.jsx");
const outputPath = process.env.CWORLD_CATALOG_OUTPUT
  ? path.resolve(process.env.CWORLD_CATALOG_OUTPUT)
  : path.join(cworldDir, "backend", "uploadtest", "catalog_v1.json");
const frontendOutputPath = process.env.CWORLD_FRONTEND_CATALOG_OUTPUT
  ? path.resolve(process.env.CWORLD_FRONTEND_CATALOG_OUTPUT)
  : path.join(frontendDir, "public", "catalog-v1.json");
const publicBaseUrl = String(
  process.env.CATALOG_PUBLIC_BASE_URL || "https://cearaworld.com",
).replace(/\/+$/, "");

// Single-title pilot. Remove this entry, or move it into a future media
// registry, once the HLS path has been validated and a broader rollout is
// intentionally approved.
const HLS_PILOT = {
  thedrama: {
    type: "hls",
    hlsPrefix: "thedrama/hls",
    master: "master.m3u8",
    ttlSeconds: 21600,
  },
};

const episodeTitles = JSON.parse(await readFile(titlesPath, "utf8"));
const episodeMetadata = JSON.parse(await readFile(metadataPath, "utf8"));
const playerSource = await readFile(playerSourcePath, "utf8");
const mobileById = new Map(SHOWS.map((item) => [item.id, item]));

const skipTimesStart = playerSource.indexOf("const skipTimes = ");
const skipTimesEnd = playerSource.search(/;\s*const getActiveSkipTime/, skipTimesStart);
if (skipTimesStart < 0 || skipTimesEnd < 0) {
  throw new Error("Could not locate skipTimes in Show.jsx.");
}
const skipTimesSource = playerSource
  .slice(skipTimesStart + "const skipTimes = ".length, skipTimesEnd)
  .trim();
const skipTimes = runInNewContext(`(${skipTimesSource})`);

const normalizePath = (value) => {
  const source = String(value || "");
  if (/^https?:\/\//i.test(source)) return source;
  return `${publicBaseUrl}/${source.replace(/^\/+/, "")}`;
};

const cleanAssetId = (value) => String(value || "").replace(/-/g, "");

const getRokuSubtitlePath = ({ showId, season = null, episode = null }) => {
  const source = getSubtitleTrackSrc({ showId, season, episode });
  if (!source) return null;
  return source
    .replace(/^\//, "/roku-captions/")
    .replace(/\.vtt$/i, ".srt");
};

const getSubtitleUrl = ({ showId, season = null, episode = null }) => {
  const source = getSubtitleTrackSrc({ showId, season, episode });
  return source ? normalizePath(source) : null;
};

const generateSeasonVideos = (titlesBySeason, rawId, type = "show") => {
  const mediaId = String(rawId || "");
  if (type === "movie") return [{ mediaId, season: null, episode: null }];

  return Object.entries(titlesBySeason || {}).flatMap(([season, titles]) => (
    (titles || []).map((_title, index) => ({
      mediaId,
      season: Number(season),
      episode: index + 1,
    }))
  ));
};

const videoDataByShow = Object.fromEntries(
  Object.entries(episodeTitles).map(([id, titlesBySeason]) => [
    id,
    generateSeasonVideos(titlesBySeason, id),
  ]),
);

const desktopShows = buildLibraryShows({ videoDataByShow, generateSeasonVideos });

const getEpisodeMetadata = (mediaId, season, index) => {
  const bySeason = episodeMetadata[mediaId] || {};
  return bySeason[String(season)]?.[index] || bySeason[season]?.[index] || {};
};

const getSkipMarkers = (mediaId, season, episode) => {
  const config = skipTimes[mediaId];
  const perEpisode = config?.seasons?.[season]?.[episode];
  const defaults = perEpisode || config?.default;
  if (!defaults) return { intro: null, outro: null };

  const rules = perEpisode ? [] : (config?.rules || []);
  const matched = rules.find((rule) => rule.condition?.(season, episode));
  const intro = matched?.intro ?? defaults.intro ?? null;
  const outro = matched?.outro ?? defaults.outro ?? null;

  return {
    intro: intro && intro.end > intro.start ? intro : null,
    outro: outro && outro.start > 0 ? outro : null,
  };
};

const toEpisode = (mediaId, season, fallbackTitle, index) => {
  const metadata = getEpisodeMetadata(mediaId, season, index);
  const skipMarkers = getSkipMarkers(mediaId, Number(season), index + 1);
  const title = typeof metadata === "string"
    ? metadata
    : metadata.title || String(fallbackTitle || "").replace(/_/g, " ");

  return {
    number: index + 1,
    title,
    description: typeof metadata === "string" ? "" : String(metadata.description || ""),
    airDate: typeof metadata === "string" ? "" : String(metadata.airDate || ""),
    duration: desktopShows[mediaId]?.duration || "22m",
    playbackRef: {
      mediaId,
      season: Number(season),
      episode: index + 1,
    },
    subtitles: [getSubtitleUrl({ showId: mediaId, season, episode: index + 1 })].filter(Boolean),
    rokuSubtitles: [getRokuSubtitlePath({ showId: mediaId, season, episode: index + 1 })]
      .filter(Boolean)
      .map(normalizePath),
    skipIntroEnd: skipMarkers.intro?.end ?? null,
    skipOutroStart: skipMarkers.outro?.start ?? null,
  };
};

const toMedia = ([id, desktop]) => {
  const mobile = mobileById.get(id) || {};
  const type = desktop.type === "movie" ? "movie" : "show";
  const titlesBySeason = episodeTitles[id] || {};
  const item = {
    id,
    assetId: cleanAssetId(id),
    type,
    title: String(desktop.title || mobile.title || id),
    dateAdded: String(mobile.dateadded || ""),
    description: String(desktop.description || ""),
    artwork: {
      card: normalizePath(mobile.card),
      poster: normalizePath(mobile.keyart),
      backdrop: normalizePath(mobile.background || desktop.background),
      mobileBackdrop: normalizePath(mobile.mobilebackground || mobile.background || desktop.background),
    },
    metadata: {
      creator: String(mobile.creator || ""),
      rating: String(mobile.ratings || ""),
      year: String(desktop.release_year || ""),
      genres: String(desktop.genre || "").split("/").map((genre) => genre.trim()).filter(Boolean),
      duration: String(desktop.duration || (type === "show" ? "22m" : "")),
      ageRating: String(desktop.agerating || ""),
    },
    subtitles: String(desktop.subtitles || mobile.subtitles || "").toLowerCase() === "yes",
    subtitleTracks: [],
    rokuSubtitleTracks: [],
  };

  if (HLS_PILOT[id]) item.playback = HLS_PILOT[id];

  if (type === "movie") {
    item.movieAsset = { mediaId: id, season: null, episode: null };
    item.subtitleTracks = [getSubtitleUrl({ showId: id })].filter(Boolean);
    item.rokuSubtitleTracks = [getRokuSubtitlePath({ showId: id })]
      .filter(Boolean)
      .map(normalizePath);
    return item;
  }

  item.seasons = Object.entries(titlesBySeason)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([season, titles]) => ({
      number: Number(season),
      episodes: titles.map((title, index) => toEpisode(id, season, title, index)),
    }));
  return item;
};

const generatedAt = new Date().toISOString();
const catalog = {
  schemaVersion: 1,
  catalogRevision: generatedAt,
  generatedAt,
  items: Object.entries(desktopShows).map(toMedia),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await mkdir(path.dirname(frontendOutputPath), { recursive: true });
const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
await writeFile(outputPath, serialized, "utf8");
if (path.resolve(frontendOutputPath) !== path.resolve(outputPath)) {
  await writeFile(frontendOutputPath, serialized, "utf8");
}
console.log(`Generated CWorld catalog v1 with ${catalog.items.length} item(s) at ${outputPath}`);
