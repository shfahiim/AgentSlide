import { readFile } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSafeFileName(name: string) {
  // Prevent traversal and keep filenames manageable.
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(name);
}

function contentTypeForExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deckId: string; file: string }> },
) {
  const { deckId, file } = await params;

  if (!UUID_RE.test(deckId)) {
    return NextResponse.json({ error: "Invalid deck ID" }, { status: 400 });
  }

  // `file` is URL-decoded by Next routing; validate after decode.
  if (!isSafeFileName(file)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const ext = extname(file);
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext.toLowerCase())) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const fullPath = join(process.cwd(), "output", deckId, "assets", file);
    const bytes = await readFile(fullPath);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentTypeForExt(ext),
        // Filenames are unique per generation, so immutable caching is safe.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}

