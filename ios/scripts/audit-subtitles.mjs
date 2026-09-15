import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--source-root', path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'frontend/public/catalog-v1.json'), 'utf8'));
const { getSubtitleTrackSrc } = await import(pathToFileURL(path.join(root, 'frontend/src/data/subtitleTracks.js')));
const tracks = new Map();
const issues = [];
let enabledTitles = 0;
const add = (media, season, episode, urls) => {
  const label = `${media.id}${season == null ? '' : ` S${season}E${episode}`}`;
  const expected = getSubtitleTrackSrc({ showId: media.id, season, episode });
  if (expected && !urls.some(url => new URL(url).pathname === expected)) issues.push(`${label}: web subtitle mapping absent from iOS catalog`);
  if (media.subtitles && urls.length === 0) issues.push(`${label}: subtitles enabled but no track mapped`);
  for (const url of urls) {
    const labels = tracks.get(url) ?? [];
    labels.push(label);
    tracks.set(url, labels);
  }
};
for (const media of catalog.items) {
  if (media.subtitles) enabledTitles++;
  if (media.type === 'movie') add(media, null, null, media.subtitleTracks ?? []);
  else for (const season of media.seasons ?? []) for (const episode of season.episodes) add(media, season.number, episode.number, episode.subtitles ?? []);
}
const timestamp = /^(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}$/;
const inspect = text => {
  const lines = text.replaceAll('\r', '').split('\n').filter(line => line.includes('-->'));
  let valid = 0, short = 0;
  for (const line of lines) {
    const [left, right] = line.split('-->').map(value => value.trim().split(/\s+/)[0]);
    if (timestamp.test(left) && timestamp.test(right)) {
      valid++;
      if (left.split(':').length === 2 || right.split(':').length === 2) short++;
    }
  }
  return { cueTimingLines: lines.length, validTimingLines: valid, shortTimestampCues: short };
};
const assets = [];
for (const [url, labels] of tracks) {
  const localPath = path.resolve(root, 'frontend/public', '.' + decodeURIComponent(new URL(url).pathname));
  if (!localPath.startsWith(path.join(root, 'frontend/public') + path.sep)) throw new Error('Unsafe source path');
  const entry = { url, labels, localPath };
  try {
    const data = await fs.readFile(localPath);
    Object.assign(entry, inspect(data.toString('utf8')), { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
    if (!entry.validTimingLines || entry.validTimingLines !== entry.cueTimingLines) issues.push(`${url}: invalid or empty local subtitle timings`);
  } catch (error) { entry.localError = error.message; issues.push(`${url}: missing local file`); }
  assets.push(entry);
}
if (args.includes('--remote')) {
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < assets.length) {
      const asset = assets[next++];
      try {
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(15000) });
        const data = Buffer.from(await response.arrayBuffer());
        asset.remote = { status: response.status, ...inspect(data.toString('utf8')), matchesLocal: createHash('sha256').update(data).digest('hex') === asset.sha256 };
        if (!response.ok || !asset.remote.validTimingLines) issues.push(`${asset.url}: remote HTTP ${response.status}, ${asset.remote.validTimingLines} valid cues`);
      } catch (error) { asset.remote = { error: error.message }; issues.push(`${asset.url}: remote check failed (${error.message})`); }
    }
  }));
}
const report = { auditedAt: new Date().toISOString(), catalogRevision: catalog.catalogRevision, enabledTitles, tracks: assets.length,
  shortTimestampTracks: assets.filter(asset => asset.shortTimestampCues > 0).length, issues, assets };
const reportPath = option('--report', null);
if (reportPath) await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, assets: undefined }, null, 2));
if (issues.length) process.exitCode = 1;
