import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const { name, skillMd, scripts } = await req.json();
  if (!name || !skillMd) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const zip = new JSZip();
  const folder = zip.folder(name)!;
  folder.file("SKILL.md", skillMd);

  if (scripts && Array.isArray(scripts)) {
    for (const s of scripts) {
      folder.file(s.filename, s.content);
    }
  }

  const blob = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(blob as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}.zip"`,
    },
  });
}
