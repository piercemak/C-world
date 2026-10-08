import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

// Expand the canonical registry's timing rules. No guesses
// about credits, cold opens, or episode durations are introduced here.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--source-root', path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')));
const output = option('--output', path.join(root, 'ios/CWorldIOS/Resources/episode-markers.json'));
const { generateRegistry } = await import(pathToFileURL(path.join(root, 'frontend/scripts/generate-media-registry.mjs')));
generateRegistry({root:path.join(root,'frontend')});
const { getSkipMarkers } = await import(pathToFileURL(path.join(root, 'frontend/src/data/mediaTiming.js')));
const source = await fs.readFile(path.join(root, 'frontend/src/data/mediaRegistry.json'), 'utf8');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'frontend/public/catalog-v1.json'), 'utf8'));
const episodes = {};
for (const media of catalog.items) {
  for (const season of media.seasons ?? []) for (const episode of season.episodes) {
    const { intro, outro } = getSkipMarkers(media.id, season.number, episode.number);
    const validIntro = Number.isFinite(intro?.start) && Number.isFinite(intro?.end) && intro.start >= 0 && intro.end > intro.start;
    const validOutro = Number.isFinite(outro?.start) && outro.start > 0;
    episodes[`${media.id.replaceAll('-', '')}:${season.number}:${episode.number}`] = {
      introStart: validIntro ? intro.start : null,
      introEnd: validIntro ? intro.end : null,
      outroStart: validOutro ? outro.start : null
    };
  }
}
const result = { version: 1, source: 'frontend/src/data/mediaRegistry.json',
  sourceSHA256: createHash('sha256').update(source).digest('hex'), episodes };
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Exported existing web skip timings for ${Object.keys(episodes).length} episodes.`);
