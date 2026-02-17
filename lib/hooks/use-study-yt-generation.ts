"use client";

import { useCallback, useState } from "react";
import { PipelineProgress } from "@/lib/types";
import { createSseParser } from "@/lib/client/sse";

export interface StudyYtGenerationState {
  status: "idle" | "generating" | "complete" | "error";
  progress: PipelineProgress[];
  result?: { pageId: string; title: string; html: string; videoId?: string; videoUrl?: string };
  error?: string;
}

export function useStudyYtGeneration() {
  const [state, setState] = useState<StudyYtGenerationState>({
    status: "idle",
    progress: [],
  });

  const reset = useCallback(() => {
    setState({ status: "idle", progress: [] });
  }, []);

  const hydrate = useCallback((result: NonNullable<StudyYtGenerationState["result"]>) => {
    setState({ status: "complete", progress: [], result });
  }, []);

  const generate = useCallback(async (urlOrId: string) => {
    try {
      setState({ status: "generating", progress: [] });
      const res = await fetch("/api/generate-study-yt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlOrId }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        setState({
          status: "error",
          progress: [],
          error: errText || `Request failed (${res.status})`,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser((event, data) => {
        if (event === "progress") {
          setState((prev) => ({
            ...prev,
            progress: [...prev.progress, data as PipelineProgress],
          }));
        } else if (event === "complete") {
          setState((prev) => ({
            ...prev,
            status: "complete",
            result: data as StudyYtGenerationState["result"],
          }));
        } else if (event === "error") {
          const message =
            (data as { message?: string } | null)?.message ?? "Unknown error";
          setState((prev) => ({ ...prev, status: "error", error: message }));
        }
      });

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.consumeChunk(decoder.decode(value, { stream: true }));
      }
      parser.flush();
    } catch (error) {
      setState({ status: "error", progress: [], error: (error as Error).message });
    }
  }, []);

  return { ...state, generate, reset, hydrate };
}

