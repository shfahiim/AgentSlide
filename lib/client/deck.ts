import { DeckSpecSchema } from "@/lib/schemas";
import { DeckSpec } from "@/lib/types";

export type DeckFetchResult =
  | { status: "ok"; deck: DeckSpec }
  | { status: "not_found" }
  | { status: "invalid"; error: string }
  | { status: "error"; error: string };

export async function fetchDeckSpec(deckId: string): Promise<DeckFetchResult> {
  try {
    const res = await fetch(`/api/deck/${deckId}`);
    if (!res.ok) {
      if (res.status === 404) return { status: "not_found" };
      return { status: "error", error: `Deck request failed (${res.status})` };
    }

    const payload = (await res.json()) as unknown;
    const parsed = DeckSpecSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        status: "invalid",
        error: parsed.error.issues[0]?.message ?? "Invalid deck payload",
      };
    }

    return { status: "ok", deck: parsed.data };
  } catch (error) {
    return {
      status: "error",
      error: (error as Error).message || "Deck request failed",
    };
  }
}
