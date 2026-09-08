#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_PATH=${1:-"$ROOT_DIR/dist/cworld-roku.zip"}
OUTPUT_DIR=$(dirname -- "$OUTPUT_PATH")

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_PATH"

(cd "$ROOT_DIR" && zip -qr "$OUTPUT_PATH" manifest source components)
printf 'Created %s\n' "$OUTPUT_PATH"
