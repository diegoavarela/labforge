import { NextRequest, NextResponse } from "next/server";
import type { RegistrySkill } from "@/types";

interface CacheEntry {
  data: RegistrySkill[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 60 * 60 * 1000; // 1 hour

function getCached(key: string): RegistrySkill[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < TTL) return entry.data;
  return null;
}

function setCache(key: string, data: RegistrySkill[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── skills.sh API ──────────────────────────────────────────────

interface SkillsShItem {
  id: string;
  name: string;
  installs: number;
  topSource: string;
}

async function fetchSkillsSh(query: string): Promise<RegistrySkill[]> {
  try {
    const res = await fetch("https://skills.sh/api/skills?limit=100", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const body = await res.json();
    const items: SkillsShItem[] = body.skills ?? [];

    const q = query.toLowerCase();
    const filtered = q
      ? items.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.topSource && s.topSource.toLowerCase().includes(q))
        )
      : items;

    // Build GitHub URL from topSource (owner/repo) + skill id
    // SKILL.md lives at: github.com/{topSource}/tree/main/skills/{id}
    const results: RegistrySkill[] = filtered.slice(0, 20).map((s) => {
      const ghUrl = s.topSource
        ? `https://github.com/${s.topSource}/tree/main/skills/${s.id}`
        : `https://skills.sh/i/${s.id}`;
      return {
        name: s.name,
        description: "",
        source: "skills.sh",
        sourceUrl: ghUrl,
        categories: [],
        installs: s.installs,
      };
    });

    // Fetch descriptions via our content API proxy (handles ID→dir mismatch)
    const withDesc = await Promise.allSettled(
      results.map(async (skill) => {
        if (!skill.sourceUrl.includes("github.com")) return skill;
        try {
          const raw = skill.sourceUrl
            .replace("github.com", "raw.githubusercontent.com")
            .replace("/tree/", "/");
          const lastSeg = raw.split("/").pop() ?? "";
          const candidates = [`${raw}/SKILL.md`];
          // Try stripping vendor prefix segments
          const parts = lastSeg.split("-");
          for (let i = 1; i < parts.length - 1; i++) {
            const stripped = parts.slice(i).join("-");
            if (stripped !== lastSeg) {
              candidates.push(
                `${raw.replace(`/${lastSeg}`, `/${stripped}`)}/SKILL.md`
              );
            }
          }
          for (const url of candidates) {
            const mdRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (mdRes.ok) {
              const text = await mdRes.text();
              const lines = text.split("\n").filter((l) => l.trim());
              const desc = lines.find(
                (l) => !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("```")
              );
              if (desc) skill.description = desc.trim().slice(0, 200);
              break;
            }
          }
        } catch {
          // ignore
        }
        return skill;
      })
    );

    return withDesc
      .filter((r): r is PromiseFulfilledResult<RegistrySkill> => r.status === "fulfilled")
      .map((r) => r.value);
  } catch {
    return [];
  }
}

// ── anthropics/skills GitHub API ───────────────────────────────

async function fetchGitHub(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return fetch(url, { headers, signal: AbortSignal.timeout(8000) });
}

async function fetchAnthropicSkills(query: string): Promise<RegistrySkill[]> {
  try {
    const res = await fetchGitHub(
      "https://api.github.com/repos/anthropics/skills/contents"
    );
    if (!res.ok) return [];

    const contents: { name: string; type: string }[] = await res.json();
    const dirs = contents
      .filter(
        (c) =>
          c.type === "dir" &&
          !c.name.startsWith(".") &&
          !c.name.startsWith("_")
      )
      .slice(0, 30);

    const skills: RegistrySkill[] = dirs.map((dir) => ({
      name: dir.name,
      description: "",
      source: "anthropics",
      sourceUrl: `https://github.com/anthropics/skills/tree/main/${dir.name}`,
      categories: [],
    }));

    if (!query) return skills;
    const q = query.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(q));
  } catch {
    return [];
  }
}

// ── Main handler ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const cacheKey = `skills:${q}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Fetch from all sources in parallel
  const [skillsSh, anthropic] = await Promise.all([
    fetchSkillsSh(q),
    fetchAnthropicSkills(q),
  ]);

  // Merge, dedup by name
  const byName = new Map<string, RegistrySkill>();
  // skills.sh first (has more data)
  for (const s of skillsSh) {
    byName.set(s.name.toLowerCase(), s);
  }
  for (const s of anthropic) {
    const key = s.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, s);
    }
  }

  // Sort by installs descending
  const results = Array.from(byName.values()).sort(
    (a, b) => (b.installs ?? 0) - (a.installs ?? 0)
  );

  setCache(cacheKey, results);
  return NextResponse.json(results);
}
