#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-}"
if [[ -z "$INPUT" ]]; then
  echo "Usage: bash scripts/run-py-yt-transcript-test.sh <youtube-url-or-id>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required" >&2
  exit 1
fi

VENV_DIR="scripts/.venv-ytt"

if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

python -m pip -q install --upgrade pip >/dev/null
python -m pip -q install youtube-transcript-api >/dev/null

python scripts/py_yt_transcript_test.py "$INPUT"

