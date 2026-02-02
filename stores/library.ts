import { create } from "zustand";
import type { LibraryStore, PluginData, SavedPlugin } from "@/types";

interface DbPlugin {
  id: string;
  pluginName: string;
  data: PluginData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function hasContent(data: PluginData): boolean {
  return (data.skills?.length + data.agents?.length + data.commands?.length + data.hooks?.length + data.mcps?.length) > 0;
}

function toSavedPlugin(row: DbPlugin): SavedPlugin {
  return {
    id: row.id,
    pluginName: row.pluginName,
    updatedAt: new Date(row.updatedAt).getTime(),
    data: row.data as PluginData,
  };
}

export const useLibraryStore = create<LibraryStore & { hydrate: () => Promise<void> }>()(
  (set, get) => ({
    plugins: [],
    activePluginId: null,

    hydrate: async () => {
      const [allRes, activeRes] = await Promise.all([
        fetch("/api/plugins"),
        fetch("/api/plugins/active"),
      ]);
      const allRows: DbPlugin[] = await allRes.json();
      const activeRow: DbPlugin | null = await activeRes.json();
      set({
        plugins: allRows.map(toSavedPlugin),
        activePluginId: activeRow?.id ?? null,
      });
    },

    saveCurrentPlugin: async (data: PluginData) => {
      const { activePluginId, plugins } = get();
      const now = Date.now();

      if (activePluginId) {
        const existing = plugins.find((p) => p.id === activePluginId);
        if (existing) {
          // Update in-memory state always
          set({
            plugins: plugins.map((p) =>
              p.id === activePluginId
                ? { ...p, pluginName: data.pluginName || "Untitled", updatedAt: now, data }
                : p
            ),
          });
          // Only persist to DB if plugin is already persisted (not a temp id) or has content
          if (!existing._localOnly) {
            fetch(`/api/plugins/${activePluginId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pluginName: data.pluginName || "Untitled", data, isActive: true }),
            });
          } else if (hasContent(data)) {
            // First time this plugin has content — persist it now
            const res = await fetch("/api/plugins", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pluginName: data.pluginName || "Untitled", data, isActive: true }),
            });
            const row: DbPlugin = await res.json();
            set((s) => ({
              activePluginId: row.id,
              plugins: s.plugins.map((p) =>
                p.id === activePluginId ? { ...toSavedPlugin(row), _localOnly: undefined } : p
              ),
            }));
            fetch("/api/plugins/active", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: row.id }),
            });
          }
          return;
        }
      }

      // No active plugin — only create if there's content
      if (!hasContent(data)) return;

      const res = await fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginName: data.pluginName || "Untitled", data, isActive: true }),
      });
      const row: DbPlugin = await res.json();
      const saved = toSavedPlugin(row);
      set({
        activePluginId: saved.id,
        plugins: [...get().plugins, saved],
      });
    },

    loadPlugin: (id: string) => {
      return get().plugins.find((p) => p.id === id);
    },

    deletePlugin: async (id: string) => {
      const { plugins, activePluginId } = get();
      set({
        plugins: plugins.filter((p) => p.id !== id),
        activePluginId: activePluginId === id ? null : activePluginId,
      });
      fetch(`/api/plugins/${id}`, { method: "DELETE" });
    },

    createNewPlugin: () => {
      const tempId = crypto.randomUUID();
      const now = Date.now();
      const data: PluginData = {
        pluginName: "",
        version: "0.1.0",
        skills: [],
        agents: [],
        commands: [],
        hooks: [],
        mcps: [],
        changelog: [],
        dependencies: [],
      };

      // Only add to local state — will be persisted to DB when it gets content
      set((s) => ({
        activePluginId: tempId,
        plugins: [...s.plugins, { id: tempId, pluginName: "Untitled", updatedAt: now, data, _localOnly: true }],
      }));

      return tempId;
    },

    setActivePluginId: (id: string | null) => {
      set({ activePluginId: id });
      fetch("/api/plugins/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },

    importAsNewPlugin: (data: PluginData) => {
      const tempId = crypto.randomUUID();
      const now = Date.now();

      set((s) => ({
        activePluginId: tempId,
        plugins: [
          ...s.plugins,
          { id: tempId, pluginName: data.pluginName || "Untitled", updatedAt: now, data },
        ],
      }));

      fetch("/api/plugins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginName: data.pluginName || "Untitled", data, isActive: true }),
      })
        .then((r) => r.json())
        .then((row: DbPlugin) => {
          set((s) => ({
            activePluginId: row.id,
            plugins: s.plugins.map((p) => (p.id === tempId ? { ...p, id: row.id } : p)),
          }));
          fetch("/api/plugins/active", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id }),
          });
        });

      return tempId;
    },
  })
);
