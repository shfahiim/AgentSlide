import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing deck ID" }, { status: 400 });
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid deck ID" }, { status: 400 });

  try {
    const file = await readFile(join(process.cwd(), "output", id, "presentation.pptx"));
    return new Response(file, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="presentation-${id.slice(0, 8)}.pptx"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "PPTX not found" }, { status: 404 });
  }
}
