import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const packageJsonPath = path.join(cwd, "package.json");
const tauriConfigPath = path.join(cwd, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(cwd, "src-tauri", "Cargo.toml");

const usage = `Usage:
  npm run tauri:version -- <patch|minor|major|x.y.z>
`;

const input = process.argv[2];
if (!input) {
  console.error(usage);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));
const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");

const currentVersion = packageJson.version;

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return match.slice(1).map(Number);
}

function increment(version, kind) {
  const [major, minor, patch] = parseVersion(version);
  switch (kind) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    default:
      return kind;
  }
}

const nextVersion = increment(currentVersion, input);
parseVersion(nextVersion);

packageJson.version = nextVersion;
tauriConfig.version = nextVersion;

const updatedCargoToml = cargoToml.replace(
  /^version = ".*"$/m,
  `version = "${nextVersion}"`
);

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
fs.writeFileSync(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
fs.writeFileSync(cargoTomlPath, updatedCargoToml);

console.log(`Desktop app version updated: ${currentVersion} -> ${nextVersion}`);
