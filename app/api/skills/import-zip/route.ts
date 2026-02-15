import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);

  // Find SKILL.md (could be at root or in a subfolder)
  let skillMd = "";
  let basePath = "";
  const scripts: { filename: string; content: string; language: string }[] = [];

  for (const [path] of Object.entries(zip.files)) {
    if (path.endsWith("SKILL.md")) {
      basePath = path.replace("SKILL.md", "");
      break;
    }
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const content = await entry.async("text");
    if (path === basePath + "SKILL.md") {
      skillMd = content;
    } else if (path.startsWith(basePath)) {
      const relativePath = path.slice(basePath.length);
      const ext = relativePath.split(".").pop()?.toLowerCase() || "";
      const langMap: Record<string, string> = {
        sh: "bash", bash: "bash", py: "python", js: "javascript",
        ts: "typescript", json: "json", yaml: "yaml", yml: "yaml",
      };
      scripts.push({ filename: relativePath, content, language: langMap[ext] || "plaintext" });
    }
  }

  // Parse frontmatter
  let name = basePath.replace(/\/$/, "") || "imported-skill";
  let description = "";
  const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const nameMatch = fmMatch[1].match(/name:\s*(.+)/);
    const descMatch = fmMatch[1].match(/description:\s*(.+)/);
    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
    // Strip frontmatter from body
    skillMd = skillMd.slice(fmMatch[0].length).trim();
  }

  return NextResponse.json({ name, description, skillMd, scripts });
}
