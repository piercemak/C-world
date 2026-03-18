import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const cwd = process.cwd();
const packageJsonPath = path.join(cwd, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const env = { ...process.env };
const keyPath =
  env.TAURI_SIGNING_PRIVATE_KEY_PATH ||
  path.join(env.HOME || "", ".tauri", "cearaworld.key");

if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Missing updater signing key. Expected TAURI_SIGNING_PRIVATE_KEY or a key file at ${keyPath}`
    );
  }
  env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(keyPath, "utf8");
}

if (!("TAURI_SIGNING_PRIVATE_KEY_PASSWORD" in env)) {
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "";
}

if (!env.TAURI_RELEASE_NOTES) {
  env.TAURI_RELEASE_NOTES = `Release ${packageJson.version}`;
}

console.log(`Building CearaWorld desktop release ${packageJson.version}...`);
execSync("npm run tauri:build", { cwd, stdio: "inherit", env });
execSync("npm run tauri:latest-json", { cwd, stdio: "inherit", env });

const bundleDir = path.join(cwd, "src-tauri", "target", "release", "bundle", "macos");
console.log("\nRelease artifacts ready:");
console.log(`- ${path.join(bundleDir, "CearaWorld.app.tar.gz")}`);
console.log(`- ${path.join(bundleDir, "CearaWorld.app.tar.gz.sig")}`);
console.log(`- ${path.join(bundleDir, "latest.json")}`);
