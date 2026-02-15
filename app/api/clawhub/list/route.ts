import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

export async function GET() {
  const workdir = join(homedir(), ".openclaw", "workspace");
  try {
    const { stdout } = await execAsync(`clawhub list --workdir "${workdir}"`, { timeout: 15000 });
    const installed = stdout
      .trim()
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const match = line.match(/^(\S+)\s*(.*)$/);
        return match ? { slug: match[1], info: match[2].trim() } : { slug: line.trim(), info: "" };
      });
    return NextResponse.json({ installed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "List failed";
    return NextResponse.json({ installed: [], error: message }, { status: 500 });
  }
}
