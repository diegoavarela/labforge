import type { RegistrySkill } from "@/types";

export async function searchSkills(query: string): Promise<RegistrySkill[]> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const res = await fetch(`/api/skills/search?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSkillContent(sourceUrl: string): Promise<string> {
  const res = await fetch(
    `/api/skills/content?url=${encodeURIComponent(sourceUrl)}`
  );
  if (!res.ok) return "";
  const data = await res.json();
  return data.content ?? "";
}
