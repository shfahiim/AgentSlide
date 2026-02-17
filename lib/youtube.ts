export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const patterns = ["shorts", "embed", "live"];
      if (parts.length >= 2 && patterns.includes(parts[0])) {
        const id = parts[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // ignore
  }

  const m =
    trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
    trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ??
    trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function youtubeWatchUrl(videoId: string, startSeconds?: number) {
  const base = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  if (typeof startSeconds === "number" && Number.isFinite(startSeconds) && startSeconds > 0) {
    return `${base}&t=${Math.floor(startSeconds)}s`;
  }
  return base;
}

export function secondsToTimestamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${String(hh)}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(mm)}:${String(ss).padStart(2, "0")}`;
}

