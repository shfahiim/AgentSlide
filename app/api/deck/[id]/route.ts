import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

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
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
}
