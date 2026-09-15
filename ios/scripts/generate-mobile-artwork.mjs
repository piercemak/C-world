import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const root = path.resolve(option("--source-root", path.join(path.dirname(fileURLToPath(import.meta.url)), "../..")));
const output = path.resolve(option("--output", path.join(root, "ios/CWorldIOS/Resources/MobileArtwork")));
const qa = option("--qa-output", null);
const sample = args.includes("--samples");
const sharp = createRequire(path.join(root, "frontend/package.json"))("sharp");
sharp.cache(false);
sharp.concurrency(2);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const catalog = JSON.parse(await fs.readFile(path.join(root, "frontend/public/catalog-v1.json"), "utf8"));
const assets = new Map();
for (const item of catalog.items) {
  if (sample && !["pokemon2000", "speaknoevil", "stevenuniverse"].includes(item.assetId)) continue;
  for (const [role, url] of Object.entries(item.artwork)) {
    if (!url || !new URL(url).pathname.toLowerCase().endsWith(".svg")) continue;
    const asset = assets.get(url) ?? { url, roles: new Set(), titles: new Set() };
    asset.roles.add(role);
    asset.titles.add(item.title);
    assets.set(url, asset);
  }
}
if (args.includes("--verify")) {
  const existing = JSON.parse(await fs.readFile(path.join(output, "manifest.json"), "utf8"));
  if (existing.version !== 1 || Object.keys(existing.assets).length !== assets.size) {
    throw new Error("Manifest version or catalog artwork coverage differs; regenerate exports.");
  }
  for (const asset of assets.values()) {
    const entry = existing.assets[asset.url];
    if (!entry) throw new Error(`Missing export: ${asset.url}`);
    const relative = decodeURIComponent(new URL(asset.url).pathname).replace(/^\/+/, "");
    const input = path.resolve(root, "frontend/public", relative);
    if (!input.startsWith(path.resolve(root, "frontend/public") + path.sep)) throw new Error("Invalid source path");
    if (hash(await fs.readFile(input)) !== entry.sourceSHA256) throw new Error(`Stale export: ${asset.url}`);
    for (const [filename, maximum] of [[entry.image, Math.max(entry.width, entry.height)], [entry.thumbnail, 320]]) {
      if (path.basename(filename) !== filename) throw new Error("Invalid resource filename");
      const metadata = await sharp(path.join(output, filename)).metadata();
      if (Math.max(metadata.width, metadata.height) !== maximum) throw new Error(`Incorrect dimensions: ${filename}`);
    }
  }
  console.log(`Verified ${assets.size} SVG mappings, source hashes, and ${assets.size * 2} native images.`);
  process.exit(0);
}
await fs.mkdir(output, { recursive: true });
if (qa) await fs.mkdir(qa, { recursive: true });
const manifest = { version: 1, catalogRevision: catalog.catalogRevision, assets: {} };
const report = [];
for (const asset of assets.values()) {
  const relative = decodeURIComponent(new URL(asset.url).pathname).replace(/^\/+/, "");
  const input = path.resolve(root, "frontend/public", relative);
  const publicRoot = path.resolve(root, "frontend/public") + path.sep;
  if (!input.startsWith(publicRoot)) throw new Error(`Invalid artwork path: ${relative}`);
  const source = await fs.readFile(input);
  const digest = hash(source);
  // Local exported SVGs contain very large base64 attributes. Lift libxml's
  // text-node limit for these repository assets, retaining a pixel-size limit.
  if (source.length > 128 * 1024 * 1024) throw new Error(`Artwork exceeds the generator's source limit: ${relative}`);
  const metadata = await sharp(source, { unlimited: true }).metadata();
  const maxDimension = asset.roles.has("backdrop") || asset.roles.has("mobileBackdrop") ? 3072 : asset.roles.has("poster") ? 1536 : 1024;
  const scale = maxDimension / Math.max(metadata.width, metadata.height);
  const width = Math.round(metadata.width * scale);
  const height = Math.round(metadata.height * scale);
  // Render the entire SVG, including masks, crop, layers and filters. Never
  // extract or substitute an embedded bitmap for the finished composition.
  const reference = await sharp(source, { density: Math.ceil(72 * scale), unlimited: true })
    .resize(width, height, { fit: "fill" }).toColourspace("srgb").png().toBuffer();
  const opaque = (await sharp(reference).stats()).isOpaque;
  const stem = hash(asset.url).slice(0, 12) + "-" + digest.slice(0, 12);
  const extension = opaque ? "jpg" : "png";
  const encode = (pipeline) => opaque
    ? pipeline.jpeg({ quality: 94, chromaSubsampling: "4:4:4", mozjpeg: true })
    : pipeline.png({ compressionLevel: 9, palette: false });
  const full = await encode(sharp(reference)).toBuffer();
  const thumbnail = await encode(sharp(reference).resize({ width: 320, height: 320, fit: "inside" })).toBuffer();
  const fullName = `${stem}.${extension}`;
  const thumbnailName = `${stem}-thumb.${extension}`;
  await fs.writeFile(path.join(output, fullName), full);
  await fs.writeFile(path.join(output, thumbnailName), thumbnail);
  manifest.assets[asset.url] = { image: fullName, thumbnail: thumbnailName, width, height,
    thumbnailMaxPixelSize: 320, sourceSHA256: digest };
  let psnr = null;
  if (opaque) {
    const original = await sharp(reference).removeAlpha().raw().toBuffer();
    const compressed = await sharp(full).removeAlpha().raw().toBuffer();
    let squaredError = 0;
    for (let i = 0; i < original.length; i++) squaredError += (original[i] - compressed[i]) ** 2;
    psnr = squaredError ? 10 * Math.log10(255 ** 2 / (squaredError / original.length)) : 100;
  }
  if (qa) {
    await fs.writeFile(path.join(qa, `${stem}-reference.png`), reference);
    const left = await sharp(reference).resize({ width: 480, height: 700, fit: "contain", background: "#101010" }).flatten({ background: "#101010" }).png().toBuffer();
    const right = await sharp(full).resize({ width: 480, height: 700, fit: "contain", background: "#101010" }).flatten({ background: "#101010" }).png().toBuffer();
    await sharp({ create: { width: 960, height: 700, channels: 3, background: "#101010" } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 480, top: 0 }])
      .png().toFile(path.join(qa, `${stem}-comparison.png`));
  }
  const result = { url: asset.url, titles: [...asset.titles], sourceBytes: source.length,
    outputBytes: full.length, thumbnailBytes: thumbnail.length, width, height, format: extension, psnr };
  report.push(result);
  console.log(JSON.stringify(result));
}
await fs.writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(path.join(output, "generation-report.json"), JSON.stringify({
  renderer: sharp.versions, assets: report,
  sourceBytes: report.reduce((n, a) => n + a.sourceBytes, 0),
  outputBytes: report.reduce((n, a) => n + a.outputBytes + a.thumbnailBytes, 0)
}, null, 2) + "\n");
