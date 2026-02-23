"use client";

import Link from "next/link";
import { useState } from "react";
import { useGeneration } from "@/lib/hooks/use-generation";

const THEMES = [
  { value: "emerald-modern", label: "Emerald Modern", desc: "Fresh, friendly" },
  { value: "ocean-blue", label: "Ocean Blue", desc: "Clean, analytical" },
  { value: "sunset-warm", label: "Sunset Warm", desc: "Warm, energetic" },
  { value: "royal-purple", label: "Royal Purple", desc: "Premium, creative" },
  { value: "rose-cream", label: "Rose Cream", desc: "Approachable, storytelling" },
  { value: "slate-mono", label: "Slate Mono", desc: "Serious, neutral" },
  { value: "modern-dark", label: "Modern Dark", desc: "Bold, tech" },
  { value: "minimal-light", label: "Minimal Light", desc: "Simple, airy" },
  { value: "corporate", label: "Corporate", desc: "Business, formal" },
  { value: "vibrant", label: "Vibrant", desc: "High-contrast, punchy" },
];

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState("emerald-modern");
  const generation = useGeneration();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create presentation</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-40 border rounded p-3 focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Create a 10-slide deck about renewable energy adoption in Bangladesh"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-black"
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.desc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => generation.generate(prompt, theme)}
        disabled={generation.status === "generating"}
        className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {generation.status === "generating" ? "Generating..." : "Generate"}
      </button>

      <div className="border rounded p-4 bg-gray-50">
        <h2 className="font-semibold mb-3">Progress</h2>
        {generation.progress.length === 0 ? (
          <p className="text-sm text-gray-500">Waiting to start...</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {generation.progress.map((p, i) => (
              <li key={`${p.step}-${i}`} className="flex items-start gap-2">
                <span className="font-medium capitalize min-w-24">{p.step}:</span>
                <span className="text-gray-700">
                  {p.message} {p.detail && <span className="text-gray-500">({p.detail})</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {generation.result ? (
        <div className="border rounded p-4 bg-green-50 space-y-3">
          <p className="font-semibold text-green-900">
            ✓ Done: {generation.result.title} ({generation.result.slideCount} slides)
          </p>
          <div className="flex gap-3">
            {generation.result.hasPptx && (
              <a
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                href={`/api/export?id=${generation.result.deckId}`}
              >
                Download PPTX
              </a>
            )}
            {generation.result.hasWeb && (
              <Link
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                href={`/presentation/${generation.result.deckId}`}
              >
                Open Web Presentation
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {generation.error ? (
        <div className="border border-red-300 rounded p-4 bg-red-50">
          <p className="text-red-700 font-medium">Error:</p>
          <p className="text-red-600 text-sm mt-1">{generation.error}</p>
        </div>
      ) : null}
    </main>
  );
}
