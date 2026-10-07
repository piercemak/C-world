import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const registryPath = path.join(frontendRoot, "src/data/mediaRegistry.json");
const banner = "// Generated from src/data/mediaRegistry.json. Edit the registry, then run npm run media:generate.\n";
const json = value => JSON.stringify(value, null, 2);

export function validateRegistry(registry) {
  if (registry.version !== 1 || !registry.media || !Array.isArray(registry.newMedia)) throw Error("Invalid media registry schema.");
  const assets = new Set(), cards = new Set();
  for (const [id, item] of Object.entries(registry.media)) {
    if (!/^[a-z0-9-]+$/.test(id) || !/^[a-z0-9]+$/.test(item.assetId)) throw Error(`Invalid identity: ${id}`);
    if (assets.has(item.assetId)) throw Error(`Duplicate asset identity: ${item.assetId}`);
    assets.add(item.assetId);
    if (!["movie", "show"].includes(item.library?.type) || !item.library.title || !item.mobile) throw Error(`Missing presentation metadata: ${id}`);
    if (item.sidebar) {
      if (!/^card-\d+$/.test(item.sidebar.cardId) || cards.has(item.sidebar.cardId)) throw Error(`Invalid/duplicate card: ${id}`);
      cards.add(item.sidebar.cardId);
    }
    for (const [season, titles] of Object.entries(item.episodeTitles || {})) {
      if (!/^\d+$/.test(season) || Number(season) < 1 || !Array.isArray(titles)) throw Error(`Invalid episodes: ${id}/${season}`);
    }
    const checkMarker = marker => {
      if (!marker) return;
      if (marker.intro && (!Number.isFinite(marker.intro.start) || !Number.isFinite(marker.intro.end)
        || marker.intro.start < 0 || marker.intro.end < marker.intro.start)) throw Error(`Invalid intro timing: ${id}`);
      if (marker.outro && (!Number.isFinite(marker.outro.start) || marker.outro.start < 0)) throw Error(`Invalid outro timing: ${id}`);
    };
    checkMarker(item.skipTimes?.default);
    for (const rule of item.skipTimes?.rules || []) {
      if (!Number.isInteger(rule.fromSeason) || rule.fromSeason < 1 || !Number.isInteger(rule.fromEpisode) || rule.fromEpisode < 1) throw Error(`Invalid timing rule: ${id}`);
      checkMarker(rule);
    }
    for (const episodes of Object.values(item.skipTimes?.seasons || {})) for (const marker of Object.values(episodes)) checkMarker(marker);
  }
  for (const item of registry.newMedia) {
    if (!registry.media[item.showSlug]) throw Error(`Unknown New Media title: ${item.showSlug}`);
  }
}

export function renderRegistry(registry) {
  validateRegistry(registry);
  const entries = Object.entries(registry.media);
  const pick = field => Object.fromEntries(entries.filter(([,item]) => item[field] !== undefined).map(([id,item]) => [id,item[field]]));
  const ordered = field => entries.filter(([,item]) => item[field]).sort((a,b) => a[1][field].order-b[1][field].order);
  const library = Object.fromEntries(entries.map(([id,item]) => [id,item.library]));
  const mobile = [...entries].sort((a,b)=>a[1].mobileOrder-b[1].mobileOrder).map(([id,item])=>({id,title:item.library.title,...item.mobile}));
  const sidebar = ordered("sidebar").map(([,item])=>({title:item.sidebar.title ?? item.library.title,cardId:item.sidebar.cardId}));
  const cards = Object.fromEntries(ordered("sidebar").map(([id,item])=>[item.sidebar.cardId,id]));
  const covers = ordered("carousel").map(([id,item])=>({id,src:item.carousel.src ?? item.library.background,title:item.carousel.title ?? item.library.title}));
  const reviews = Object.fromEntries(entries.filter(([,item])=>item.review).map(([id,item])=>{
    const values = {...item.library,logo:item.mobile.card,...item.review};
    return [id,Object.fromEntries(item.reviewFields.map(key=>[key,values[key]]))];
  }));
  const newMedia = registry.newMedia.map(item=>({ ...item, showTitle:item.showTitle ?? registry.media[item.showSlug].library.title }));
  const movieCaptions = Object.fromEntries(entries.filter(([,item])=>item.captions.movie).map(([id,item])=>[id,item.captions.movie]));
  const seriesCaptions = Object.fromEntries(entries.filter(([,item])=>item.captions.series).map(([id,item])=>[id,item.captions.series]));
  const timings = Object.fromEntries(entries.filter(([,item])=>item.skipTimes).map(([,item])=>[item.assetId,item.skipTimes]));
  const lengths = Object.fromEntries(entries.filter(([,item])=>item.seasonLengths).map(([,item])=>[item.assetId,item.seasonLengths]));
  return new Map([
    ["src/data/libraryShowsData.js", banner + `const metadata = ${json(library)};\nexport const buildLibraryShows = ({ videoDataByShow, generateSeasonVideos }) => Object.fromEntries(\n  Object.entries(metadata).map(([id, item]) => [id, { ...item, videos: item.type === "movie" ? generateSeasonVideos({}, id, "movie") : videoDataByShow[id] }])\n);\n`],
    ["src/components/mobileshowsData.js", banner + `export const SHOWS = ${json(mobile)};\n`],
    ["src/data/videoPlayerCatalogData.js", banner + `export const VIDEO_PLAYER_SIDEBAR_ITEMS = ${json(sidebar)};\nexport const VIDEO_PLAYER_CARD_ID_TO_SLUG = ${json(cards)};\n`],
    ["src/data/carouselData.js", banner + `export const CAROUSEL_COVERS = ${json(covers)};\n`],
    ["src/data/reviewsShowsData.js", banner + `export const REVIEWS_SHOWS = ${json(reviews)};\n`],
    ["src/components/newMedia.js", banner + `export const newMedia = ${json(newMedia)};\n`],
    ["src/data/episodeTitles.json", json(pick("episodeTitles")) + "\n"],
    ["src/data/episodeMetadata.json", json(pick("episodeMetadata")) + "\n"],
    ["src/data/skipTimesData.js", banner + `export const mediaAssetIds = ${json(Object.fromEntries(entries.map(([id,item])=>[id,item.assetId])))};\nexport const skipTimes = ${json(timings)};\nexport const seasonLength = ${json(lengths)};\n`],
    ["src/data/subtitleTracks.js", banner + `const MOVIE_SUBTITLE_TRACKS = ${json(movieCaptions)};\nconst SERIES_SUBTITLE_PATTERNS = ${json(seriesCaptions)};\n
export const getSubtitleTrackSrc = ({ showId, season = null, episode = null }) => {
  if (!showId) return null;
  if (MOVIE_SUBTITLE_TRACKS[showId]) return MOVIE_SUBTITLE_TRACKS[showId];
  const pattern = SERIES_SUBTITLE_PATTERNS[showId];
  if (!pattern) return null;
  const seasonNum = Number(season), episodeNum = Number(episode);
  if (!Number.isFinite(seasonNum) || !Number.isFinite(episodeNum)) return null;
  return pattern.replaceAll("{season}", String(seasonNum))
    .replaceAll("{episode}", String(episodeNum))
    .replaceAll("{episode2}", String(episodeNum).padStart(2, "0"));
};\n`],
  ]);
}

export function generateRegistry({ root = frontendRoot, registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/mediaRegistry.json"), "utf8")), check = false } = {}) {
  const outputs = renderRegistry(registry);
  for (const [relative, content] of outputs) {
    const file = path.join(root, relative);
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (current === content) continue;
    if (check) throw Error(`Generated catalog data is stale: ${relative}. Run npm run media:generate.`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return outputs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  generateRegistry({ check });
  console.log(check ? "Registry and generated web data agree." : "Generated web data from the media registry.");
}
