import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for fetching SKILL.md content.
 * Tries multiple path patterns because skills.sh IDs often don't match
 * the actual directory names in GitHub repos (e.g. "vercel-react-native-skills"
 * vs "react-native-skills").
 */
export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url") ?? "";
  if (!sourceUrl || !sourceUrl.includes("github.com")) {
    return NextResponse.json({ content: "" });
  }

  const raw = sourceUrl.includes("/tree/")
    ? sourceUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/tree/", "/")
    : sourceUrl.replace("github.com", "raw.githubusercontent.com") + "/main";

  const lastSeg = raw.split("/").pop() ?? "";

  // Build candidate URLs to try
  const candidates = [`${raw}/SKILL.md`];

  // If path doesn't have /skills/, try with it
  if (!raw.includes("/skills/")) {
    candidates.push(
      `${raw.replace(`/${lastSeg}`, `/skills/${lastSeg}`)}/SKILL.md`
    );
  }

  // Try stripping vendor prefixes: "vercel-foo-bar" → "foo-bar"
  const parts = lastSeg.split("-");
  for (let i = 1; i < parts.length - 1; i++) {
    const stripped = parts.slice(i).join("-");
    if (stripped !== lastSeg) {
      const base = raw.includes("/skills/")
        ? raw.replace(`/${lastSeg}`, `/${stripped}`)
        : raw.replace(`/${lastSeg}`, `/skills/${stripped}`);
      candidates.push(`${base}/SKILL.md`);
    }
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const content = await res.text();
        return NextResponse.json({ content });
      }
    } catch {
      // try next
    }
  }

  return NextResponse.json({ content: "" });
}
