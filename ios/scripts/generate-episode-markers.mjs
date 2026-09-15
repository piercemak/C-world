import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Expand the existing web player's repository-owned timing table. No guesses
// about credits, cold opens, or episode durations are introduced here.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option('--source-root', path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')));
const output = option('--output', path.join(root, 'ios/CWorldIOS/Resources/episode-markers.json'));
const source = await fs.readFile(path.join(root, 'frontend/src/components/Show.jsx'), 'utf8');
const start = source.indexOf('const skipTimes = ');
const end = source.indexOf('const getActiveSkipTime =', start);
if (start < 0 || end < 0) throw new Error('Web timing table moved; update the extractor.');
const table = vm.runInNewContext(source.slice(start, end) + '\nskipTimes;', {}, { timeout: 1000 });
const catalog = JSON.parse(await fs.readFile(path.join(root, 'frontend/public/catalog-v1.json'), 'utf8'));
const episodes = {};
for (const media of catalog.items) {
  const timings = table[media.id.replaceAll('-', '')] ?? table[media.assetId];
  if (!timings) continue;
  for (const season of media.seasons ?? []) for (const episode of season.episodes) {
    const specific = timings.seasons?.[season.number]?.[episode.number];
    const base = specific ?? timings.default;
    if (!base) continue;
    const rule = specific ? undefined : timings.rules?.find(rule => rule.condition(season.number, episode.number));
    const intro = rule?.intro ?? base.intro;
    const outro = rule?.outro ?? base.outro;
    const validIntro = Number.isFinite(intro?.start) && Number.isFinite(intro?.end) && intro.start >= 0 && intro.end > intro.start;
    const validOutro = Number.isFinite(outro?.start) && outro.start > 0;
    episodes[`${media.id.replaceAll('-', '')}:${season.number}:${episode.number}`] = {
      introStart: validIntro ? intro.start : null,
      introEnd: validIntro ? intro.end : null,
      outroStart: validOutro ? outro.start : null
    };
  }
}
const result = { version: 1, source: 'frontend/src/components/Show.jsx',
  sourceSHA256: createHash('sha256').update(source).digest('hex'), episodes };
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Exported existing web skip timings for ${Object.keys(episodes).length} episodes.`);
