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
  const entry = buildEntry({ id, title, mediaType, assetId, metadata });
  const edits = [];
  const copies = [];
  const subtitleCopies = [];
  const directories = [
    path.join(PUBLIC, "images", assetId),
    path.join(PUBLIC, "images", assetId, "covers"),
    path.join(PUBLIC, "images", assetId, "placeholders"),
  ];

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

  if (args["dry-run"]) {
    console.log(plan.join("\n"));
    console.log("\nGenerated library entry:\n");
    console.log(formatLibraryEntry(entry));
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
  return {
    releaseYear: args.year || fetched.releaseYear || "",
    genre: args.genre || fetched.genre || "",
    duration: args.duration || fetched.duration || "",
    description: args.description || fetched.description || "",
    creator: args.creator || fetched.creator || "",
    rating: args.rating || fetched.rating || "",
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
    seasons: Number(data.totalSeasons || 1),
  };
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
  const block = [
    "      {",
    `        kind: ${quote(entry.mediaType)},`,
    `        showSlug: ${quote(entry.id)},`,
    `        showTitle: ${quote(entry.title)},`,
    `        placeholder: ${quote(entry.placeholder)},`,
    `        to: \`/video-library/${entry.id}${entry.mediaType === "movie" ? "?movie=1" : ""}\`,`,
    "      }, ",
  ].join("\n");

  return replaceInFile(FILES.newMedia, content, /(export const newMedia = \[\n)/, `$1${block}\n`);
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
  --seasons 3                 Show-only season count
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
  --dry-run                   Print the plan without changing files

Example:
  OMDB_API_KEY=... npm run media:add -- --id projecthailmary --title "Project Hail Mary" --type movie --fetch omdb --subtitles yes --new-media
`);
}
