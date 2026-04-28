import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { DeckSpecSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid deck ID" }, { status: 400 });
  }

  const deckPath = join(process.cwd(), "output", id, "deck.json");

  try {
    const data = await readFile(deckPath, "utf-8");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(data) as unknown;
    } catch {
      return NextResponse.json({ error: "Deck JSON is invalid" }, { status: 422 });
    }

    const parsedDeck = DeckSpecSchema.safeParse(parsedJson);
    if (!parsedDeck.success) {
      return NextResponse.json(
        { error: "Invalid deck payload", detail: parsedDeck.error.issues[0]?.message },
        { status: 422 },
      );
    }
    return NextResponse.json(parsedDeck.data);
  } catch {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
}
