# Tauri Release Flow

## One-time setup

- Keep the updater private key safe at `~/.tauri/cearaworld.key`
- Do not commit the private key
- Add this GitHub repository secret if you want fully automated releases:
  - `TAURI_SIGNING_PRIVATE_KEY`
- Only add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if you later switch to a password-protected key

## Ship a new desktop app version

1. Bump the version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. Fastest local version bump options:

```bash
npm run tauri:version:patch
```

or set an exact version:

```bash
npm run tauri:version -- 0.1.1
```

3. Build the signed updater artifacts:

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/cearaworld.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
source "$HOME/.cargo/env"
npm run tauri:build
```

4. Generate `latest.json` for GitHub Releases:

```bash
TAURI_RELEASE_NOTES="Your release notes here" npm run tauri:latest-json
```

Or do both build + metadata in one command:

```bash
TAURI_RELEASE_NOTES="Your release notes here" npm run tauri:release
```

5. Upload these files from `src-tauri/target/release/bundle/macos/` to a GitHub Release tagged `vX.Y.Z`:
   - `CearaWorld.app.tar.gz`
   - `CearaWorld.app.tar.gz.sig`
   - `latest.json`

## Mostly automated GitHub Actions release

Once the repository secrets are added, you can automate almost everything:

1. Bump the app version locally
2. Commit and push
3. Create and push a matching git tag, for example:

```bash
git tag v0.1.1
git push origin v0.1.1
```

4. GitHub Actions will:
   - build macOS updater artifacts
   - create/update the GitHub Release
   - upload updater signatures
   - upload `latest.json`

Workflow file:

- `.github/workflows/tauri-release.yml`

## Optional overrides

- Set a custom tag:

```bash
TAURI_RELEASE_TAG=v0.1.1 npm run tauri:latest-json
```

- Set a different GitHub repository:

```bash
TAURI_RELEASE_REPOSITORY=owner/repo npm run tauri:latest-json
```
