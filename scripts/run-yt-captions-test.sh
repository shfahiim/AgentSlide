#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage: bash scripts/run-yt-captions-test.sh <youtube-url>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

if ! npm ls @distube/ytdl-core --depth=0 >/dev/null 2>&1; then
  npm install @distube/ytdl-core
fi

YTDL_NO_UPDATE=1 node scripts/yt-captions-test.mjs "$URL"

