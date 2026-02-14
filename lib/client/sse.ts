export type SseHandler = (event: string, data: unknown) => void;

export function createSseParser(onEvent: SseHandler) {
  let buffer = "";
  let currentEvent = "";

  const consumeChunk = (text: string) => {
    buffer += text;

    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split(/\r?\n/);
      let eventName = currentEvent;

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice("event:".length).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const payload = line.slice("data:".length).trim();
          try {
            onEvent(eventName, JSON.parse(payload));
          } catch {
            // ignore malformed event payloads
          }
        }
      }

      currentEvent = eventName;
    }
  };

  const flush = () => {
    // If the stream ends without a final blank line, try to parse what we have.
    const trimmed = buffer.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/\r?\n\r?\n/);
    buffer = "";
    for (const part of parts) {
      const lines = part.split(/\r?\n/);
      let eventName = currentEvent;
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice("event:".length).trim();
        if (line.startsWith("data:")) {
          const payload = line.slice("data:".length).trim();
          try {
            onEvent(eventName, JSON.parse(payload));
          } catch {
            // ignore
          }
        }
      }
      currentEvent = eventName;
    }
  };

  return { consumeChunk, flush };
}

