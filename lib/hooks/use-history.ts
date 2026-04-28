"use client";

import { useCallback, useEffect, useState } from "react";

export type HistoryMode = "slides" | "webpage" | "knowledge-graph";

export interface HistoryListItem {
  id: string;
  mode: HistoryMode;
  title: string;
  prompt?: string;
  createdAt: number;
  subtitle?: string;
  hasPptx?: boolean;
}

export function useHistory() {
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(undefined);
    try {
      const res = await fetch("/api/history", { method: "GET" });
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
      const json = (await res.json()) as { items: HistoryListItem[] };
      setItems(Array.isArray(json.items) ? json.items : []);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, status, error, refresh };
}
