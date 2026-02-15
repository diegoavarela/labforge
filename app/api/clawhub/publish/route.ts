import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { slug, name, version, changelog, skillMd, scripts } = await req.json();
  if (!slug || !skillMd) return NextResponse.json({ error: "Missing slug or skillMd" }, { status: 400 });

  // Write skill to temp directory for publishing
  const tmpDir = join(tmpdir(), `labforge-publish-${slug}-${Date.now()}`);
  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "SKILL.md"), skillMd, "utf-8");

    // Write scripts
    if (scripts && Array.isArray(scripts)) {
      for (const script of scripts) {
        const scriptPath = join(tmpDir, script.filename);
        const scriptDir = join(tmpDir, script.filename.split("/").slice(0, -1).join("/"));
        if (scriptDir !== tmpDir) await mkdir(scriptDir, { recursive: true });
        await writeFile(scriptPath, script.content, "utf-8");
      }
    }

    const changelogFlag = changelog ? ` --changelog "${changelog.replace(/"/g, '\\"')}"` : "";
    const versionFlag = version ? ` --version ${version}` : "";
    const nameFlag = name ? ` --name "${name.replace(/"/g, '\\"')}"` : "";

    const { stdout } = await execAsync(
      `clawhub publish "${tmpDir}" --slug ${slug}${nameFlag}${versionFlag}${changelogFlag}`,
      { timeout: 30000 }
    );

    return NextResponse.json({ success: true, output: stdout.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
