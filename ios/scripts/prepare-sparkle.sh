#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION=2.10.0
EXPECTED=c2bf58aa8387266ac179357b1415d6f2635f044da8be41042af32425dae6da0c
DEST="$REPO_ROOT/dist/vendor/Sparkle-$VERSION"
ARCHIVE="$REPO_ROOT/dist/vendor/Sparkle-$VERSION.tar.xz"
mkdir -p "$REPO_ROOT/dist/vendor"
if [ ! -f "$ARCHIVE" ]; then
    curl --fail --location --retry 3 \
        "https://github.com/sparkle-project/Sparkle/releases/download/$VERSION/Sparkle-$VERSION.tar.xz" \
        -o "$ARCHIVE.part" >&2
    mv "$ARCHIVE.part" "$ARCHIVE"
fi
ACTUAL="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
if [ "$ACTUAL" != "$EXPECTED" ]; then
    printf 'Sparkle archive checksum mismatch: %s\n' "$ARCHIVE" >&2
    exit 1
fi
if [ ! -f "$DEST/bin/generate_appcast" ]; then
    mkdir -p "$DEST"
    tar -xJf "$ARCHIVE" -C "$DEST"
fi
printf '%s\n' "$DEST"
