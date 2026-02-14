"use client";

import { useCallback, useState } from "react";
import { PipelineProgress } from "@/lib/types";

export interface GenerationState {
  status: "idle" | "generating" | "complete" | "error";
  progress: PipelineProgress[];
  result?: { deckId: string; title: string; slideCount: number; hasPptx: boolean; hasWeb: boolean };
  error?: string;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({ status: "idle", progress: [] });

  const reset = useCallback(() => {
    setState({ status: "idle", progress: [] });
  }, []);

  const hydrate = useCallback((result: NonNullable<GenerationState["result"]>) => {
    setState({ status: "complete", progress: [], result });
  }, []);

  const generate = useCallback(async (prompt: string, approvedPlan?: unknown) => {
    try {
      setState({ status: "generating", progress: [] });
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, approvedPlan }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        setState({ status: "error", progress: [], error: errText || `Request failed (${res.status})` });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("event: ")) currentEvent = line.slice(7);
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "progress") {
                setState((prev) => ({ ...prev, progress: [...prev.progress, data] }));
              } else if (currentEvent === "complete") {
                setState((prev) => ({ ...prev, status: "complete", result: data }));
              } else if (currentEvent === "error") {
                setState((prev) => ({ ...prev, status: "error", error: data.message }));
              }
            }
          }
        }
      }
    } catch (error) {
      setState({ status: "error", progress: [], error: (error as Error).message });
    }
  }, []);

  return { ...state, generate, reset, hydrate };
}
