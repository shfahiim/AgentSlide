import { YoutubeTranscript } from "youtube-transcript";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node scripts/yt-transcript-test.mjs <youtube-url>");
    process.exit(1);
  }

  console.log("URL:", url);
  const items = await YoutubeTranscript.fetchTranscript(url);
  console.log("Transcript items:", items.length);

  console.log("Sample:");
  for (const it of items.slice(0, 15)) {
    const t = (it.offset ?? 0) / 1000;
    console.log(`[${formatTime(t)}] ${String(it.text ?? "").replace(/\s+/g, " ").trim()}`);
  }
}

main().catch((err) => {
  console.error("ERROR:", err?.message ?? err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});

