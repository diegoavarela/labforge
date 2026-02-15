import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import * as tar from "tar";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname } from "path";
import { Readable } from "stream";

interface ParsedSkill {
  name: string;
  description: string;
  version: string;
  skillMd: string;
  scripts: { filename: string; content: string; language: string }[];
}

const LANG_MAP: Record<string, string> = {
  sh: "bash", bash: "bash", py: "python", js: "javascript",
  ts: "typescript", json: "json", yaml: "yaml", yml: "yaml",
  md: "markdown", txt: "plaintext", toml: "toml", cfg: "plaintext",
};

function getLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "plaintext";
}

function parseFrontmatter(skillMd: string): { name: string; description: string; version: string; body: string } {
  let name = "imported-skill";
  let description = "";
  let version = "0.1.0";
  let body = skillMd;

  const fmMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    const descMatch = fm.match(/description:\s*(.+)/);
    const verMatch = fm.match(/version:\s*(.+)/);
    if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, "");
    if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, "");
    if (verMatch) version = verMatch[1].trim().replace(/^["']|["']$/g, "");
    body = skillMd.slice(fmMatch[0].length).trim();
  }

  return { name, description, version, body };
}

async function parseZip(buffer: Buffer): Promise<ParsedSkill> {
  const zip = await JSZip.loadAsync(buffer);
  let skillMdContent = "";
  let basePath = "";
  const scripts: ParsedSkill["scripts"] = [];

  // Find SKILL.md
  for (const path of Object.keys(zip.files)) {
    if (path.endsWith("SKILL.md") && !path.includes("__MACOSX")) {
      basePath = path.replace("SKILL.md", "");
      break;
    }
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || path.includes("__MACOSX")) continue;
    const content = await entry.async("text");
    if (path === basePath + "SKILL.md") {
      skillMdContent = content;
    } else if (path.startsWith(basePath) && path !== basePath) {
      const relativePath = path.slice(basePath.length);
      scripts.push({ filename: relativePath, content, language: getLang(relativePath) });
    }
  }

  const { name, description, version, body } = parseFrontmatter(skillMdContent);
  return { name: name || basePath.replace(/\/$/, "") || "imported-skill", description, version, skillMd: body || skillMdContent, scripts };
}

async function parseTar(buffer: Buffer): Promise<ParsedSkill> {
  const files: Map<string, string> = new Map();

  await new Promise<void>((resolve, reject) => {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const entries: Promise<void>[] = [];
    stream
      .pipe(tar.t())
      .on("entry", (entry) => {
        const chunks: Buffer[] = [];
        const p = new Promise<void>((res) => {
          entry.on("data", (chunk: Buffer) => chunks.push(chunk));
          entry.on("end", () => {
            if (entry.type === "File") {
              files.set(entry.path, Buffer.concat(chunks).toString("utf-8"));
            }
            res();
          });
        });
        entries.push(p);
      })
      .on("end", async () => {
        await Promise.all(entries);
        resolve();
      })
      .on("error", reject);
  });

  // Find SKILL.md
  let basePath = "";
  for (const path of files.keys()) {
    if (path.endsWith("SKILL.md")) {
      basePath = path.replace("SKILL.md", "");
      break;
    }
  }

  let skillMdContent = "";
  const scripts: ParsedSkill["scripts"] = [];

  for (const [path, content] of files) {
    if (path === basePath + "SKILL.md") {
      skillMdContent = content;
    } else if (path.startsWith(basePath) && path !== basePath) {
      const relativePath = path.slice(basePath.length);
      scripts.push({ filename: relativePath, content, language: getLang(relativePath) });
    }
  }

  const { name, description, version, body } = parseFrontmatter(skillMdContent);
  return { name: name || basePath.replace(/\/$/, "") || "imported-skill", description, version, skillMd: body || skillMdContent, scripts };
}

function parseFolder(folderPath: string): ParsedSkill {
  if (!existsSync(folderPath)) throw new Error(`Path does not exist: ${folderPath}`);
  const stat = statSync(folderPath);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${folderPath}`);

  const skillMdPath = join(folderPath, "SKILL.md");
  if (!existsSync(skillMdPath)) throw new Error(`No SKILL.md found in ${folderPath}`);

  const skillMdContent = readFileSync(skillMdPath, "utf-8");
  const scripts: ParsedSkill["scripts"] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (entry === "SKILL.md" && dir === folderPath) continue;
      if (entry.startsWith(".") || entry === "node_modules") continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else {
        const rel = relative(folderPath, full);
        try {
          const content = readFileSync(full, "utf-8");
          scripts.push({ filename: rel, content, language: getLang(rel) });
        } catch {
          // skip binary files
        }
      }
    }
  }

  walk(folderPath);

  const { name, description, version, body } = parseFrontmatter(skillMdContent);
  return { name: name || folderPath.split("/").pop() || "imported-skill", description, version, skillMd: body || skillMdContent, scripts };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Folder import via JSON
    if (contentType.includes("application/json")) {
      const { folderPath } = await req.json();
      if (!folderPath) return NextResponse.json({ error: "Missing folderPath" }, { status: 400 });
      const result = parseFolder(folderPath);
      return NextResponse.json(result);
    }

    // File import via FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    let result: ParsedSkill;
    if (fileName.endsWith(".zip")) {
      result = await parseZip(buffer);
    } else if (fileName.endsWith(".tar.gz") || fileName.endsWith(".tgz") || fileName.endsWith(".tar")) {
      result = await parseTar(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .zip, .tar, .tar.gz, or .tgz" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
