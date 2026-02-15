import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { skillMd } = await req.json();
  if (!skillMd) return NextResponse.json({ error: "Missing skillMd" }, { status: 400 });

  // Extract required bins from frontmatter metadata
  const bins: string[] = [];

  // Match requires.bins in YAML/JSON frontmatter
  const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const binsMatch = fmMatch[1].match(/bins["\s]*:\s*\[([^\]]+)\]/);
    if (binsMatch) {
      bins.push(...binsMatch[1].split(",").map((b: string) => b.replace(/["\s]/g, "")).filter(Boolean));
    }
  }

  // Also scan for ```bash blocks with common CLI patterns
  const codeBlocks = skillMd.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g);
  const commonClis = new Set<string>();
  for (const block of codeBlocks) {
    const lines = block[1].split("\n");
    for (const line of lines) {
      const cmdMatch = line.trim().match(/^(\w[\w-]*)\s/);
      if (cmdMatch) {
        const cmd = cmdMatch[1];
        if (!["echo", "set", "cd", "if", "then", "fi", "do", "done", "for", "while", "export", "local", "return"].includes(cmd)) {
          commonClis.add(cmd);
        }
      }
    }
  }

  // Combine bins from frontmatter + code blocks
  const allBins = [...new Set([...bins, ...commonClis])];

  // Check which are installed
  const results = await Promise.all(
    allBins.map(async (bin) => {
      try {
        await execAsync(`which ${bin}`, { timeout: 3000 });
        return { bin, installed: true };
      } catch {
        return { bin, installed: false };
      }
    })
  );

  return NextResponse.json({
    dependencies: results,
    missing: results.filter((r) => !r.installed).map((r) => r.bin),
    found: results.filter((r) => r.installed).map((r) => r.bin),
  });
}
