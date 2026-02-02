import type { RegistryMCP } from "@/types";

export async function searchMCPs(query: string): Promise<RegistryMCP[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", "20");
  const res = await fetch(`/api/mcps/search?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMCPDetail(id: string): Promise<RegistryMCP | null> {
  const params = new URLSearchParams({ q: id, limit: "1" });
  const res = await fetch(`/api/mcps/search?${params.toString()}`);
  if (!res.ok) return null;
  const results: RegistryMCP[] = await res.json();
  return results.find((m) => m.id === id) ?? results[0] ?? null;
}
