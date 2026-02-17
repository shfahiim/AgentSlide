#!/usr/bin/env bash
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage: bash scripts/run-yt-transcript-test.sh <youtube-url>" >&2
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

if ! npm ls youtube-transcript --depth=0 >/dev/null 2>&1; then
  npm install youtube-transcript
fi

node scripts/yt-transcript-test.mjs "$URL"

