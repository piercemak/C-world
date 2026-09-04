#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildLibraryShows } from "../src/data/libraryShowsData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const episodeTitlesPath = path.join(ROOT, "src/data/episodeTitles.json");
const episodeMetadataPath = path.join(ROOT, "src/data/episodeMetadata.json");

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env.production"));
loadEnvFile(path.resolve(ROOT, "../backend/.env"));
if (process.env.HOME) {
  loadEnvFile(path.join(process.env.HOME, "MediaScraper/backend/.env"));
}

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(`Could not backfill episode metadata: ${error.message}`);
  process.exit(1);
});

async function main() {
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new Error("TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN is required.");
  }

  const requestedId = args.id ? normalizeId(args.id) : "";
  const dryRun = Boolean(args["dry-run"]);
  const replace = Boolean(args.replace);
  const limit = clampPositiveInt(args.limit, 0);

  const episodeTitles = JSON.parse(fs.readFileSync(episodeTitlesPath, "utf8"));
  const existingMetadata = fs.existsSync(episodeMetadataPath)
    ? JSON.parse(fs.readFileSync(episodeMetadataPath, "utf8"))
    : {};
  const shows = buildLibraryShows({
    videoDataByShow: {},
    generateSeasonVideos: () => [],
  });
  const showsByCleanId = Object.fromEntries(
    Object.entries(shows).map(([id, show]) => [normalizeId(id), { id, show }]),
  );

  const targetEntries = Object.entries(episodeTitles)
    .filter(([id]) => !requestedId || normalizeId(id) === requestedId)
    .filter(([id]) => replace || !existingMetadata[id])
    .slice(0, limit || undefined);

  if (!targetEntries.length) {
    console.log("No shows need episode metadata.");
    return;
  }

  const nextMetadata = { ...existingMetadata };
  const summary = [];

  for (const [id, titlesBySeason] of targetEntries) {
    const libraryEntry = shows[id] ? { id, show: shows[id] } : showsByCleanId[normalizeId(id)];
    const show = libraryEntry?.show || {};
    const title = show.title || titleFromId(id);
    const year = parseReleaseYear(show.release_year);
    const tmdbId = await resolveTmdbShowId({ title, year, apiKey, accessToken });
    if (!tmdbId) {
      summary.push(`${id}: TMDB show not found`);
      continue;
    }

    const metadataBySeason = {};
    const flatTmdbEpisodes = [];
    let cumulativeEpisodeOffset = 0;
    for (const [season, titles] of Object.entries(titlesBySeason)) {
      const seasonNumber = Number(season);
      if (!Number.isFinite(seasonNumber) || seasonNumber <= 0) continue;

      let seasonData;
      try {
        seasonData = await requestTmdb(`/tv/${tmdbId}/season/${seasonNumber}`, {}, { apiKey, accessToken });
      } catch (error) {
        if (flatTmdbEpisodes.length <= cumulativeEpisodeOffset) {
          summary.push(`${id}: season ${seasonNumber} skipped (${error.message})`);
          cumulativeEpisodeOffset += titles.length;
          continue;
        }
        summary.push(`${id}: season ${seasonNumber} mapped from flat TMDB episode order`);
      }
      const sourceEpisodes = (seasonData?.episodes || [])
        .filter((episode) => Number(episode.episode_number) > 0)
        .sort((left, right) => Number(left.episode_number) - Number(right.episode_number));
      if (sourceEpisodes.length) {
        flatTmdbEpisodes.push(...sourceEpisodes);
      }
      const tmdbEpisodes = new Map(
        sourceEpisodes
          .filter((episode) => Number(episode.episode_number) > 0)
          .map((episode) => [Number(episode.episode_number), episode]),
      );

      metadataBySeason[String(seasonNumber)] = titles.map((fallbackTitle, index) => {
        const episodeNumber = index + 1;
        const episode = tmdbEpisodes.get(episodeNumber) || flatTmdbEpisodes[cumulativeEpisodeOffset + index];
        return {
          title: episode?.name || formatTitleToken(fallbackTitle, episodeNumber),
          description: String(episode?.overview || "").trim(),
          airDate: episode?.air_date || "",
          tmdbId: clampPositiveInt(episode?.id, 0) || null,
        };
      });
      cumulativeEpisodeOffset += titles.length;
    }

    const count = Object.values(metadataBySeason).reduce((total, season) => total + season.length, 0);
    if (count > 0) {
      nextMetadata[id] = metadataBySeason;
      summary.push(`${id}: ${count} episode metadata row(s)`);
    } else {
      summary.push(`${id}: no episode metadata written`);
    }
  }

  if (dryRun) {
    console.log(summary.join("\n"));
    return;
  }

  fs.writeFileSync(episodeMetadataPath, `${JSON.stringify(nextMetadata, null, 2)}\n`);
  console.log(summary.join("\n"));
  console.log(`Wrote ${path.relative(ROOT, episodeMetadataPath)}`);
}

async function resolveTmdbShowId({ title, year, apiKey, accessToken }) {
  let search = await requestTmdb("/search/tv", {
    query: title,
    ...(year ? { first_air_date_year: year } : {}),
  }, { apiKey, accessToken });
  if (!(search.results || []).length && year) {
    search = await requestTmdb("/search/tv", { query: title }, { apiKey, accessToken });
  }

  return selectTmdbMediaId(search.results || [], { title, year });
}

async function requestTmdb(pathname, params, { apiKey, accessToken }) {
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
}

function selectTmdbMediaId(results, { title, year }) {
  const expectedTitle = normalizeMatchText(title);
  const expectedYear = parseReleaseYear(year);
  const exactTitles = results.filter((item) => {
    return [item.name, item.original_name]
      .filter(Boolean)
      .some((value) => normalizeMatchText(value) === expectedTitle);
  });
  const exactYear = expectedYear
    ? exactTitles.filter((item) => parseReleaseYear(item.first_air_date) === expectedYear)
    : exactTitles;
  const match = exactYear[0] || exactTitles[0] || results[0];
  return clampPositiveInt(match?.id, 0);
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function normalizeId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatTitleToken(value, episodeNumber) {
  const title = String(value || "").replace(/_/g, " ").trim();
  return title || `Episode ${episodeNumber}`;
}

function titleFromId(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseReleaseYear(value) {
  const match = String(value || "").match(/\d{4}/);
  return match ? match[0] : "";
}

function clampPositiveInt(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function printHelp() {
  console.log(`
Backfill CWorld episode descriptions from TMDB.

Usage:
  npm run episodes:metadata
  npm run episodes:metadata -- --id adventure-time
  npm run episodes:metadata -- --dry-run --limit 2

Options:
  --id show-id       Backfill one show only
  --limit number     Backfill the first N eligible shows
  --replace          Re-fetch shows already present in episodeMetadata.json
  --dry-run          Print summary without writing
`);
}
