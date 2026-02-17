#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from typing import Any


def parse_video_id(value: str) -> str:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value

    m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", value)
    if m:
        return m.group(1)

    m = re.search(r"youtu\.be/([A-Za-z0-9_-]{11})", value)
    if m:
        return m.group(1)

    raise ValueError("Could not parse a YouTube video id (expected URL or 11-char id).")


def format_time(seconds: float) -> str:
    s = max(0, int(seconds))
    m = s // 60
    r = s % 60
    return f"{m:02d}:{r:02d}"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/py_yt_transcript_test.py <youtube-url-or-id>", file=sys.stderr)
        return 1

    raw = sys.argv[1]
    vid = parse_video_id(raw)
    print("Input:", raw)
    print("Video ID:", vid)

    try:
        from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore
    except Exception as e:
        print("ERROR: youtube-transcript-api not installed:", str(e), file=sys.stderr)
        return 2

    ytt_api = YouTubeTranscriptApi()

    # Try to fetch English first; fall back to whatever is available.
    try:
        fetched = ytt_api.fetch(vid, languages=["en"])
    except Exception:
        fetched = ytt_api.fetch(vid)

    language = getattr(fetched, "language", None)
    language_code = getattr(fetched, "language_code", None)
    is_generated = getattr(fetched, "is_generated", None)
    print("Language:", language, "(", language_code, ")", "generated:", is_generated)

    print("Items:", len(fetched))
    print("Sample:")
    for snippet in list(fetched)[:15]:
        start = float(getattr(snippet, "start", 0.0))
        text = str(getattr(snippet, "text", "")).replace("\n", " ").strip()
        if not text:
            continue
        print(f"[{format_time(start)}] {text}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
