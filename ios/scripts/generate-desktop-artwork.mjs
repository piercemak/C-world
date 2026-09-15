import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildLibraryShows} from '../../frontend/src/data/libraryShowsData.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'ios/CWorldIOS/Resources/DesktopArtwork');
const shows = buildLibraryShows({videoDataByShow:{}, generateSeasonVideos:()=>[]});
const sharp = createRequire(path.join(root, 'frontend/package.json'))('sharp');
sharp.cache(false); sharp.concurrency(2);
const hash = value => createHash('sha256').update(value).digest('hex');
const manifest = {version:1, assets:{}};
await fs.mkdir(output, {recursive:true});
const existing = process.argv.includes('--verify') ? JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8')) : null;
for (const [id, show] of Object.entries(shows)) {
    const sourcePath = path.join(root, 'frontend/public', show.background);
    const source = await fs.readFile(sourcePath);
    const digest = hash(source);
    if (existing) {
        const item = existing.assets[id];
        if (!item || item.sourceSHA256 !== digest || item.source !== show.background) throw new Error(`Stale desktop artwork: ${id}`);
        for (const [file, max] of [[item.image,3072],[item.thumbnail,640]]) {
            const metadata=await sharp(path.join(output,file)).metadata();
            if (!metadata.width || !metadata.height || Math.max(metadata.width,metadata.height)>max) throw new Error(`Invalid export: ${id}`);
        }
        continue;
    }
    const metadata = await sharp(source, {unlimited:true}).metadata();
    const scale = Math.min(1, 3072 / Math.max(metadata.width, metadata.height));
    const width = Math.max(1, Math.round(metadata.width * scale)), height = Math.max(1, Math.round(metadata.height * scale));
    const stem = id + '-' + digest.slice(0,12);
    const bitmap = await sharp(source,{unlimited:true,density:72}).resize(width,height).flatten({background:'#08090c'}).toColourspace('srgb').png().toBuffer();
    const image = stem + '.jpg', thumbnail = stem + '-thumb.jpg';
    await sharp(bitmap).jpeg({quality:94,chromaSubsampling:'4:4:4',mozjpeg:true}).toFile(path.join(output,image));
    await sharp(bitmap).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).jpeg({quality:94,chromaSubsampling:'4:4:4',mozjpeg:true}).toFile(path.join(output,thumbnail));
    manifest.assets[id] = {image,thumbnail,source:show.background,sourceSHA256:digest,width,height,
        meta:[show.release_year,show.genre,show.season_total_number || show.duration].filter(Boolean).join(' • ')};
    console.log(`Desktop cover: ${id} ${width}×${height}`);
}
if (!existing) await fs.writeFile(path.join(output,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(`${existing?'Verified':'Exported'} ${Object.keys(shows).length} desktop covers.`);
