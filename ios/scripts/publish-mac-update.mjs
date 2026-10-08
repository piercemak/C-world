import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash, createPublicKey, verify } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const installer = path.resolve(process.argv[2] || '');
const publish = process.argv.includes('--publish');
if (!installer.endsWith('.dmg') || !fs.existsSync(installer + '.json')) {
  throw new Error('Usage: node ios/scripts/publish-mac-update.mjs <packaged.dmg> [--publish]');
}
const config = JSON.parse(fs.readFileSync(installer + '.json', 'utf8'));
const { version, build, publicKey, keychainAccount, githubRepository, feedURL } = config;
if (!/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(build) || build < 2 ||
    githubRepository !== 'piercemak/C-world' ||
    feedURL !== `https://raw.githubusercontent.com/${githubRepository}/mac-updates/appcast.xml`) {
  throw new Error('Unsupported release metadata; verify the version, build, repository, and feed URL.');
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout || result.error}`);
  return (result.stdout || '').trim();
}
const sparkle = run('bash', [path.join(root, 'ios/scripts/prepare-sparkle.sh')]);
const sparklePrivateKey = process.env.SPARKLE_ED_KEY?.trim();
if (sparklePrivateKey) {
  // CI publishes with the protected Sparkle Ed25519 seed instead of a local Keychain item.
  // The public key is still verified independently below against the generated feed.
} else if (run(path.join(sparkle, 'bin/generate_keys'), ['--account', keychainAccount, '-p']) !== publicKey) {
  throw new Error('The signing key in Keychain does not match this app. Do not generate a replacement key.');
}
const tag = `mac-catalyst-${version}-${build}`;
const directory = path.join(root, 'dist/catalyst/publish', tag);
fs.mkdirSync(directory, { recursive: true });
const name = `CearaWorld-${version}-${build}.dmg`;
const archive = path.join(directory, name);
const stableName = 'CearaWorld.dmg';
const stableArchive = path.join(root, 'dist/catalyst/publish', `${tag}-${stableName}`);
const digest = createHash('sha256').update(fs.readFileSync(installer)).digest('hex');
if (fs.existsSync(archive) && createHash('sha256').update(fs.readFileSync(archive)).digest('hex') !== digest) {
  throw new Error('This release version was already prepared with different contents. Increment the build number.');
}
fs.copyFileSync(installer, archive);
fs.copyFileSync(path.join(root, 'ios/LocalMac/release-notes.txt'), archive.replace(/\.dmg$/, '.txt'));
const appcastArgs = [
  '--maximum-deltas', '0', '--embed-release-notes',
  '--download-url-prefix', `https://github.com/${githubRepository}/releases/download/${tag}/`, directory
];
if (sparklePrivateKey) {
  appcastArgs.unshift('--ed-key-file', '-');
  run(path.join(sparkle, 'bin/generate_appcast'), appcastArgs, {
    input: `${sparklePrivateKey}\n`,
    stdio: ['pipe', 'inherit', 'pipe']
  });
} else {
  appcastArgs.unshift('--account', keychainAccount);
  run(path.join(sparkle, 'bin/generate_appcast'), appcastArgs, { stdio: ['ignore', 'inherit', 'pipe'] });
}
const feedPath = path.join(directory, 'appcast.xml');
const feed = fs.readFileSync(feedPath);
if (!feed.toString().includes('sparkle:edSignature=') || !feed.toString().includes(`<sparkle:version>${build}</sparkle:version>`)) {
  throw new Error('Generated feed is missing its update signature or expected build number.');
}
const signingKey = createPublicKey({
  key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey, 'base64')]),
  format: 'der', type: 'spki'
});
const feedSignature = feed.toString().match(/edSignature: ([^\n]+)\nlength: (\d+)/);
const archiveSignature = feed.toString().match(/sparkle:edSignature="([^"]+)"/)?.[1];
if (!feedSignature || !archiveSignature ||
    !verify(null, feed.subarray(0, Number(feedSignature[2])), signingKey, Buffer.from(feedSignature[1], 'base64')) ||
    !verify(null, fs.readFileSync(archive), signingKey, Buffer.from(archiveSignature, 'base64'))) {
  throw new Error('Independent signature verification failed. Nothing was published.');
}
fs.writeFileSync(path.join(directory, 'SHA256SUMS.txt'), `${digest}  ${name}\n`);
fs.copyFileSync(archive, stableArchive);
console.log(`Prepared signed release: ${directory}`);
if (!publish) {
  console.log('Nothing uploaded. Add --publish to upload the release and publish the signed feed.');
  process.exit(0);
}

// CI supplies GITHUB_TOKEN; local publishing can continue using the existing credential helper.
let token = process.env.GITHUB_TOKEN?.trim();
if (!token) {
  const credential = run('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
  token = credential.split('\n').find(line => line.startsWith('password='))?.slice(9);
}
if (!token) throw new Error('No GitHub credential is available for publishing.');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
const base = `https://api.github.com/repos/${githubRepository}`;
async function api(route, method = 'GET', body, allow404 = false) {
  const response = await fetch(base + route, { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (allow404 && response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(`GitHub ${method} ${route}: ${response.status} ${data.message || ''}`);
  return data;
}
const existingFeed = await api('/contents/appcast.xml?ref=mac-updates', 'GET', undefined, true);
if (existingFeed) {
  const text = Buffer.from(existingFeed.content, 'base64').toString();
  const existingBuilds = [...text.matchAll(/<sparkle:version>(\d+)<\/sparkle:version>/g)].map(match => Number(match[1]));
  if (existingBuilds.some(value => value > build)) throw new Error('Refusing to replace a newer published release with an older build.');
}
let release = await api(`/releases/tags/${tag}`, 'GET', undefined, true);
// A draft may not yet have a tag ref, so the by-tag endpoint can return 404.
if (!release) {
  for (let page = 1; ; page++) {
    const candidates = await api(`/releases?per_page=100&page=${page}`);
    release = candidates.find(candidate => candidate.tag_name === tag);
    if (release || candidates.length < 100) break;
  }
}
if (!release) {
  release = await api('/releases', 'POST', {
    tag_name: tag, target_commitish: 'main', name: `CearaWorld Mac ${version} (build ${build})`,
    body: fs.readFileSync(path.join(root, 'ios/LocalMac/release-notes.txt'), 'utf8') + '\n\nMac Catalyst, Intel and Apple Silicon, macOS 14+. Locally signed; not Apple-notarized. CWorld login required.\n',
    draft: true, prerelease: false
  });
}
for (const [file, type] of [[archive, 'application/x-apple-diskimage'], [stableArchive, 'application/x-apple-diskimage'], [path.join(directory, 'SHA256SUMS.txt'), 'text/plain']]) {
  const filename = path.basename(file);
  const bytes = fs.statSync(file).size;
  const sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const existing = release.assets.find(asset => asset.name === filename);
  if (existing) {
    if (existing.state !== 'uploaded' || existing.size !== bytes || existing.digest !== `sha256:${sha}`) {
      throw new Error(`Existing GitHub asset does not match ${filename}; increment the build or inspect the draft release.`);
    }
    console.log(`Already uploaded: ${filename}`);
    continue;
  }
  const url = release.upload_url.replace(/\{.*$/, '') + '?name=' + encodeURIComponent(filename);
  console.log(`Uploading ${filename} (${Math.round(bytes / 1024 / 1024)} MiB)…`);
  const response = await fetch(url, {
    method: 'POST', headers: { ...headers, 'Content-Type': type, 'Content-Length': String(bytes) },
    body: fs.createReadStream(file), duplex: 'half'
  });
  const asset = await response.json();
  if (!response.ok || asset.state !== 'uploaded' || asset.size !== bytes || asset.digest !== `sha256:${sha}`) {
    throw new Error(`GitHub did not verify the uploaded asset ${filename}: ${response.status}`);
  }
}
if (release.draft) release = await api(`/releases/${release.id}`, 'PATCH', { draft: false, prerelease: false });
const publicDownload = `https://github.com/${githubRepository}/releases/download/${tag}/${name}`;
const stableDownload = `https://github.com/${githubRepository}/releases/latest/download/${stableName}`;
const downloadCheck = await fetch(publicDownload, { method: 'HEAD' });
if (!downloadCheck.ok) throw new Error('Installer is not publicly reachable; the update feed has not been changed. Retry shortly.');
if (!await api('/git/ref/heads/mac-updates', 'GET', undefined, true)) {
  const main = await api('/git/ref/heads/main');
  await api('/git/refs', 'POST', { ref: 'refs/heads/mac-updates', sha: main.object.sha });
}
// Publish discovery last, after the signed installer is publicly available.
await api('/contents/appcast.xml', 'PUT', {
  message: `Publish CWorld Mac ${version} build ${build} update feed`, branch: 'mac-updates',
  content: feed.toString('base64'), ...(existingFeed ? { sha: existingFeed.sha } : {})
});
const stableCheck = await fetch(stableDownload, { method: 'HEAD' });
if (!stableCheck.ok) throw new Error('Stable installer link is not publicly reachable.');
console.log(`Published installer: ${publicDownload}\nStable installer: ${stableDownload}\nUpdate feed: ${feedURL}\nRelease: ${release.html_url}`);
