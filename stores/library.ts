import { create } from "zustand";
import { generateId } from "@/lib/utils/id";
import type { LibraryStore, SkillProjectData, SavedProject } from "@/types";

interface DbProject {
  id: string;
  name: string;
  pluginName?: string; // legacy compat
  data: SkillProjectData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function hasContent(data: SkillProjectData): boolean {
  return (data.skills?.length || 0) > 0;
}

function toSavedProject(row: DbProject): SavedProject {
  // Handle legacy data that may have old plugin fields
  const rawData = row.data as unknown as Record<string, unknown>;
  const data: SkillProjectData = {
    skillName: (rawData.skillName as string) || (rawData.pluginName as string) || row.name || row.pluginName || "",
    version: (rawData.version as string) || "0.1.0",
    skills: migrateSkills((rawData.skills as unknown[]) || []),
    changelog: (rawData.changelog as SkillProjectData["changelog"]) || [],
  };
  return {
    id: row.id,
    skillName: data.skillName,
    updatedAt: new Date(row.updatedAt).getTime(),
    data,
  };
}

/** Migrate old Skill format (content + files) to new (skillMd + scripts) */
function migrateSkills(skills: unknown[]): import("@/types").Skill[] {
  return (skills as Record<string, unknown>[]).map((s) => ({
    id: (s.id as string) || generateId(),
    name: (s.name as string) || "Untitled",
    description: (s.description as string) || "",
    skillMd: (s.skillMd as string) || (s.content as string) || "",
    scripts: migrateScripts(s),
    metadata: (s.metadata as Record<string, unknown>) || {},
    source: ((s.source as string) || "local") as "local" | "registry",
    sourceUrl: s.sourceUrl as string | undefined,
  }));
}

function migrateScripts(s: Record<string, unknown>): import("@/types").ScriptFile[] {
  // New format
  if (Array.isArray(s.scripts)) return s.scripts as import("@/types").ScriptFile[];
  // Old format: files array with {path, content, language}
  if (Array.isArray(s.files)) {
    return (s.files as { path: string; content: string; language: string }[]).map((f) => ({
      filename: f.path,
      content: f.content,
      language: f.language || f.path.split(".").pop() || "bash",
    }));
  }
  return [];
}

export const useLibraryStore = create<LibraryStore & { hydrate: () => Promise<void> }>()(
  (set, get) => ({
    projects: [],
    activeProjectId: null,

    hydrate: async () => {
      const [allRes, activeRes] = await Promise.all([
        fetch("/api/skills"),
        fetch("/api/skills/active"),
      ]);
      const allRows: DbProject[] = await allRes.json();
      const activeRow: DbProject | null = await activeRes.json();
      set({
        projects: allRows.map(toSavedProject),
        activeProjectId: activeRow?.id ?? null,
      });
    },

    saveCurrentProject: async (data: SkillProjectData) => {
      const { activeProjectId, projects } = get();
      const now = Date.now();

      if (activeProjectId) {
        const existing = projects.find((p) => p.id === activeProjectId);
        if (existing) {
          set({
            projects: projects.map((p) =>
              p.id === activeProjectId
                ? { ...p, skillName: data.skillName || "Untitled", updatedAt: now, data }
                : p
            ),
          });
          if (!existing._localOnly) {
            fetch(`/api/skills/${activeProjectId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: data.skillName || "Untitled", data, isActive: true }),
            });
          } else if (hasContent(data)) {
            const res = await fetch("/api/skills", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: data.skillName || "Untitled", data, isActive: true }),
            });
            const row: DbProject = await res.json();
            set((s) => ({
              activeProjectId: row.id,
              projects: s.projects.map((p) =>
                p.id === activeProjectId ? { ...toSavedProject(row), _localOnly: undefined } : p
              ),
            }));
            fetch("/api/skills/active", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: row.id }),
            });
          }
          return;
        }
      }

      if (!hasContent(data)) return;

      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.skillName || "Untitled", data, isActive: true }),
      });
      const row: DbProject = await res.json();
      const saved = toSavedProject(row);
      set({
        activeProjectId: saved.id,
        projects: [...get().projects, saved],
      });
    },

    loadProject: (id: string) => {
      return get().projects.find((p) => p.id === id);
    },

    deleteProject: async (id: string) => {
      const { projects, activeProjectId } = get();
      set({
        projects: projects.filter((p) => p.id !== id),
        activeProjectId: activeProjectId === id ? null : activeProjectId,
      });
      fetch(`/api/skills/${id}`, { method: "DELETE" });
    },

    createNewProject: () => {
      const tempId = generateId();
      const now = Date.now();
      const data: SkillProjectData = {
        skillName: "",
        version: "0.1.0",
        skills: [],
        changelog: [],
      };

      set((s) => ({
        activeProjectId: tempId,
        projects: [...s.projects, { id: tempId, skillName: "Untitled", updatedAt: now, data, _localOnly: true }],
      }));

      return tempId;
    },

    setActiveProjectId: (id: string | null) => {
      set({ activeProjectId: id });
      fetch("/api/skills/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },

    importAsNewProject: (data: SkillProjectData) => {
      const tempId = generateId();
      const now = Date.now();

      set((s) => ({
        activeProjectId: tempId,
        projects: [
          ...s.projects,
          { id: tempId, skillName: data.skillName || "Untitled", updatedAt: now, data },
        ],
      }));

      fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.skillName || "Untitled", data, isActive: true }),
      })
        .then((r) => r.json())
        .then((row: DbProject) => {
          set((s) => ({
            activeProjectId: row.id,
            projects: s.projects.map((p) => (p.id === tempId ? { ...p, id: row.id } : p)),
          }));
          fetch("/api/skills/active", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id }),
          });
        });

      return tempId;
    },
  })
);
