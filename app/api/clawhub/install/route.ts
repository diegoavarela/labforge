import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { slug, version } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const workdir = join(homedir(), ".openclaw", "workspace");
  const versionFlag = version ? ` --version ${version}` : "";

  try {
    const { stdout } = await execAsync(
      `clawhub install ${slug}${versionFlag} --workdir "${workdir}"`,
      { timeout: 30000 }
    );

    // Try to read the installed SKILL.md
    const skillDir = join(workdir, "skills", slug);
    let skillMd = "";
    try {
      skillMd = await readFile(join(skillDir, "SKILL.md"), "utf-8");
    } catch {}

    return NextResponse.json({ success: true, output: stdout.trim(), skillMd, path: skillDir });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Install failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
