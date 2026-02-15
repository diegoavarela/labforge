import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  try {
    const { stdout } = await execAsync(`clawhub search "${query.replace(/"/g, '\\"')}"`, {
      timeout: 15000,
    });
    // Parse clawhub search output - each result is typically: name - description
    const results = stdout
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^(\S+)\s*[-–]\s*(.*)$/);
        if (match) {
          return { slug: match[1], name: match[1], description: match[2].trim() };
        }
        return { slug: line.trim(), name: line.trim(), description: "" };
      });
    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ results: [], error: message }, { status: 500 });
  }
}
