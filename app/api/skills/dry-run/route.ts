import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { filename, content } = await req.json();
  if (!filename || !content) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const tmpDir = join(tmpdir(), `labforge-dryrun-${Date.now()}`);
  const scriptPath = join(tmpDir, filename.split("/").pop() || "script.sh");

  try {
    await mkdir(tmpDir, { recursive: true });
    await writeFile(scriptPath, content, { mode: 0o755 });

    // Detect language and run with appropriate interpreter
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    let cmd: string;
    switch (ext) {
      case "py":
        cmd = `python3 "${scriptPath}" --dry-run 2>&1 || python3 "${scriptPath}" 2>&1`;
        break;
      case "js":
        cmd = `node "${scriptPath}" --dry-run 2>&1 || node "${scriptPath}" 2>&1`;
        break;
      case "ts":
        cmd = `npx tsx "${scriptPath}" --dry-run 2>&1 || npx tsx "${scriptPath}" 2>&1`;
        break;
      default: // sh, bash
        cmd = `bash -n "${scriptPath}" 2>&1 && echo "✓ Syntax OK" && echo "--- Dry run (set -n) ---" && bash "${scriptPath}" --dry-run 2>&1 || echo "Script exited with errors"`;
        break;
    }

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 10000,
      env: { ...process.env, DRY_RUN: "1", LABFORGE_DRY_RUN: "1" },
    });

    return NextResponse.json({
      output: stdout || stderr || "No output",
      exitCode: 0,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "stdout" in err) {
      const e = err as { stdout: string; stderr: string; code: number };
      return NextResponse.json({
        output: e.stdout || e.stderr || "Script failed",
        exitCode: e.code || 1,
      });
    }
    const message = err instanceof Error ? err.message : "Execution failed";
    return NextResponse.json({ output: message, exitCode: 1 });
  }
}
