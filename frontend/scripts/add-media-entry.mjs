#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PUBLIC = path.join(ROOT, "public");

const FILES = {
  library: path.join(SRC, "data/libraryShowsData.js"),
  subtitles: path.join(SRC, "data/subtitleTracks.js"),
  catalog: path.join(SRC, "data/videoPlayerCatalogData.js"),
  mobile: path.join(SRC, "components/mobileshowsData.js"),
  carousel: path.join(SRC, "components/RandomCoverCarousel.jsx"),
  styles: path.join(SRC, "components/modules/videoLibrary.module.scss"),
  newMedia: path.join(SRC, "components/newMedia.js"),
  episodeTitles: path.join(SRC, "data/episodeTitles.json"),
  episodeMetadata: path.join(SRC, "data/episodeMetadata.json"),
  showPlayer: path.join(SRC, "components/Show.jsx"),
  packageJson: path.join(ROOT, "package.json"),
};

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(`\nCould not add media entry: ${error.message}`);
  process.exit(1);
});

async function main() {
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const id = normalizeId(requiredArg("id"));
  const title = requiredArg("title");
  const mediaType = normalizeMediaType(args.type || "movie");
  const assetId = normalizeAssetId(args["asset-id"] || id);
  const currentDate = new Date();
  const metadata = await resolveMetadata({ title, mediaType, year: args.year });
  const episodeCatalog = mediaType === "show"
    ? await fetchTmdbEpisodeCatalog({
        title,
        year: args.year || metadata.releaseYear,
        tmdbId: args["tmdb-id"],
        requestedSeasons: args.seasons,
      })
    : null;
  if (episodeCatalog) {
    metadata.seasons = episodeCatalog.seasonCount;
  }
  const entry = buildEntry({ id, title, mediaType, assetId, metadata });
  entry.episodeCatalog = episodeCatalog;
  const edits = [];
  const copies = [];
  const subtitleCopies = [];
  const directories = [
    path.join(PUBLIC, "images", assetId),
    path.join(PUBLIC, "images", assetId, "covers"),
    path.join(PUBLIC, "images", assetId, "placeholders"),
  ];
  if (episodeCatalog && entry.subtitles === "yes") {
    for (const season of Object.keys(episodeCatalog.titlesBySeason)) {
      directories.push(path.join(PUBLIC, "subtitles", assetId, `season${season}`));
    }
  }

  const paths = resolveAssetPaths({ id, title, assetId, entry });
  Object.assign(entry, paths);

  const files = readFiles(FILES);
  assertCanInsert(files, entry);

  queueAssetCopy(copies, args.cover, path.join(PUBLIC, trimPublicPath(entry.cover)));
  queueAssetCopy(copies, args.backdrop, path.join(PUBLIC, trimPublicPath(entry.backdrop)));
  queueAssetCopy(copies, args.keyart, path.join(PUBLIC, trimPublicPath(entry.keyart)));
  queueAssetCopy(copies, args.placeholder, path.join(PUBLIC, trimPublicPath(entry.placeholder)));
  queueAssetCopy(copies, args.card, path.join(PUBLIC, trimPublicPath(entry.card)));
  queueSubtitleCopies(subtitleCopies, directories, entry);

  edits.push(updateLibraryShows(files.library, entry));
  edits.push(updateVideoPlayerCatalog(files.catalog, entry));
  edits.push(updateMobileShows(files.mobile, entry, currentDate));
  edits.push(updateRandomCoverCarousel(files.carousel, entry));
  edits.push(updateVideoLibraryStyles(files.styles, entry));
  if (episodeCatalog) {
    edits.push(updateEpisodeTitles(files.episodeTitles, entry));
    edits.push(updateEpisodeMetadata(files.episodeMetadata, entry));
    edits.push(updateShowPlayer(files.showPlayer, entry));
  }

  if (entry.subtitles === "yes") {
    edits.push(updateSubtitleTracks(files.subtitles, entry));
  }

  if (args["new-media"]) {
    edits.push(updateNewMedia(files.newMedia, entry));
  }

  if (args["add-script"] !== false) {
    edits.push(updatePackageJson(files.packageJson));
  }

  const plan = [
    `Add ${entry.title} (${entry.id}) as ${entry.mediaType}`,
    `Use card ${entry.cardId}`,
    `Create ${directories.length} asset folder(s)`,
    `${copies.length} asset file(s) to copy`,
    `${subtitleCopies.length} subtitle file(s) to copy`,
    `${edits.length} source file(s) to update`,
  ];
  if (episodeCatalog) {
    plan.push(
      `TMDB series ${episodeCatalog.tmdbId}: ${episodeCatalog.episodeCount} episode(s) across ${episodeCatalog.seasonCount} season(s)`,
    );
  }

  if (args["dry-run"]) {
    console.log(plan.join("\n"));
    console.log("\nGenerated library entry:\n");
    console.log(formatLibraryEntry(entry));
    if (episodeCatalog) {
      console.log("\nGenerated episode catalog:\n");
      console.log(JSON.stringify({ [entry.id]: episodeCatalog.titlesBySeason }, null, 2));
      console.log("\nGenerated episode metadata:\n");
      console.log(JSON.stringify({ [entry.id]: episodeCatalog.metadataBySeason }, null, 2));
    }
    if (args["new-media"]) {
      console.log("\nGenerated newMedia entry:\n");
      console.log(formatNewMediaEntry(entry));
    }
    return;
  }

  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true });
  }

  for (const copy of copies) {
    fs.mkdirSync(path.dirname(copy.to), { recursive: true });
    fs.copyFileSync(copy.from, copy.to);
  }

  for (const copy of subtitleCopies) {
    fs.mkdirSync(path.dirname(copy.to), { recursive: true });
    fs.copyFileSync(copy.from, copy.to);
  }

  for (const edit of edits) {
    fs.writeFileSync(edit.file, edit.content, "utf8");
  }

  console.log(plan.join("\n"));
  console.log("\nDone. Review the generated entries and add any missing artwork when you are ready.");
}

function parseArgs(argv) {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=");
    const key = rawKey.trim();
    const next = argv[i + 1];

    if (inlineValue !== undefined) {
      parsed[key] = coerceValue(inlineValue);
    } else if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = coerceValue(next);
      i += 1;
    }
  }

  return parsed;
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function requiredArg(name) {
  if (!args[name]) {
    throw new Error(`Missing --${name}. Run with --help for examples.`);
  }
  return String(args[name]).trim();
}

function normalizeId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAssetId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeMediaType(value) {
  const normalized = String(value).toLowerCase();
  if (["movie", "show"].includes(normalized)) return normalized;
  throw new Error("--type must be movie or show.");
}

async function resolveMetadata({ title, mediaType, year }) {
  const omdb = args.fetch === "omdb" || args.omdb;
  const fetched = omdb ? await fetchOmdbMetadata({ title, mediaType, year }) : {};
  const tmdbAgeRating = args["age-rating"]
    ? ""
    : await fetchTmdbAgeRating({
        title,
        mediaType,
        year: args.year || fetched.releaseYear,
        tmdbId: args["tmdb-id"],
      });
  return {
    releaseYear: args.year || fetched.releaseYear || "",
    genre: args.genre || fetched.genre || "",
    duration: args.duration || fetched.duration || "",
    description: args.description || fetched.description || "",
    creator: args.creator || fetched.creator || "",
    rating: args.rating || fetched.rating || "",
    ageRating: normalizeAgeRating(args["age-rating"] || tmdbAgeRating || fetched.ageRating),
    seasons: Number(args.seasons || fetched.seasons || 1),
  };
}

async function fetchOmdbMetadata({ title, mediaType, year }) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    throw new Error("OMDB_API_KEY is required when using --fetch omdb.");
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    t: title,
    type: mediaType === "show" ? "series" : "movie",
  });
  if (year) params.set("y", year);

  const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
  const data = await response.json();
  if (data.Response === "False") {
    throw new Error(data.Error || "OMDb did not return metadata.");
  }

  return {
    releaseYear: parseReleaseYear(data.Year),
    genre: firstGenre(data.Genre),
    duration: formatRuntime(data.Runtime),
    description: data.Plot && data.Plot !== "N/A" ? data.Plot : "",
    creator: firstName(data.Director !== "N/A" ? data.Director : data.Writer),
    rating: data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : "",
    ageRating: data.Rated && data.Rated !== "N/A" ? data.Rated : "",
    seasons: Number(data.totalSeasons || 1),
  };
}

async function fetchTmdbAgeRating({ title, mediaType, year, tmdbId }) {
  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!apiKey && !accessToken) return "";

  try {
    const request = async (pathname, params = {}) => {
      const search = new URLSearchParams(params);
      if (apiKey) search.set("api_key", apiKey);
      const suffix = search.size ? `?${search.toString()}` : "";
      const response = await fetch(`https://api.themoviedb.org/3${pathname}${suffix}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) return null;
      return response.json();
    };

    let mediaId = clampPositiveInt(tmdbId, 0);
    if (!mediaId) {
      const searchPath = mediaType === "show" ? "/search/tv" : "/search/movie";
      const yearKey = mediaType === "show" ? "first_air_date_year" : "primary_release_year";
      const searchData = await request(searchPath, {
        query: title,
        ...(parseReleaseYear(year) ? { [yearKey]: parseReleaseYear(year) } : {}),
      });
      mediaId = selectTmdbMediaId(searchData?.results || [], { title, year, mediaType });
    }
    if (!mediaId) return "";

    if (mediaType === "show") {
      const data = await request(`/tv/${mediaId}/content_ratings`);
      return data?.results?.find((item) => item.iso_3166_1 === "US")?.rating || "";
    }

    const data = await request(`/movie/${mediaId}/release_dates`);
    const usDates = data?.results?.find((item) => item.iso_3166_1 === "US")?.release_dates || [];
    const releaseTypePriority = new Map([3, 4, 5, 6, 2, 1].map((type, index) => [type, index]));
    return usDates
      .filter((item) => String(item.certification || "").trim())
      .sort((a, b) => {
        return (releaseTypePriority.get(a.type) ?? 99) - (releaseTypePriority.get(b.type) ?? 99);
      })[0]?.certification || "";
  } catch {
    return "";
  }
}

async function fetchTmdbEpisodeCatalog({ title, year, tmdbId, requestedSeasons }) {
  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new Error("TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN is required when adding a show.");
  }

  const request = async (pathname, params = {}) => {
    const search = new URLSearchParams({ language: "en-US", ...params });
    if (apiKey) search.set("api_key", apiKey);
    const response = await fetch(`https://api.themoviedb.org/3${pathname}?${search.toString()}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.status_message || `TMDB request failed with ${response.status}.`);
    }
    return data;
  };

  let mediaId = clampPositiveInt(tmdbId, 0);
  if (!mediaId) {
    const searchData = await request("/search/tv", {
      query: title,
      ...(parseReleaseYear(year) ? { first_air_date_year: parseReleaseYear(year) } : {}),
    });
    mediaId = selectTmdbMediaId(searchData.results || [], {
      title,
      year,
      mediaType: "show",
    });
  }
  if (!mediaId) {
    throw new Error(`TMDB could not identify the show "${title}". Select it in MediaScraper or enter its TMDB ID.`);
  }

  const series = await request(`/tv/${mediaId}`);
  const seasonLimit = clampPositiveInt(requestedSeasons, 0);
  const seasons = (series.seasons || [])
    .filter((season) => Number(season.season_number) > 0 && Number(season.episode_count) > 0)
    .filter((season) => !seasonLimit || Number(season.season_number) <= seasonLimit)
    .sort((a, b) => Number(a.season_number) - Number(b.season_number));

  const titlesBySeason = {};
  const displayTitlesBySeason = {};
  const metadataBySeason = {};
  let episodeCount = 0;

  for (const season of seasons) {
    const seasonNumber = Number(season.season_number);
    const seasonData = await request(`/tv/${mediaId}/season/${seasonNumber}`);
    const episodes = (seasonData.episodes || [])
      .filter((episode) => Number(episode.episode_number) > 0)
      .sort((a, b) => Number(a.episode_number) - Number(b.episode_number));
    if (!episodes.length) continue;

    const highestEpisode = Math.max(...episodes.map((episode) => Number(episode.episode_number)));
    const titles = Array.from({ length: highestEpisode }, (_, index) => `Episode_${index + 1}`);
    const displayTitles = Array.from({ length: highestEpisode }, (_, index) => `Episode ${index + 1}`);
    const metadata = Array.from({ length: highestEpisode }, (_, index) => ({
      title: `Episode ${index + 1}`,
      description: "",
      airDate: "",
      tmdbId: null,
    }));
    for (const episode of episodes) {
      const episodeNumber = Number(episode.episode_number);
      titles[episodeNumber - 1] = formatEpisodeTitleToken(
        episode.name || `Episode ${episodeNumber}`,
        episodeNumber,
      );
      displayTitles[episodeNumber - 1] = formatEpisodeDisplayTitle(
        episode.name || `Episode ${episodeNumber}`,
        episodeNumber,
      );
      metadata[episodeNumber - 1] = {
        title: formatEpisodeDisplayTitle(
          episode.name || `Episode ${episodeNumber}`,
          episodeNumber,
        ),
        description: String(episode.overview || "").trim(),
        airDate: episode.air_date || "",
        tmdbId: clampPositiveInt(episode.id, 0) || null,
      };
    }
    titlesBySeason[String(seasonNumber)] = titles;
    displayTitlesBySeason[String(seasonNumber)] = displayTitles;
    metadataBySeason[String(seasonNumber)] = metadata;
    episodeCount += titles.length;
  }

  const seasonNumbers = Object.keys(titlesBySeason).map(Number);
  if (!seasonNumbers.length || !episodeCount) {
    throw new Error(`TMDB did not return regular episodes for "${title}".`);
  }

  return {
    tmdbId: mediaId,
    seasonCount: Math.max(...seasonNumbers),
    episodeCount,
    titlesBySeason,
    displayTitlesBySeason,
    metadataBySeason,
  };
}

function formatEpisodeTitleToken(value, episodeNumber) {
  const token = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  return token || `Episode_${episodeNumber}`;
}

function formatEpisodeDisplayTitle(value, episodeNumber) {
  const title = String(value || "").trim().replace(/\s+/g, " ");
  return title || `Episode ${episodeNumber}`;
}

function selectTmdbMediaId(results, { title, year, mediaType }) {
  const expectedTitle = normalizeMatchText(title);
  const expectedYear = parseReleaseYear(year);
  const titleField = mediaType === "show" ? "name" : "title";
  const originalTitleField = mediaType === "show" ? "original_name" : "original_title";
  const dateField = mediaType === "show" ? "first_air_date" : "release_date";
  const exactTitles = results.filter((item) => {
    return [item[titleField], item[originalTitleField]]
      .filter(Boolean)
      .some((value) => normalizeMatchText(value) === expectedTitle);
  });
  const exactYear = expectedYear
    ? exactTitles.filter((item) => parseReleaseYear(item[dateField]) === expectedYear)
    : exactTitles;
  const match = exactYear[0] || exactTitles[0];
  return clampPositiveInt(match?.id, 0);
}

function normalizeMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeAgeRating(value) {
  const rating = String(value || "").trim();
  const normalized = rating.toUpperCase().replace(/\s+/g, "");

  if (/^\d+\+$/.test(normalized)) return normalized;
  if (/^\d+$/.test(normalized)) return `${normalized}+`;
  if (["G", "TV-Y", "TV-G"].includes(normalized)) return "0+";
  if (["PG", "TV-Y7", "TV-Y7-FV", "TV-PG"].includes(normalized)) return "7+";
  if (["PG-13", "TV-14"].includes(normalized)) return "13+";
  if (["R", "NC-17", "TV-MA"].includes(normalized)) return "18+";
  return "13+";
}

function buildEntry({ id, title, mediaType, assetId, metadata }) {
  const nextCard = getNextCardNumber(readFile(FILES.catalog));
  const subtitles = normalizeYesNo(args.subtitles || "no");

  return {
    id,
    title,
    mediaType,
    assetId,
    cardId: args["card-id"] || `card-${nextCard}`,
    cardNumber: Number(String(args["card-id"] || `card-${nextCard}`).replace("card-", "")),
    releaseYear: metadata.releaseYear || "TBD",
    genre: metadata.genre || "TBD",
    duration: mediaType === "movie" ? metadata.duration || "TBD" : "",
    description: metadata.description || "Description TBD.",
    creator: metadata.creator || "TBD",
    rating: metadata.rating || "TBD",
    ageRating: metadata.ageRating || "13+",
    seasonCount: Math.max(1, Number(metadata.seasons || 1)),
    subtitles,
  };
}

function resolveAssetPaths({ assetId, entry }) {
  const cover = args["cover-path"] || assetPublicPath(args.cover, `/images/${assetId}/covers/${assetId}Cover`);
  const backdrop = args["backdrop-path"] || assetPublicPath(args.backdrop, `/images/${assetId}/covers/${assetId}_backdrop`);
  const keyart = args["keyart-path"] || assetPublicPath(args.keyart, `/images/${assetId}/covers/${assetId}_mobileLogo`);
  const placeholder = args["placeholder-path"] || assetPublicPath(args.placeholder, `/images/${assetId}/placeholders/${assetId}_placeholder`);
  const card = args["card-path"] || assetPublicPath(args.card, `/images/cardimages/${assetId}Logo`);
  const movieSubtitlePath = args["subtitle-path"] || assetPublicPath(args["movie-subtitle"], `/videos/${assetId}/${assetId}_subtitles`);

  return {
    cover: cover || "/images/misc/TBD.jpg",
    backdrop: backdrop || "/images/misc/TBD.jpg",
    keyart: keyart || "/images/misc/TBD.jpg",
    placeholder: placeholder || "/images/misc/TBD.jpg",
    card: card || "/images/misc/TBD.jpg",
    subtitlePath: movieSubtitlePath || `/videos/${entry.assetId}/${entry.assetId}_subtitles.vtt`,
  };
}

function assetPublicPath(source, basePath) {
  if (!source) return "";
  return `${basePath}${path.extname(String(source)) || ".jpg"}`;
}

function queueAssetCopy(copies, from, to) {
  if (!from) return;
  const source = path.resolve(String(from).replace(/^~(?=\/)/, process.env.HOME || ""));
  if (!fs.existsSync(source)) {
    throw new Error(`Asset does not exist: ${source}`);
  }
  copies.push({ from: source, to });
}

function queueSubtitleCopies(copies, directories, entry) {
  if (entry.subtitles !== "yes") return;

  if (entry.mediaType === "movie" && args["movie-subtitle"]) {
    const source = resolveExistingPath(args["movie-subtitle"], "Movie subtitle file");
    if (path.extname(source).toLowerCase() !== ".vtt") {
      throw new Error("Movie subtitle import expects a .vtt file.");
    }
    const target = path.join(PUBLIC, trimPublicPath(entry.subtitlePath));
    directories.push(path.dirname(target));
    copies.push({ from: source, to: target });
    return;
  }

  if (entry.mediaType === "show" && args["series-subtitles-folder"]) {
    const sourceFolder = resolveExistingPath(args["series-subtitles-folder"], "Series subtitles folder");
    const stat = fs.statSync(sourceFolder);
    if (!stat.isDirectory()) {
      throw new Error("Series subtitles path must point to a folder.");
    }

    const season = clampPositiveInt(args["subtitle-season"], 1);
    const startEpisode = clampPositiveInt(args["subtitle-start-episode"], 1);
    const outputFolder = path.join(PUBLIC, "subtitles", entry.assetId, `season${season}`);
    directories.push(outputFolder);

    const files = fs.readdirSync(sourceFolder, { withFileTypes: true })
      .filter((item) => item.isFile() && path.extname(item.name).toLowerCase() === ".vtt")
      .map((item) => path.join(sourceFolder, item.name))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: "base" }));

    files.forEach((file, index) => {
      const episode = startEpisode + index;
      const outputName = `S${season}E${String(episode).padStart(2, "0")}_subtitles.vtt`;
      copies.push({ from: file, to: path.join(outputFolder, outputName) });
    });
  }
}

function resolveExistingPath(value, label) {
  const source = path.resolve(String(value).replace(/^~(?=\/)/, process.env.HOME || ""));
  if (!fs.existsSync(source)) {
    throw new Error(`${label} does not exist: ${source}`);
  }
  return source;
}

function trimPublicPath(publicPath) {
  return String(publicPath).replace(/^\//, "");
}

function readFiles(fileMap) {
  return Object.fromEntries(
    Object.entries(fileMap).map(([key, file]) => [key, readFile(file)]),
  );
}

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function assertCanInsert(files, entry) {
  if (files.library.includes(`"${entry.id}":`)) throw new Error(`libraryShowsData already has ${entry.id}.`);
  if (files.catalog.includes(`"${entry.cardId}"`)) throw new Error(`Catalog already has ${entry.cardId}.`);
  if (files.catalog.includes(`"${entry.id}"`)) throw new Error(`Catalog already maps ${entry.id}.`);
  if (files.mobile.includes(`id: "${entry.id}"`)) throw new Error(`mobileshowsData already has ${entry.id}.`);
  if (files.carousel.includes(`id: "${entry.id}"`)) throw new Error(`RandomCoverCarousel already has ${entry.id}.`);
  if (files.styles.includes(`&.${entry.cardId}`)) throw new Error(`videoLibrary.module.scss already has ${entry.cardId}.`);
  if (entry.mediaType === "show") {
    const episodeTitles = JSON.parse(files.episodeTitles);
    if (Object.hasOwn(episodeTitles, entry.id)) {
      throw new Error(`episodeTitles.json already has ${entry.id}.`);
    }
    const episodeMetadata = JSON.parse(files.episodeMetadata);
    if (Object.hasOwn(episodeMetadata, entry.id)) {
      throw new Error(`episodeMetadata.json already has ${entry.id}.`);
    }
  }
}

function updateLibraryShows(content, entry) {
  return replaceInFile(FILES.library, content, /(\n\s*};\n\n\s*return shows;)/, `\n${formatLibraryEntry(entry)}$1`);
}

function updateVideoPlayerCatalog(content, entry) {
  let next = content.replace(/\n\n];/, `  { title: ${quote(entry.title)}, cardId: ${quote(entry.cardId)} },\n\n];`);
  next = next.replace(/\n};\s*$/, `,\n  ${quote(entry.cardId)}: ${quote(entry.id)}\n};\n`);
  return { file: FILES.catalog, content: next };
}

function updateMobileShows(content, entry, date) {
  const dateAdded = args.dateadded || `${date.getMonth() + 1}-${date.getDate()}-${String(date.getFullYear()).slice(-2)}`;
  const block = [
    "    {",
    `        id: ${quote(entry.id)},`,
    `        title: ${quote(entry.title)},`,
    `        creator: ${quote(entry.creator)}, `,
    `        background: ${quote(entry.backdrop)},`,
    `        ratings: ${quote(entry.rating)},`,
    `        type: ${quote(entry.mediaType === "show" ? "TV" : "Movies")},`,
    `        keyart: ${quote(entry.keyart)}, `,
    `        card: ${quote(entry.card)}, `,
    `        dateadded: ${quote(dateAdded)},`,
    "    }, ",
  ].join("\n");

  return replaceInFile(FILES.mobile, content, /\n];\s*$/, `\n${block}\n];`);
}

function updateRandomCoverCarousel(content, entry) {
  const line = `    { id: ${quote(entry.id)}, src: ${quote(entry.cover)}, title: ${quote(entry.title)} },`;
  return replaceInFile(FILES.carousel, content, /(\n\s*];\n\n\s*const showsById)/, `\n${line}$1`);
}

function updateVideoLibraryStyles(content, entry) {
  const block = [
    `    &.${entry.cardId} {`,
    "        background-color: #f8d7cd;",
    `        view-transition-name: c${entry.cardNumber};`,
    `        background-image: url(${quote(entry.card)});`,
    "       } ",
  ].join("\n");

  return replaceInFile(FILES.styles, content, /(\n\n\s*}\n\n\n\n\s*@media \(max-width: 1280px\) \{)/, `\n${block}$1`);
}

function updateEpisodeTitles(content, entry) {
  const catalog = JSON.parse(content);
  catalog[entry.id] = entry.episodeCatalog.titlesBySeason;
  return {
    file: FILES.episodeTitles,
    content: `${JSON.stringify(catalog, null, 2)}\n`,
  };
}

function updateEpisodeMetadata(content, entry) {
  const catalog = JSON.parse(content);
  catalog[entry.id] = entry.episodeCatalog.metadataBySeason;
  return {
    file: FILES.episodeMetadata,
    content: `${JSON.stringify(catalog, null, 2)}\n`,
  };
}

function updateShowPlayer(content, entry) {
  const seasonLengthBlock = [
    `    ${quote(entry.assetId)}: {`,
    ...Object.entries(entry.episodeCatalog.titlesBySeason).map(
      ([season, titles]) => `      ${season}: ${titles.length},`,
    ),
    "    },",
  ].join("\n");

  const skipLines = [
    `    ${quote(entry.assetId)}: {`,
    "      seasons: {",
  ];
  for (const [season, titles] of Object.entries(entry.episodeCatalog.titlesBySeason)) {
    skipLines.push(`        ${season}: {`);
    titles.forEach((_, index) => {
      skipLines.push(
        `          ${index + 1}: { intro: { start: 0.0, end: 0.0 }, outro: { start: 0.0, skipTo: "next" } },`,
      );
    });
    skipLines.push("        },");
  }
  skipLines.push("      },", "    },");

  let next = insertIntoDeclaredObject(content, "const seasonLength = {", seasonLengthBlock);
  next = insertIntoDeclaredObject(next, "const skipTimes = {", skipLines.join("\n"));
  return { file: FILES.showPlayer, content: next };
}

function insertIntoDeclaredObject(content, declaration, block) {
  const start = content.indexOf(declaration);
  if (start < 0) {
    throw new Error(`Could not find ${declaration} in Show.jsx.`);
  }
  const end = content.indexOf("\n  };", start);
  if (end < 0) {
    throw new Error(`Could not find the end of ${declaration} in Show.jsx.`);
  }
  const before = content.slice(0, end);
  const trailingWhitespace = before.match(/\s*$/)?.[0] || "";
  const body = before.slice(0, before.length - trailingWhitespace.length);
  const normalizedBody = body.endsWith(",") ? body : `${body},`;
  return `${normalizedBody}${trailingWhitespace}\n${block}${content.slice(end)}`;
}

function updateSubtitleTracks(content, entry) {
  if (entry.mediaType === "movie") {
    const line = `  ${quote(entry.id)}: ${quote(entry.subtitlePath)},`;
    return replaceInFile(FILES.subtitles, content, /(\n};\n\nconst SERIES_SUBTITLE_PATTERNS)/, `\n${line}$1`);
  }

  const pattern = `/subtitles/${entry.assetId}/season{season}/S{season}E{episode2}_subtitles.vtt`;
  const line = `  ${quote(entry.id)}: ${quote(pattern)},`;
  return replaceInFile(FILES.subtitles, content, /(\n};\n\nconst fillPattern)/, `\n${line}$1`);
}

function updateNewMedia(content, entry) {
  const block = formatNewMediaEntry(entry);

  return replaceInFile(FILES.newMedia, content, /(export const newMedia = \[\n)/, `$1${block}\n`);
}

function formatNewMediaEntry(entry) {
  if (entry.mediaType === "show") {
    return formatNewEpisodeMediaBlock(entry);
  }

  return [
    "      {",
    `        kind: ${quote(entry.mediaType)},`,
    `        showSlug: ${quote(entry.id)},`,
    `        showTitle: ${quote(entry.title)},`,
    `        placeholder: ${quote(entry.placeholder)},`,
    `        to: \`/video-library/${entry.id}${entry.mediaType === "movie" ? "?movie=1" : ""}\`,`,
    "      }, ",
  ].join("\n");
}

function formatNewEpisodeMediaBlock(entry) {
  const episodeTitle = entry.episodeCatalog?.displayTitlesBySeason?.["1"]?.[0]
    || displayEpisodeTitleToken(entry.episodeCatalog?.titlesBySeason?.["1"]?.[0])
    || "Episode 1";

  return [
    "      {",
    `        kind: "episode",`,
    `        showSlug: ${quote(entry.id)},`,
    `        showTitle: ${quote(entry.title)},`,
    "        season: 1,",
    "        episode: 1,",
    `        episodeTitle: ${quote(episodeTitle)},`,
    `        placeholder: \`\${cloudFrontDomain}/\${clean(${quote(entry.id)})}/placeholders/season1/S1E1_\${clean(${quote(entry.id)})}_placeholder.png\`,`,
    `        to: \`/video-library/${entry.id}?season=1&episode=1\`,`,
    "      }, ",
  ].join("\n");
}

function displayEpisodeTitleToken(value) {
  const text = String(value || "").replace(/_/g, " ").trim();
  return text ? text.replace(/\b\w/g, (character) => character.toUpperCase()) : "";
}

function updatePackageJson(content) {
  const packageJson = JSON.parse(content);
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts["media:add"] = packageJson.scripts["media:add"] || "node scripts/add-media-entry.mjs";
  return { file: FILES.packageJson, content: `${JSON.stringify(packageJson, null, 2)}\n` };
}

function replaceInFile(file, content, pattern, replacement) {
  if (!pattern.test(content)) {
    throw new Error(`Could not find insertion point in ${path.basename(file)}.`);
  }
  return { file, content: content.replace(pattern, replacement) };
}

function formatLibraryEntry(entry) {
  const lines = [
    `        ${quote(entry.id)}: {`,
    `          type: ${quote(entry.mediaType)},  `,
    `          title: ${quote(entry.title)},`,
    `          agerating: ${quote(entry.ageRating)},`,
    `          release_year: ${quote(entry.releaseYear)},`,
    `          genre: ${quote(entry.genre)},`,
  ];

  if (entry.mediaType === "movie") {
    lines.push(`          duration: ${quote(entry.duration)},          `);
  } else {
    const seasonLabel = `${entry.seasonCount} season${entry.seasonCount === 1 ? "" : "s"}`;
    lines.push(`          season_total_number: ${quote(seasonLabel)},`);
    lines.push(`          season_digit: ${entry.seasonCount},`);
  }

  lines.push(`          description: ${quote(entry.description)},`);
  lines.push(`          background: ${quote(entry.cover)},`);
  lines.push(`          subtitles: ${quote(entry.subtitles)},`);
  lines.push(entry.mediaType === "movie"
    ? `          videos: generateSeasonVideos({}, ${quote(entry.id)}, "movie"),`
    : `          videos: videoDataByShow[${quote(entry.id)}],`);
  lines.push("        }, ");
  return lines.join("\n");
}

function getNextCardNumber(content) {
  const matches = [...content.matchAll(/card-(\d+)/g)].map((match) => Number(match[1]));
  return Math.max(0, ...matches) + 1;
}

function normalizeYesNo(value) {
  const normalized = String(value).toLowerCase();
  return ["yes", "true", "1"].includes(normalized) ? "yes" : "no";
}

function clampPositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function parseReleaseYear(value) {
  const match = String(value || "").match(/\d{4}/);
  return match ? match[0] : "";
}

function firstGenre(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0] || "";
}

function firstName(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)[0] || "";
}

function formatRuntime(value) {
  const minutes = Number.parseInt(String(value || "").replace(/\D+/g, ""), 10);
  if (!Number.isFinite(minutes)) return "";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function quote(value) {
  return JSON.stringify(String(value));
}

function printHelp() {
  console.log(`
Add a CWorld movie/show entry everywhere the app currently needs it.

Required:
  --id projecthailmary --title "Project Hail Mary"

Useful:
  --type movie|show
  --fetch omdb                 Fetch metadata using OMDB_API_KEY
  --year 2026 --genre Adventure --duration "2h 36m"
  --description "..." --creator "Phil Lord" --rating 8.2
  --age-rating PG-13          Override fetched US certification
  --tmdb-id 687163            Optional exact TMDB movie/show ID
  --seasons 3                 Optional show season limit; blank imports all regular seasons
  --subtitles yes|no
  --new-media                 Add to newMedia.js
  --cover /path/file.jpg      Copy to public/images/<asset>/covers
  --backdrop /path/file.svg
  --keyart /path/file.jpg
  --placeholder /path/file.png
  --card /path/logo.svg       Copy to public/images/cardimages
  --movie-subtitle /path/file.vtt
                              Movie subtitles copy to public/videos/<asset>
  --series-subtitles-folder /path/folder
                              Sorted .vtt files copy to public/subtitles/<asset>/seasonN
  --subtitle-season 1 --subtitle-start-episode 1
                              Show additions also create every season subtitle folder,
                              update episodeTitles.json, and add Show.jsx navigation/skip scaffolding
  --dry-run                   Print the plan without changing files

Example:
  OMDB_API_KEY=... npm run media:add -- --id projecthailmary --title "Project Hail Mary" --type movie --fetch omdb --subtitles yes --new-media
`);
}
