import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const publicDir = path.join(frontendDir, "public");
const outputRoot = path.join(publicDir, "roku-captions");

const collectVttFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectVttFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".vtt")) {
      files.push(entryPath);
    }
  }
  return files;
};

const normalizeTimestamp = (value) => {
  const [time, milliseconds = "000"] = value.replace(",", ".").split(".");
  const parts = time.split(":").map(Number);
  const paddedParts = parts.length === 2 ? [0, ...parts] : parts;
  return `${paddedParts.map((part) => String(part).padStart(2, "0")).join(":")},${milliseconds.padEnd(3, "0").slice(0, 3)}`;
};

const vttToSrt = (source) => {
  const lines = source.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues = [];
  let index = 0;

  while (index < lines.length) {
    const timestampIndex = lines.findIndex((line, lineIndex) => (
      line.includes(" --> ") && lineIndex >= index
    ));
    if (timestampIndex === -1) break;

    const timestampLine = lines[timestampIndex];
    const [start, endWithSettings] = timestampLine.split(" --> ");
    const end = endWithSettings.trim().split(/\s+/)[0];
    const textLines = [];
    let textIndex = timestampIndex + 1;
    while (textIndex < lines.length && lines[textIndex].trim() !== "") {
      textLines.push(lines[textIndex]);
      textIndex += 1;
    }

    if (textLines.length > 0) {
      cues.push(`${cues.length + 1}\n${normalizeTimestamp(start.trim())} --> ${normalizeTimestamp(end)}\n${textLines.join("\n")}`);
    }
    index = textIndex + 1;
  }

  return `${cues.join("\n\n")}\n`;
};

const files = await collectVttFiles(publicDir);
for (const sourcePath of files) {
  const relativePath = path.relative(publicDir, sourcePath);
  const outputPath = path.join(outputRoot, relativePath.replace(/\.vtt$/i, ".srt"));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, vttToSrt(await readFile(sourcePath, "utf8")), "utf8");
}

console.log(`Generated ${files.length} Roku caption file(s) at ${outputRoot}`);
