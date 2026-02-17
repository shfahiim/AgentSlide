import ytdl from "@distube/ytdl-core";

// Reduce noisy network calls (ytdl update check) when running in CI/dev.
process.env.YTDL_NO_UPDATE = process.env.YTDL_NO_UPDATE ?? "1";

function pickCaptionTrack(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const byLang = (code) => tracks.find((t) => t.languageCode === code);
  return (
    byLang("en") ||
    byLang("en-US") ||
    byLang("en-GB") ||
    tracks.find((t) => t.kind === "asr") ||
    tracks[0]
  );
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/yt-captions-test.mjs <youtube-url>");
    process.exit(1);
  }

  console.log("URL:", url);

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails?.title ?? "(unknown)";
  console.log("Title:", title);

  const tracks =
    info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks ??
    [];

  console.log("Caption tracks:", Array.isArray(tracks) ? tracks.length : 0);
  if (!Array.isArray(tracks) || tracks.length === 0) {
    console.log("No captions found (disabled/unavailable).");
    process.exit(0);
  }

  // Print track summary (first few).
  for (const t of tracks.slice(0, 8)) {
    console.log(
      "-",
      [
        t.languageCode,
        t.kind ?? "human",
        t.name?.simpleText ?? "",
        t.isTranslatable ? "translatable" : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  const chosen = pickCaptionTrack(tracks);
  console.log("Chosen:", chosen.languageCode, chosen.kind ?? "human");

  const captionUrl = new URL(chosen.baseUrl);
  // Prefer JSON3 so parsing is straightforward.
  captionUrl.searchParams.set("fmt", "json3");

  const res = await fetch(captionUrl.toString(), {
    headers: {
      // Some environments require a UA header.
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Encoding": "identity",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  console.log("Caption fetch:", res.status, res.statusText);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log(text.slice(0, 400));
    process.exit(1);
  }

  const raw = await res.text();
  console.log("Caption bytes:", raw.length);
  if (raw.length < 10) {
    console.log("Caption body too short:", JSON.stringify(raw));
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.log("JSON parse failed. Head:", raw.slice(0, 200));
    console.log("JSON parse failed. Tail:", raw.slice(-200));
    throw e;
  }
  const events = Array.isArray(json?.events) ? json.events : [];
  console.log("Events:", events.length);

  const lines = [];
  for (const ev of events) {
    const startMs = ev.tStartMs ?? 0;
    const segs = Array.isArray(ev.segs) ? ev.segs : [];
    const text = segs.map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    lines.push({ t: startMs / 1000, text });
  }

  console.log("Transcript lines:", lines.length);
  console.log("Sample:");
  for (const l of lines.slice(0, 12)) {
    console.log(`[${formatTime(l.t)}] ${l.text}`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err?.message ?? err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
