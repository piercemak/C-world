import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const publicDir = path.join(rootDir, "public");
const outputPath = path.join(rootDir, "src", "generated", "offlineAssetManifest.js");

const imageExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const shouldCacheImage = (relativePath) => {
  const normalized = relativePath.split(path.sep).join("/");
  if (!imageExtensions.has(path.extname(normalized).toLowerCase())) return false;

  return (
    normalized.startsWith("images/cardimages/")
    || normalized.includes("/covers/")
    || normalized === "images/misc/CearaLogo.png"
    || normalized === "images/misc/CearaLogo.svg"
    || normalized === "images/misc/CearaWorld.svg"
    || normalized === "images/misc/profilepictureBlank.webp"
  );
};

const walk = async (dir, prefix = "") => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath, relativePath));
    } else if (entry.isFile() && shouldCacheImage(relativePath)) {
      files.push(`/${relativePath.split(path.sep).join("/")}`);
    }
  }

  return files;
};

const assets = [...new Set(await walk(publicDir))].sort((a, b) => a.localeCompare(b));

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `export const OFFLINE_IMAGE_ASSETS = ${JSON.stringify(assets, null, 2)};\n`,
);

console.log(`Generated ${assets.length} offline image asset paths.`);
