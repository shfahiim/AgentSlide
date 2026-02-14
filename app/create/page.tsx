"use client";

import Link from "next/link";
import { useState } from "react";
import { useGeneration } from "@/lib/hooks/use-generation";

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const generation = useGeneration();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create presentation</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full min-h-40 border rounded p-3"
        placeholder="Create a 10-slide deck about renewable energy adoption in Bangladesh"
      />
      <button
        onClick={() => generation.generate(prompt)}
        disabled={generation.status === "generating"}
        className="px-4 py-2 bg-black text-white rounded"
      >
        {generation.status === "generating" ? "Generating..." : "Generate"}
      </button>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Progress</h2>
        <ul className="space-y-1 text-sm">
          {generation.progress.map((p, i) => (
            <li key={`${p.step}-${i}`}>{p.step}: {p.message} {p.detail ? `(${p.detail})` : ""}</li>
          ))}
        </ul>
      </div>

      {generation.result ? (
        <div className="space-y-2">
          <p>Done: {generation.result.title} ({generation.result.slideCount} slides)</p>
          {generation.result.hasPptx ? <a className="underline block" href={`/api/export?id=${generation.result.deckId}`}>Download PPTX</a> : null}
          {generation.result.hasWeb ? <Link className="underline block" href={`/presentation/${generation.result.deckId}`}>Open web presentation</Link> : null}
        </div>
      ) : null}

      {generation.error ? <p className="text-red-600">{generation.error}</p> : null}
    </main>
  );
}
