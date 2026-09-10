import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildLibraryShows } from "../src/data/libraryShowsData.js";
import { SHOWS } from "../src/components/mobileshowsData.js";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const publicDir = path.join(frontendDir, "public");
const imagesDir = path.join(publicDir, "images");
const outputDir = path.join(imagesDir, "ios");
const cardOutputDir = path.join(outputDir, "cardimages");
const backdropOutputDir = path.join(outputDir, "backdrops");

const desktopShows = buildLibraryShows({
  videoDataByShow: {},
  generateSeasonVideos: () => [],
});

const mediaAssets = Object.entries(desktopShows).map(([id, desktop]) => {
  const mobile = SHOWS.find((item) => item.id === id) || {};
  return {
    id,
    card: mobile.card,
    backdrop: mobile.background || desktop.background,
    mobileBackdrop: mobile.mobilebackground || mobile.background || desktop.background,
  };
});

const unique = (values) => [...new Set(values.filter(Boolean))];

const localSourcePath = (source) => {
  const relative = String(source).replace(/^\/+/, "");
  if (!relative.startsWith("images/")) return null;
  return path.join(publicDir, relative);
};

const sourceRelativePath = (source) => String(source)
  .replace(/^\/+/, "")
  .replace(/^images\//, "");

const outputPathFor = (source, kind, extension) => {
  const relative = sourceRelativePath(source);
  const relativeWithoutExtension = relative.replace(/\.[^/.]+$/, "");
  const outputRelative = kind === "card"
    ? relativeWithoutExtension.replace(/^cardimages\//, "")
    : relativeWithoutExtension;
  return path.join(outputDir, kind === "card" ? "cardimages" : "backdrops", `${outputRelative}.${extension}`);
};

const run = async (command, args) => {
  await execFileAsync(command, args, { maxBuffer: 1024 * 1024, timeout: 45_000 });
};

const fileExists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const renderWithQuickLook = async (sourcePath, temporaryDir, size) => {
  const renderDir = await mkdtemp(path.join(temporaryDir, "render-"));
  let renderSource = sourcePath;
  if (path.extname(sourcePath).toLowerCase() === ".svg") {
    const svg = await readFile(sourcePath, "utf8");
    const withoutMetadata = svg.replace(/<metadata\b[\s\S]*?<\/metadata>/gi, "");
    renderSource = path.join(renderDir, `${path.basename(sourcePath)}.sanitized.svg`);
    await writeFile(renderSource, withoutMetadata, "utf8");
  }

  await run("qlmanage", ["-t", "-s", String(size), "-o", renderDir, renderSource]);
  const renderedPath = path.join(renderDir, `${path.basename(renderSource)}.png`);
  const files = await readdir(renderDir);
  const fallback = files.find((file) => file.endsWith(".png"));
  if (await fileExists(renderedPath)) return { path: renderedPath, directory: renderDir };
  if (fallback) return { path: path.join(renderDir, fallback), directory: renderDir };
  await rm(renderDir, { recursive: true, force: true });
  return null;
};

const copyRendered = async (sourcePath, destination, temporaryDir, size) => {
  const rendered = await renderWithQuickLook(sourcePath, temporaryDir, size);
  if (!rendered) return false;
  try {
    await copyFile(rendered.path, destination);
    return true;
  } finally {
    await rm(rendered.directory, { recursive: true, force: true });
  }
};

const convertCards = async (temporaryDir) => {
  const sources = unique(mediaAssets.map((asset) => asset.card));
  for (const source of sources) {
    const sourcePath = localSourcePath(source);
    if (!sourcePath) continue;
    const destination = outputPathFor(source, "card", "png");
    await mkdir(path.dirname(destination), { recursive: true });
    await copyRendered(sourcePath, destination, temporaryDir, 600);
  }
  return sources.length;
};

const convertBackdrops = async (temporaryDir) => {
  const sources = unique(mediaAssets.flatMap((asset) => [asset.backdrop, asset.mobileBackdrop]));
  for (const source of sources) {
    const sourcePath = localSourcePath(source);
    if (!sourcePath) continue;
    const destination = outputPathFor(source, "backdrop", "jpg");
    await mkdir(path.dirname(destination), { recursive: true });
    const rendered = await renderWithQuickLook(sourcePath, temporaryDir, 1600);
    if (!rendered) continue;
    await run("sips", [
      "-s", "format", "jpeg",
      "-s", "formatOptions", "88",
      rendered.path,
      "--out", destination,
    ]);
    await rm(rendered.directory, { recursive: true, force: true });
  }
  return sources.length;
};

const temporaryDir = await mkdtemp(path.join("/private/tmp/", "cworld-ios-artwork-"));
try {
  await mkdir(cardOutputDir, { recursive: true });
  await mkdir(backdropOutputDir, { recursive: true });
  const cardCount = await convertCards(temporaryDir);
  const backdropCount = await convertBackdrops(temporaryDir);
  console.log(`Generated ${cardCount} optimized iOS card image(s) and ${backdropCount} optimized iOS backdrop image(s).`);
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
