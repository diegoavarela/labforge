import { NextRequest, NextResponse } from "next/server";
import type { RegistryMCP } from "@/types";

const REGISTRY_URL = "https://registry.modelcontextprotocol.io/v0/servers";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: RegistryMCP[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): RegistryMCP[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: RegistryMCP[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

function normalize(raw: Record<string, unknown>): RegistryMCP {
  // Extract repository URL (may be nested object { url, source } or string)
  const repo = raw.repository;
  const repoUrl =
    typeof repo === "string"
      ? repo
      : repo && typeof repo === "object" && "url" in repo
        ? String((repo as Record<string, unknown>).url ?? "")
        : "";

  // Extract transport types from packages[].transport.type or remotes[].type
  const transports: string[] = [];
  if (Array.isArray(raw.packages)) {
    for (const pkg of raw.packages) {
      const t = (pkg as Record<string, unknown>).transport;
      if (t && typeof t === "object" && "type" in (t as Record<string, unknown>)) {
        transports.push(String((t as Record<string, unknown>).type));
      }
    }
  }
  if (Array.isArray(raw.remotes)) {
    for (const r of raw.remotes) {
      const type = (r as Record<string, unknown>).type;
      if (type) transports.push(String(type));
    }
  }
  if (Array.isArray(raw.transport)) {
    transports.push(...raw.transport.map(String));
  } else if (typeof raw.transport === "string") {
    transports.push(raw.transport);
  }
  if (transports.length === 0) transports.push("stdio");

  // Deduplicate transports
  const uniqueTransports = [...new Set(transports)];

  // Friendly display name: strip org prefix like "ai.foo/bar" -> "bar", or use as-is
  const rawName = String(raw.name ?? raw.display_name ?? "Unknown");
  const displayName = rawName.includes("/") ? rawName.split("/").pop()! : rawName;

  return {
    id: String(raw.id ?? raw.name ?? ""),
    name: displayName,
    description: String(raw.description ?? ""),
    source: String(raw.source_url ?? repoUrl ?? raw.url ?? ""),
    categories: Array.isArray(raw.categories)
      ? raw.categories.map(String)
      : Array.isArray(raw.tags)
        ? raw.tags.map(String)
        : [],
    transport: uniqueTransports,
    installCommand: String(raw.install_command ?? raw.installCommand ?? ""),
    authType: raw.auth_type ? String(raw.auth_type) : undefined,
    tools: Array.isArray(raw.tools)
      ? raw.tools.map((t: Record<string, unknown>) => ({
          name: String(t.name ?? ""),
          description: String(t.description ?? ""),
          inputSchema: (t.inputSchema ?? t.input_schema ?? {}) as Record<string, unknown>,
          enabled: true,
        }))
      : [],
    isOfficial: Boolean(raw.is_official ?? raw.isOfficial ?? false),
    stars: typeof raw.stars === "number" ? raw.stars : undefined,
    downloads: typeof raw.downloads === "number" ? raw.downloads : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const cacheKey = `${q}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    params.set("limit", String(limit));

    const res = await fetch(`${REGISTRY_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const body = await res.json();
    const rawItems = Array.isArray(body) ? body : Array.isArray(body.servers) ? body.servers : [];
    // The registry wraps each entry as { server: {...}, _meta: {...} }
    const items = rawItems.map((item: Record<string, unknown>) =>
      item.server && typeof item.server === "object" ? item.server : item
    );
    // Deduplicate by display name, merging transports
    const byName = new Map<string, RegistryMCP>();
    for (const item of items.slice(0, limit * 2)) {
      const n = normalize(item as Record<string, unknown>);
      const key = n.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        // Merge unique transports
        for (const t of n.transport) {
          if (!existing.transport.includes(t)) existing.transport.push(t);
        }
      } else {
        if (!n.id) n.id = `mcp-${byName.size}`;
        byName.set(key, n);
      }
    }
    const normalized = Array.from(byName.values()).slice(0, limit);

    setCache(cacheKey, normalized);
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
