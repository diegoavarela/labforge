import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export async function POST(req: Request) {
  try {
    const { name, skillMd, scripts } = await req.json();

    if (!name || !skillMd) {
      return NextResponse.json({ error: "name and skillMd are required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const baseDir = join(homedir(), ".openclaw", "workspace", "skills", slug);
    const scriptsDir = join(baseDir, "scripts");

    await mkdir(scriptsDir, { recursive: true });
    await writeFile(join(baseDir, "SKILL.md"), skillMd, "utf-8");

    if (Array.isArray(scripts)) {
      for (const script of scripts) {
        const filename = script.filename.replace(/^scripts\//, "");
        await writeFile(join(scriptsDir, filename), script.content, "utf-8");
      }
    }

    return NextResponse.json({ ok: true, path: baseDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
