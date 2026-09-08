import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLibraryShows } from "../src/data/libraryShowsData.js";
import { SHOWS } from "../src/components/mobileshowsData.js";
import { getSubtitleTrackSrc } from "../src/data/subtitleTracks.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const cworldDir = path.resolve(frontendDir, "..");
const titlesPath = path.join(frontendDir, "src", "data", "episodeTitles.json");
const metadataPath = path.join(frontendDir, "src", "data", "episodeMetadata.json");
const outputPath = process.env.CWORLD_CATALOG_OUTPUT
  ? path.resolve(process.env.CWORLD_CATALOG_OUTPUT)
  : path.join(cworldDir, "backend", "uploadtest", "catalog_v1.json");
const publicBaseUrl = String(
  process.env.CATALOG_PUBLIC_BASE_URL || "https://cearaworld.com",
).replace(/\/+$/, "");

const episodeTitles = JSON.parse(await readFile(titlesPath, "utf8"));
const episodeMetadata = JSON.parse(await readFile(metadataPath, "utf8"));
const mobileById = new Map(SHOWS.map((item) => [item.id, item]));

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
  const source = getRokuSubtitlePath({ showId, season, episode });
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

const toEpisode = (mediaId, season, fallbackTitle, index) => {
  const metadata = getEpisodeMetadata(mediaId, season, index);
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
    description: String(desktop.description || ""),
    artwork: {
      card: normalizePath(mobile.card),
      poster: normalizePath(mobile.keyart),
      backdrop: normalizePath(mobile.background || desktop.background),
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
  };

  if (type === "movie") {
    item.movieAsset = { mediaId: id, season: null, episode: null };
    item.subtitleTracks = [getSubtitleUrl({ showId: id })].filter(Boolean);
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
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated CWorld catalog v1 with ${catalog.items.length} item(s) at ${outputPath}`);
