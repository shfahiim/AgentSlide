import { AsyncLocalStorage } from "node:async_hooks";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type TraceLevel = "debug" | "info" | "warn" | "error";

export type TraceEvent = {
  seq: number;
  ts: number;
  deckId: string;
  level: TraceLevel;
  name: string;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

export type TraceWriter = {
  write: (evt: Omit<TraceEvent, "seq" | "ts"> & Partial<Pick<TraceEvent, "ts">>) => void;
  close: () => Promise<void>;
  filePath: string;
};

type TraceContext = {
  deckId: string;
  writer: TraceWriter;
  sendToClient?: (evt: TraceEvent) => void;
};

const storage = new AsyncLocalStorage<TraceContext>();

export function withTraceContext<T>(ctx: TraceContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getTraceContext() {
  return storage.getStore();
}

export function traceLog(
  name: string,
  opts?: {
    level?: TraceLevel;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
  },
) {
  const ctx = storage.getStore();
  if (!ctx) return;
  const level = opts?.level ?? "info";
  ctx.writer.write({
    deckId: ctx.deckId,
    level,
    name,
    message: opts?.message,
    data: opts?.data,
  });
}

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ _unserializable: true });
  }
}

export function previewText(input: unknown, maxChars = 400) {
  if (input == null) return "";
  const text = typeof input === "string" ? input : safeJsonStringify(input);
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}…`;
}

export async function createTraceWriter(opts: {
  deckId: string;
  filePath: string;
  alsoConsole?: boolean;
  sendToClient?: (evt: TraceEvent) => void;
}): Promise<{ ctx: TraceContext; writer: TraceWriter }> {
  await mkdir(dirname(opts.filePath), { recursive: true });
  const stream = createWriteStream(opts.filePath, { flags: "a" });

  let seq = 0;
  const alsoConsole = opts.alsoConsole ?? true;

  const writer: TraceWriter = {
    filePath: opts.filePath,
    write: (evt) => {
      const full: TraceEvent = {
        seq: ++seq,
        ts: evt.ts ?? Date.now(),
        deckId: evt.deckId,
        level: evt.level,
        name: evt.name,
        message: evt.message,
        data: evt.data,
      };

      stream.write(`${safeJsonStringify(full)}\n`);
      opts.sendToClient?.(full);

      if (alsoConsole) {
        const msg = full.message ? ` ${full.message}` : "";
        // Keep console output compact; full details are in the JSONL file.
        const line = `[trace:${full.deckId}] ${full.level.toUpperCase()} ${full.name}${msg}`;
        // eslint-disable-next-line no-console
        if (full.level === "error") console.error(line);
        // eslint-disable-next-line no-console
        else if (full.level === "warn") console.warn(line);
        // eslint-disable-next-line no-console
        else console.log(line);
      }
    },
    close: async () =>
      new Promise<void>((resolve) => {
        stream.end(() => resolve());
      }),
  };

  const ctx: TraceContext = { deckId: opts.deckId, writer, sendToClient: opts.sendToClient };
  return { ctx, writer };
}

