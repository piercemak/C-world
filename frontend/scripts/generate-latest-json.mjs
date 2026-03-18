import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const packageJsonPath = path.join(workspaceRoot, "package.json");
const tauriConfigPath = path.join(workspaceRoot, "src-tauri", "tauri.conf.json");
const defaultBundleDir = path.join(
  workspaceRoot,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "macos"
);

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));

const bundleDir = process.env.TAURI_BUNDLE_DIR || defaultBundleDir;
const releaseRepo = process.env.TAURI_RELEASE_REPOSITORY || "piercemak/C-world";
const version = process.env.TAURI_RELEASE_VERSION || tauriConfig.version || packageJson.version;
const tag = process.env.TAURI_RELEASE_TAG || `v${version}`;
const target = process.env.TAURI_UPDATE_TARGET || "darwin-aarch64";
const notes = process.env.TAURI_RELEASE_NOTES || `Release ${version}`;
const outputPath = process.env.TAURI_LATEST_JSON_PATH || path.join(bundleDir, "latest.json");
const productName = tauriConfig.productName || "CearaWorld";

if (!fs.existsSync(bundleDir)) {
  throw new Error(`Bundle directory not found: ${bundleDir}`);
}

const bundleFiles = fs.readdirSync(bundleDir);
const archiveName =
  bundleFiles.find((file) => file === `${productName}.app.tar.gz`) ||
  bundleFiles.find((file) => file.endsWith(".app.tar.gz"));

if (!archiveName) {
  throw new Error(`Could not find a .app.tar.gz updater archive in ${bundleDir}`);
}

const signaturePath = path.join(bundleDir, `${archiveName}.sig`);
if (!fs.existsSync(signaturePath)) {
  throw new Error(`Could not find signature file: ${signaturePath}`);
}

const signature = fs.readFileSync(signaturePath, "utf8").trim();
const latestJson = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      signature,
      url: `https://github.com/${releaseRepo}/releases/download/${tag}/${archiveName}`,
    },
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(latestJson, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(`Archive: ${archiveName}`);
console.log(`Tag: ${tag}`);
console.log(`Target: ${target}`);
