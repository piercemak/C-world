#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_PATH=${1:-"$ROOT_DIR/dist/cworld-roku.zip"}
OUTPUT_DIR=$(dirname -- "$OUTPUT_PATH")

ARTWORK_PYTHON="$ROOT_DIR/../backend/.venv/bin/python"
if [ ! -x "$ARTWORK_PYTHON" ]; then ARTWORK_PYTHON=python3; fi
"$ARTWORK_PYTHON" "$ROOT_DIR/prepare-artwork.py"
mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_PATH"

(cd "$ROOT_DIR" && zip -qr "$OUTPUT_PATH" manifest source components images fonts)
printf 'Created %s\n' "$OUTPUT_PATH"
