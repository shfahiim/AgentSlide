import { z } from "zod";
import { YoutubeTranscript } from "youtube-transcript";
import { generateStructuredWithRetry } from "../gemini";
import { PipelineProgress } from "../types";
import {
  extractYoutubeVideoId,
  secondsToTimestamp,
  youtubeWatchUrl,
} from "../youtube";
import { STUDY_YT_GUIDE_SYSTEM_PROMPT } from "./prompts/study-yt";

type ProgressCallback = (progress: PipelineProgress) => void;

function emit(
  onProgress: ProgressCallback | undefined,
  step: PipelineProgress["step"],
  status: PipelineProgress["status"],
  message: string,
  detail?: string,
) {
  onProgress?.({ step, status, message, detail, timestamp: Date.now() });
}

const StudyChapterSchema = z.object({
  title: z.string().min(3).max(80),
  startSec: z.number().min(0).max(10 * 60 * 60),
  summary: z.string().min(10).max(700),
  keyPoints: z.array(z.string().min(3).max(160)).min(2).max(7),
});

const StudyConceptSchema = z.object({
  term: z.string().min(2).max(50),
  definition: z.string().min(10).max(360),
  example: z.string().min(0).max(260).optional(),
});

const FlashcardSchema = z.object({
  front: z.string().min(2).max(120),
  back: z.string().min(10).max(420),
});

const QuizQuestionSchema = z.object({
  question: z.string().min(8).max(180),
  options: z.array(z.string().min(1).max(120)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(420),
});

const StudyGuideSchema = z.object({
  title: z.string().min(3).max(140),
  subtitle: z.string().min(0).max(220).optional(),
  summary: z.string().min(30).max(1200),
  keyTakeaways: z.array(z.string().min(3).max(160)).min(4).max(10),
  chapters: z.array(StudyChapterSchema).min(4).max(14),
  concepts: z.array(StudyConceptSchema).min(6).max(20),
  flashcards: z.array(FlashcardSchema).min(10).max(30),
  quiz: z.array(QuizQuestionSchema).min(5).max(12),
});

type StudyGuide = z.infer<typeof StudyGuideSchema>;

export interface StudyYtGeneratorOptions {
  urlOrId: string;
  onProgress?: ProgressCallback;
}

export interface StudyYtResult {
  html: string;
  title: string;
  videoId: string;
  videoUrl: string;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeJsonForHtml(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function formatTranscriptForPrompt(
  items: Array<{ text: string; offset: number }>,
  maxChars: number,
) {
  const lines: string[] = [];
  let used = 0;
  for (const item of items) {
    const line = `[${secondsToTimestamp(item.offset)}] ${item.text}`.trim();
    if (!line) continue;
    if (used + line.length + 1 > maxChars) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}

async function fetchOEmbed(videoUrl: string): Promise<{ title?: string; author?: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`,
      { method: "GET" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: string; author_name?: string };
    return { title: json.title, author: json.author_name };
  } catch {
    return null;
  }
}

function renderStudyHtml(opts: {
  guide: StudyGuide;
  transcript: Array<{ text: string; offset: number; duration: number }>;
  videoId: string;
  videoUrl: string;
  meta?: { title?: string; author?: string } | null;
}) {
  const { guide, transcript, videoId, videoUrl, meta } = opts;
  const dataJson = safeJsonForHtml({
    guide,
    transcript,
    videoId,
    videoUrl,
    meta,
  });

  const title = escapeHtml(meta?.title ?? guide.title ?? "Study Notes");
  const subtitle = escapeHtml(guide.subtitle ?? (meta?.author ? `by ${meta.author}` : "Study guide"));
  const summary = escapeHtml(guide.summary);

  const takeaways = guide.keyTakeaways
    .map(
      (t) =>
        `<span class="pill"><span class="pillDot"></span>${escapeHtml(t)}</span>`,
    )
    .join("");

  const chapters = guide.chapters
    .sort((a, b) => a.startSec - b.startSec)
    .map((c, idx) => {
      const ts = secondsToTimestamp(c.startSec);
      const points = c.keyPoints
        .map((p) => `<li>${escapeHtml(p)}</li>`)
        .join("");
      return `<article class="chapterCard" id="ch-${idx}">
  <div class="chapterTop">
    <div class="chapterMeta">
      <span class="chapterIndex">${idx + 1}</span>
      <div class="chapterText">
        <h3 class="chapterTitle">${escapeHtml(c.title)}</h3>
        <p class="chapterTime">
          <a class="timeLink" href="${escapeHtml(
            youtubeWatchUrl(videoId, c.startSec),
          )}" target="_blank" rel="noreferrer">▶ ${escapeHtml(ts)}</a>
          <span class="chapterSep">•</span>
          <span class="chapterSummary">${escapeHtml(c.summary)}</span>
        </p>
      </div>
    </div>
    <button class="ghostBtn" data-copy="${escapeHtml(c.title)} — ${escapeHtml(ts)}" title="Copy chapter title">Copy</button>
  </div>
  <ul class="chapterPoints">${points}</ul>
</article>`;
    })
    .join("");

  const concepts = guide.concepts
    .map((c) => {
      return `<div class="conceptCard">
  <div class="conceptTop">
    <div class="conceptTerm">${escapeHtml(c.term)}</div>
    <button class="ghostBtn" data-copy="${escapeHtml(c.term)}: ${escapeHtml(c.definition)}" title="Copy">Copy</button>
  </div>
  <div class="conceptDef">${escapeHtml(c.definition)}</div>
  ${c.example ? `<div class="conceptEx"><span class="muted">Example:</span> ${escapeHtml(c.example)}</div>` : ""}
</div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style>
      :root{
        --bg:#0b1220;
        --bg2:#0f172a;
        --card: rgba(255,255,255,0.06);
        --card2: rgba(255,255,255,0.085);
        --border: rgba(255,255,255,0.10);
        --text:#e5e7eb;
        --muted:#a1a1aa;
        --muted2:#94a3b8;
        --brand:#22c55e;
        --brand2:#60a5fa;
        --brand3:#a78bfa;
        --warn:#f59e0b;
        --danger:#fb7185;
        --shadow: 0 16px 50px rgba(0,0,0,0.35);
        --radius: 18px;
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      *{ box-sizing:border-box; }
      html,body{ height:100%; }
      body{
        margin:0;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif;
        color:var(--text);
        background:
          radial-gradient(900px 500px at 18% 8%, rgba(96,165,250,.35), transparent 60%),
          radial-gradient(900px 500px at 78% 22%, rgba(167,139,250,.32), transparent 60%),
          radial-gradient(700px 450px at 45% 85%, rgba(34,197,94,.18), transparent 55%),
          linear-gradient(180deg, var(--bg), var(--bg2));
        overflow-x:hidden;
      }
      .gridLines{
        position:fixed;
        inset:0;
        pointer-events:none;
        opacity:0.22;
        background-image:
          linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(60% 45% at 50% 35%, #000 55%, transparent 75%);
      }
      .container{ max-width: 1180px; margin: 0 auto; padding: 24px; }
      .topbar{
        position:sticky;
        top:0;
        z-index:10;
        backdrop-filter: blur(14px);
        background: rgba(11,18,32,0.68);
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      .topbarInner{ display:flex; align-items:center; gap:12px; padding: 14px 24px; max-width: 1180px; margin:0 auto; }
      .logo{
        width:38px; height:38px; border-radius: 14px;
        background: linear-gradient(135deg, rgba(34,197,94,.9), rgba(96,165,250,.85), rgba(167,139,250,.85));
        box-shadow: 0 10px 25px rgba(34,197,94,.15);
        display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(255,255,255,.15);
      }
      .logo svg{ width:20px; height:20px; }
      .topTitle{ min-width:0; }
      .topTitle .t{ font-size: 13px; font-weight: 800; letter-spacing: .02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .topTitle .s{ font-size: 11px; color: var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .spacer{ flex:1; }
      .btn{
        display:inline-flex; align-items:center; justify-content:center; gap:8px;
        height: 38px; padding: 0 14px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: var(--text);
        text-decoration:none;
        font-weight: 800;
        font-size: 12px;
        transition: transform .15s ease, background .15s ease, border-color .15s ease;
      }
      .btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.18); }
      .btnPrimary{
        background: linear-gradient(135deg, rgba(34,197,94,.85), rgba(96,165,250,.75));
        border-color: rgba(255,255,255,.18);
      }
      .btnPrimary:hover{ background: linear-gradient(135deg, rgba(34,197,94,.95), rgba(96,165,250,.85)); }
      .btn svg{ width:16px; height:16px; }

      .hero{
        padding: 26px 0 8px;
      }
      .heroGrid{
        display:grid;
        grid-template-columns: 1.25fr .75fr;
        gap: 18px;
        align-items: stretch;
      }
      @media (max-width: 980px){
        .heroGrid{ grid-template-columns: 1fr; }
      }
      .panel{
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        overflow:hidden;
      }
      .panelInner{ padding: 22px; }
      .kicker{
        display:inline-flex; align-items:center; gap:10px;
        font-family: var(--mono);
        font-size: 11px;
        color: rgba(229,231,235,.85);
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      .kdot{ width:10px; height:10px; border-radius: 4px; background: rgba(34,197,94,.9); box-shadow: 0 0 0 6px rgba(34,197,94,.12); }
      h1{
        margin: 12px 0 10px;
        font-size: 36px;
        line-height: 1.08;
        letter-spacing: -0.03em;
      }
      @media (max-width: 540px){ h1{ font-size: 28px; } }
      .sub{
        color: var(--muted2);
        font-size: 14px;
        line-height: 1.6;
        margin:0;
      }
      .summary{
        margin-top: 16px;
        font-size: 14px;
        line-height: 1.7;
        color: rgba(229,231,235,.92);
      }
      .takeaways{
        display:flex; flex-wrap: wrap; gap: 10px;
        margin-top: 18px;
      }
      .pill{
        display:inline-flex; align-items:center; gap:10px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
        font-size: 12px;
        font-weight: 700;
        color: rgba(229,231,235,.92);
      }
      .pillDot{
        width:10px; height:10px; border-radius: 6px;
        background: linear-gradient(135deg, rgba(34,197,94,.85), rgba(96,165,250,.85));
      }
      .miniGrid{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 980px){ .miniGrid{ grid-template-columns: 1fr; } }
      .stat{
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        padding: 14px 14px;
      }
      .stat .n{ font-size: 18px; font-weight: 900; letter-spacing: -0.02em; }
      .stat .l{ font-size: 11px; text-transform: uppercase; letter-spacing: .18em; color: var(--muted); margin-top: 4px; font-family: var(--mono); }
      .stat .hint{ font-size: 12px; color: rgba(229,231,235,.86); margin-top: 8px; line-height: 1.5; }

      .section{ margin-top: 18px; }
      .sectionHeader{
        display:flex; align-items:flex-end; justify-content: space-between; gap: 12px;
        padding: 16px 2px 10px;
      }
      .sectionHeader h2{
        margin:0;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: .02em;
      }
      .sectionHeader p{
        margin:0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.4;
      }

      .chapterGrid{
        display:grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .chapterCard{
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: var(--radius);
        padding: 16px;
      }
      .chapterTop{ display:flex; align-items:flex-start; justify-content: space-between; gap: 14px; }
      .chapterMeta{ display:flex; align-items:flex-start; gap: 12px; min-width:0; }
      .chapterIndex{
        width: 30px; height: 30px; border-radius: 12px;
        background: rgba(96,165,250,.14);
        border: 1px solid rgba(96,165,250,.25);
        display:flex; align-items:center; justify-content:center;
        font-weight: 900;
        color: rgba(226,232,240,.95);
        flex:0 0 auto;
      }
      .chapterText{ min-width:0; }
      .chapterTitle{ margin: 0; font-size: 14px; font-weight: 900; letter-spacing: -0.01em; }
      .chapterTime{ margin: 6px 0 0; color: rgba(229,231,235,.85); font-size: 12px; line-height: 1.5; }
      .chapterSep{ opacity: .55; margin: 0 6px; }
      .chapterSummary{ color: rgba(229,231,235,.82); }
      .timeLink{
        display:inline-flex; align-items:center; gap: 8px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(34,197,94,.22);
        background: rgba(34,197,94,.10);
        color: rgba(229,231,235,.92);
        text-decoration:none;
        font-weight: 900;
        font-family: var(--mono);
        font-size: 11px;
      }
      .timeLink:hover{ border-color: rgba(34,197,94,.30); background: rgba(34,197,94,.14); }
      .chapterPoints{
        margin: 12px 0 0;
        padding-left: 18px;
        color: rgba(226,232,240,.92);
        line-height: 1.65;
        font-size: 13px;
      }
      .chapterPoints li{ margin: 4px 0; }

      .grid2{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 980px){ .grid2{ grid-template-columns: 1fr; } }
      .conceptCard{
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: var(--radius);
        padding: 16px;
      }
      .conceptTop{ display:flex; align-items:flex-start; justify-content: space-between; gap: 12px; }
      .conceptTerm{
        font-weight: 950;
        letter-spacing: -0.02em;
        font-size: 13px;
        color: rgba(229,231,235,.98);
      }
      .conceptDef{ margin-top: 10px; color: rgba(226,232,240,.90); line-height: 1.65; font-size: 13px; }
      .conceptEx{ margin-top: 10px; color: rgba(226,232,240,.86); line-height: 1.55; font-size: 12px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,.12); }
      .muted{ color: var(--muted); font-weight: 800; }

      .ghostBtn{
        height: 30px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.04);
        color: rgba(229,231,235,.88);
        font-weight: 900;
        font-size: 11px;
        letter-spacing: .02em;
        cursor: pointer;
        transition: background .15s ease, border-color .15s ease, transform .15s ease;
        flex: 0 0 auto;
      }
      .ghostBtn:hover{ background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.18); transform: translateY(-1px); }

      .studyGrid{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 980px){ .studyGrid{ grid-template-columns: 1fr; } }
      .widget{
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: var(--radius);
        overflow:hidden;
      }
      .widgetHead{
        padding: 14px 16px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 10px;
        border-bottom: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(135deg, rgba(96,165,250,.10), rgba(167,139,250,.08));
      }
      .widgetHead h3{ margin:0; font-size: 13px; font-weight: 950; letter-spacing: -0.01em; }
      .widgetBody{ padding: 16px; }

      .flashWrap{ display:flex; flex-direction:column; gap: 12px; }
      .flashCard{
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.05);
        padding: 18px;
        cursor: pointer;
        user-select:none;
        min-height: 140px;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        line-height: 1.6;
        font-weight: 850;
        letter-spacing: -0.01em;
      }
      .flashCard .small{ display:block; margin-top: 8px; font-size: 12px; font-weight: 700; color: rgba(226,232,240,.78); }
      .flashNav{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
      .flashNav .count{ font-family: var(--mono); font-size: 11px; color: var(--muted); letter-spacing: .12em; text-transform: uppercase; }

      .quizQ{ border-top: 1px solid rgba(255,255,255,.10); padding-top: 14px; margin-top: 14px; }
      .quizQ:first-child{ border-top: none; padding-top: 0; margin-top: 0; }
      .quizQ h4{ margin:0 0 10px; font-size: 13px; font-weight: 950; letter-spacing:-.01em; }
      .opts{ display:grid; grid-template-columns: 1fr; gap: 8px; }
      .optBtn{
        text-align:left;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.04);
        color: rgba(226,232,240,.92);
        font-weight: 800;
        cursor:pointer;
        transition: transform .12s ease, background .12s ease, border-color .12s ease;
      }
      .optBtn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.18); }
      .optBtn.correct{ border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.12); }
      .optBtn.wrong{ border-color: rgba(251,113,133,.35); background: rgba(251,113,133,.12); }
      .explain{ margin-top: 10px; font-size: 12px; color: rgba(226,232,240,.85); line-height: 1.55; }
      .scoreRow{
        display:flex; align-items:center; justify-content:space-between; gap: 10px;
        margin-top: 12px; padding-top: 12px;
        border-top: 1px dashed rgba(255,255,255,.12);
        font-family: var(--mono);
        font-size: 11px;
        color: var(--muted);
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .tSearch{
        width: 100%;
        height: 38px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.04);
        color: rgba(226,232,240,.92);
        padding: 0 12px;
        outline: none;
        font-weight: 800;
      }
      .tSearch::placeholder{ color: rgba(148,163,184,.75); font-weight: 700; }
      .tList{ margin-top: 12px; display:flex; flex-direction:column; gap: 10px; }
      .tRow{
        display:flex; gap: 12px; align-items:flex-start;
        padding: 12px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
      }
      .tTime{
        font-family: var(--mono);
        font-size: 11px;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: rgba(226,232,240,.86);
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(96,165,250,.28);
        background: rgba(96,165,250,.10);
        white-space:nowrap;
      }
      .tText{ color: rgba(226,232,240,.92); line-height: 1.6; font-size: 13px; }
      mark{
        background: rgba(245,158,11,.25);
        color: rgba(255,255,255,.96);
        padding: 0 4px;
        border-radius: 6px;
      }
      .footer{
        margin: 26px 0 14px;
        text-align:center;
        color: rgba(148,163,184,.85);
        font-size: 11px;
      }
      .toast{
        position: fixed;
        left: 50%;
        bottom: 22px;
        transform: translateX(-50%);
        background: rgba(0,0,0,.68);
        border: 1px solid rgba(255,255,255,.14);
        color: rgba(229,231,235,.92);
        padding: 10px 12px;
        border-radius: 14px;
        font-size: 12px;
        font-weight: 800;
        opacity: 0;
        pointer-events: none;
        transition: opacity .18s ease, transform .18s ease;
        box-shadow: 0 18px 60px rgba(0,0,0,.45);
      }
      .toast.on{ opacity: 1; transform: translateX(-50%) translateY(-4px); }
    </style>
  </head>
  <body>
    <div class="gridLines"></div>

    <div class="topbar">
      <div class="topbarInner">
        <div class="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7.5 7.7c2-2 7-2 9 0 2 2 2 6.6 0 8.6-2 2-7 2-9 0-2-2-2-6.6 0-8.6Z" stroke="rgba(255,255,255,.9)" stroke-width="1.7"/>
            <path d="M10 10.2h4M10 13.8h2.6" stroke="rgba(255,255,255,.9)" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="topTitle">
          <div class="t">${title}</div>
          <div class="s">${subtitle}</div>
        </div>
        <div class="spacer"></div>
        <a class="btn btnPrimary" id="yt-link" href="${escapeHtml(videoUrl)}" target="_blank" rel="noreferrer" title="Open YouTube">
          <svg viewBox="0 0 24 24" fill="none"><path d="M10 8.5v7l6-3.5-6-3.5Z" fill="rgba(255,255,255,.95)"/><path d="M21 12c0 6-2 7-9 7S3 18 3 12s2-7 9-7 9 1 9 7Z" stroke="rgba(255,255,255,.55)" stroke-width="1.4"/></svg>
          Watch
        </a>
        <button class="btn" id="copy-link" title="Copy link">
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 9h10v10H9V9Z" stroke="rgba(255,255,255,.85)" stroke-width="1.6"/><path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/></svg>
          Copy
        </button>
      </div>
    </div>

    <div class="container">
      <section class="hero">
        <div class="heroGrid">
          <div class="panel">
            <div class="panelInner">
              <div class="kicker"><span class="kdot"></span> study mode • captions → guide</div>
              <h1>${title}</h1>
              <p class="sub">${escapeHtml(guide.subtitle ?? "")}</p>
              <div class="summary">${summary}</div>
              <div class="takeaways">${takeaways}</div>
            </div>
          </div>
          <div class="panel">
            <div class="panelInner">
              <div class="miniGrid">
                <div class="stat">
                  <div class="n" id="stat-lines">—</div>
                  <div class="l">caption lines</div>
                  <div class="hint">Searchable transcript with time links.</div>
                </div>
                <div class="stat">
                  <div class="n" id="stat-ch">—</div>
                  <div class="l">chapters</div>
                  <div class="hint">Chunked into study-sized sections.</div>
                </div>
                <div class="stat">
                  <div class="n" id="stat-fc">—</div>
                  <div class="l">flashcards</div>
                  <div class="hint">Click to flip. Shuffle and repeat.</div>
                </div>
                <div class="stat">
                  <div class="n" id="stat-q">—</div>
                  <div class="l">quiz</div>
                  <div class="hint">Instant feedback with explanations.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div>
            <h2>Chapters</h2>
            <p>Use them as a mini-syllabus.</p>
          </div>
          <a class="btn" href="${escapeHtml(youtubeWatchUrl(videoId))}" target="_blank" rel="noreferrer" title="Open from start">
            Start at 0:00
          </a>
        </div>
        <div class="chapterGrid">${chapters}</div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div>
            <h2>Concepts</h2>
            <p>Terms + definitions extracted from the video.</p>
          </div>
        </div>
        <div class="grid2">${concepts}</div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div>
            <h2>Practice</h2>
            <p>Flashcards + a quick quiz.</p>
          </div>
        </div>
        <div class="studyGrid">
          <div class="widget" id="flashcards">
            <div class="widgetHead">
              <h3>Flashcards</h3>
              <div class="flashNav">
                <span class="count" id="fc-count">—</span>
                <button class="ghostBtn" id="fc-shuffle">Shuffle</button>
              </div>
            </div>
            <div class="widgetBody">
              <div class="flashWrap">
                <div class="flashCard" id="fc-card" title="Click to flip"></div>
                <div class="flashNav">
                  <button class="ghostBtn" id="fc-prev">Prev</button>
                  <button class="ghostBtn" id="fc-next">Next</button>
                </div>
              </div>
            </div>
          </div>

          <div class="widget" id="quiz">
            <div class="widgetHead">
              <h3>Quiz</h3>
              <button class="ghostBtn" id="quiz-reset">Reset</button>
            </div>
            <div class="widgetBody" id="quiz-body"></div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="sectionHeader">
          <div>
            <h2>Transcript</h2>
            <p>Search and jump to exact moments.</p>
          </div>
          <button class="btn" id="t-load" title="Load more transcript rows">Load more</button>
        </div>
        <div class="panel">
          <div class="panelInner">
            <input class="tSearch" id="t-search" placeholder="Search transcript… (press / to focus)" />
            <div class="tList" id="t-list"></div>
          </div>
        </div>
      </section>

      <div class="footer">
        Generated from YouTube captions. Not affiliated with YouTube.
      </div>
    </div>

    <div class="toast" id="toast">Copied</div>
    <script type="application/json" id="study-data">${dataJson}</script>
    <script>
      const data = JSON.parse(document.getElementById('study-data').textContent || '{}');
      const guide = data.guide || {};
      const transcript = Array.isArray(data.transcript) ? data.transcript : [];
      const videoId = data.videoId || '';
      const videoUrl = data.videoUrl || '';

      const $ = (id) => document.getElementById(id);
      const toast = $('toast');
      let toastTimer = null;

      function showToast(text){
        if(!toast) return;
        toast.textContent = text;
        toast.classList.add('on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('on'), 1200);
      }

      function copyText(t){
        try{
          navigator.clipboard.writeText(String(t || '')).then(() => showToast('Copied'));
        }catch{
          showToast('Copy failed');
        }
      }

      document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('[data-copy]') : null;
        if(btn){
          copyText(btn.getAttribute('data-copy'));
        }
      });

      const copyLinkBtn = $('copy-link');
      if(copyLinkBtn){
        copyLinkBtn.addEventListener('click', () => copyText(videoUrl || ('https://www.youtube.com/watch?v=' + videoId)));
      }

      // Stats
      $('stat-lines').textContent = String(transcript.length || 0);
      $('stat-ch').textContent = String((guide.chapters || []).length || 0);
      $('stat-fc').textContent = String((guide.flashcards || []).length || 0);
      $('stat-q').textContent = String((guide.quiz || []).length || 0);

      // Flashcards
      let fc = Array.isArray(guide.flashcards) ? guide.flashcards.slice() : [];
      let fcIdx = 0;
      let fcFlipped = false;
      const fcCard = $('fc-card');
      const fcCount = $('fc-count');

      function setFcCount(){
        if(!fcCount) return;
        fcCount.textContent = \`\${fc.length ? (fcIdx + 1) : 0} / \${fc.length} cards\`;
      }
      function renderFc(){
        if(!fcCard) return;
        if(!fc.length){
          fcCard.innerHTML = '<div>No flashcards</div>';
          setFcCount();
          return;
        }
        const card = fc[fcIdx] || {};
        const front = (card.front || '').trim();
        const back = (card.back || '').trim();
        fcCard.innerHTML = fcFlipped
          ? \`<div>\${escapeHtml(back)}<span class="small">Click to see front</span></div>\`
          : \`<div>\${escapeHtml(front)}<span class="small">Click to flip</span></div>\`;
        setFcCount();
      }
      function shuffle(arr){
        for(let i=arr.length-1;i>0;i--){
          const j = Math.floor(Math.random() * (i+1));
          [arr[i],arr[j]] = [arr[j],arr[i]];
        }
        return arr;
      }
      function nextFc(d){
        if(!fc.length) return;
        fcIdx = (fcIdx + d + fc.length) % fc.length;
        fcFlipped = false;
        renderFc();
      }
      if(fcCard){
        fcCard.addEventListener('click', () => { fcFlipped = !fcFlipped; renderFc(); });
      }
      $('fc-prev')?.addEventListener('click', () => nextFc(-1));
      $('fc-next')?.addEventListener('click', () => nextFc(1));
      $('fc-shuffle')?.addEventListener('click', () => { fc = shuffle(fc); fcIdx = 0; fcFlipped = false; renderFc(); showToast('Shuffled'); });

      // Quiz
      const quizBody = $('quiz-body');
      let quizScore = 0;
      function renderQuiz(){
        const q = Array.isArray(guide.quiz) ? guide.quiz : [];
        quizScore = 0;
        if(!quizBody) return;
        quizBody.innerHTML = '';
        if(!q.length){
          quizBody.innerHTML = '<div class="muted">No quiz questions</div>';
          return;
        }
        q.forEach((qq, idx) => {
          const wrap = document.createElement('div');
          wrap.className = 'quizQ';
          wrap.innerHTML = \`<h4>\${idx + 1}. \${escapeHtml(String(qq.question || ''))}</h4>\`;
          const opts = document.createElement('div');
          opts.className = 'opts';
          const answeredKey = 'studyyt:' + videoId + ':q:' + idx;
          const saved = localStorage.getItem(answeredKey);
          let answered = saved ? Number(saved) : null;
          (Array.isArray(qq.options) ? qq.options : []).slice(0,4).forEach((opt, oi) => {
            const b = document.createElement('button');
            b.className = 'optBtn';
            b.type = 'button';
            b.innerHTML = escapeHtml(String(opt || ''));
            b.addEventListener('click', () => {
              if(answered !== null) return;
              answered = oi;
              localStorage.setItem(answeredKey, String(oi));
              applyAnswer();
            });
            opts.appendChild(b);
          });
          wrap.appendChild(opts);
          const explain = document.createElement('div');
          explain.className = 'explain';
          wrap.appendChild(explain);
          quizBody.appendChild(wrap);

          function applyAnswer(){
            const buttons = Array.from(opts.querySelectorAll('button'));
            const correct = Number(qq.answerIndex);
            buttons.forEach((b, i) => {
              if(i === correct) b.classList.add('correct');
              if(answered === i && i !== correct) b.classList.add('wrong');
              b.disabled = true;
            });
            if(answered === correct) quizScore++;
            explain.textContent = String(qq.explanation || '');
            updateScore();
          }
          if(answered !== null) applyAnswer();
        });
        updateScore();
      }
      function updateScore(){
        if(!quizBody) return;
        const q = Array.isArray(guide.quiz) ? guide.quiz : [];
        const answered = q.reduce((acc, _qq, idx) => acc + (localStorage.getItem('studyyt:' + videoId + ':q:' + idx) ? 1 : 0), 0);
        const existing = quizBody.querySelector('.scoreRow');
        if(existing) existing.remove();
        const row = document.createElement('div');
        row.className = 'scoreRow';
        row.innerHTML = \`<span>answered</span><span>\${answered} / \${q.length}</span>\`;
        quizBody.appendChild(row);
      }
      $('quiz-reset')?.addEventListener('click', () => {
        const q = Array.isArray(guide.quiz) ? guide.quiz : [];
        q.forEach((_qq, idx) => localStorage.removeItem('studyyt:' + videoId + ':q:' + idx));
        renderQuiz();
        showToast('Reset');
      });

      // Transcript search + pagination
      let tLimit = 40;
      function secToTs(s){
        s = Math.max(0, Math.floor(Number(s || 0)));
        const hh = Math.floor(s / 3600);
        const mm = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        return hh > 0 ? (hh + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0')) : (mm + ':' + String(ss).padStart(2,'0'));
      }
      function escapeRegExp(str){ return String(str).replace(/[.*+?^{}$()|[\\]\\\\]/g, '\\\\$&'); }
      function escapeHtml(str){
        return String(str)
          .replaceAll('&','&amp;')
          .replaceAll('<','&lt;')
          .replaceAll('>','&gt;')
          .replaceAll('\"','&quot;')
          .replaceAll(\"'\",'&#39;');
      }
      function highlight(text, q){
        const raw = String(text || '');
        const query = String(q || '').trim();
        if(!query) return escapeHtml(raw);
        const re = new RegExp('(' + escapeRegExp(query) + ')', 'ig');
        const parts = raw.split(re);
        return parts.map((p,i) => i % 2 === 1 ? '<mark>' + escapeHtml(p) + '</mark>' : escapeHtml(p)).join('');
      }
      function renderTranscript(){
        const list = $('t-list');
        if(!list) return;
        const q = $('t-search')?.value || '';
        const query = String(q).trim();
        const items = transcript
          .filter((it) => query ? String(it.text || '').toLowerCase().includes(query.toLowerCase()) : true)
          .slice(0, tLimit);
        list.innerHTML = items.map((it) => {
          const sec = Math.max(0, Math.floor(Number(it.offset || 0)));
          const ts = secToTs(sec);
          const href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId) + '&t=' + sec + 's';
          return '<div class="tRow">' +
            '<a class="tTime" href="' + href + '" target="_blank" rel="noreferrer" title="Open at ' + ts + '">' + ts + '</a>' +
            '<div class="tText">' + highlight(it.text, query) + '</div>' +
          '</div>';
        }).join('');
      }
      $('t-search')?.addEventListener('input', () => { tLimit = 40; renderTranscript(); });
      $('t-load')?.addEventListener('click', () => { tLimit = Math.min(tLimit + 60, transcript.length); renderTranscript(); showToast('Loaded'); });
      document.addEventListener('keydown', (e) => {
        if(e.key === '/' && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))){
          e.preventDefault();
          $('t-search')?.focus();
        }
      });

      // Init
      renderFc();
      renderQuiz();
      renderTranscript();
    </script>
  </body>
</html>`;
}

export async function runStudyYtPipeline(
  opts: StudyYtGeneratorOptions,
): Promise<StudyYtResult> {
  const { urlOrId, onProgress } = opts;
  const videoId = extractYoutubeVideoId(urlOrId);
  if (!videoId) {
    throw new Error("Please paste a valid YouTube URL or 11-character video ID.");
  }
  const videoUrl = urlOrId.trim().startsWith("http")
    ? urlOrId.trim()
    : youtubeWatchUrl(videoId);

  emit(onProgress, "intake", "running", "Fetching YouTube captions…");
  const transcriptRaw = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: "en" });
  if (!Array.isArray(transcriptRaw) || transcriptRaw.length === 0) {
    throw new Error("No transcript found for this video (captions may be disabled).");
  }
  const transcript = transcriptRaw.map((t) => ({
    text: String(t.text ?? ""),
    offset: Number(t.offset ?? 0),
    duration: Number(t.duration ?? 0),
  }));
  emit(onProgress, "intake", "done", "Captions loaded", `${transcript.length} lines`);

  emit(onProgress, "research", "running", "Extracting chapters, concepts, and practice…");
  const meta = await fetchOEmbed(videoUrl);

  const transcriptForPrompt = formatTranscriptForPrompt(transcript, 120_000);
  const guide = await generateStructuredWithRetry({
    schema: StudyGuideSchema,
    schemaName: "StudyGuide",
    systemPrompt: STUDY_YT_GUIDE_SYSTEM_PROMPT,
    temperature: 0.35,
    prompt: `Create a structured study guide from YouTube captions.

VIDEO
- videoId: ${videoId}
- url: ${videoUrl}
- title: ${meta?.title ?? "(unknown)"}
- author: ${meta?.author ?? "(unknown)"}

CAPTIONS (timestamped)
${transcriptForPrompt}
`,
  });
  emit(onProgress, "research", "done", "Study guide ready");

  emit(onProgress, "generation", "running", "Building interactive study page…");
  const html = renderStudyHtml({ guide, transcript, videoId, videoUrl, meta });
  emit(onProgress, "generation", "done", "Study page generated");

  const title = meta?.title ?? guide.title ?? "Study Notes";
  return { html, title, videoId, videoUrl };
}
