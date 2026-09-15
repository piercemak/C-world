import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { VIDEO_PLAYER_SIDEBAR_ITEMS, VIDEO_PLAYER_CARD_ID_TO_SLUG } from '../../frontend/src/data/videoPlayerCatalogData.js';
import { newMedia } from '../../frontend/src/components/newMedia.js';
const output = new URL('../CWorldIOS/Resources/desktop-reference.json', import.meta.url);
const content = JSON.stringify({ order: VIDEO_PLAYER_SIDEBAR_ITEMS.map(item => VIDEO_PLAYER_CARD_ID_TO_SLUG[item.cardId]).filter(Boolean), newMedia: newMedia.map(({showSlug, season, episode}) => ({id: showSlug, season, episode})) }, null, 2) + '\n';
if (process.argv.includes('--verify')) {
    if (await fs.readFile(output, 'utf8') !== content) throw new Error('Desktop ordering is stale. Regenerate desktop-reference.json.');
} else await fs.writeFile(output, content);
console.log(`Desktop ordering: ${VIDEO_PLAYER_SIDEBAR_ITEMS.length} entries (${fileURLToPath(output)})`);
if (process.argv.includes('--fixtures')) {
    const catalog = JSON.parse(await fs.readFile(new URL('../../frontend/public/catalog-v1.json', import.meta.url), 'utf8'));
    const wanted = VIDEO_PLAYER_SIDEBAR_ITEMS.slice(0, 12).map(item => VIDEO_PLAYER_CARD_ID_TO_SLUG[item.cardId].replaceAll('-', ''));
    const items = catalog.items.filter(item => wanted.includes(item.id.replaceAll('-', ''))).map(item => ({
        ...item, seasons: item.seasons?.slice(0, 2).map(season => ({...season, episodes: season.episodes.slice(0, 4)}))
    }));
    const fixture = new URL('../../CWorldIOS/CWorldIOSTests/Fixtures/mac-catalog.json', import.meta.url);
    await fs.mkdir(new URL('.', fixture), {recursive: true});
    await fs.writeFile(fixture, JSON.stringify(items, null, 2) + '\n');
}
