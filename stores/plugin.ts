import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  PluginStore,
  PluginData,
  PluginState,
  ChangelogEntry,
  Skill,
  Agent,
  MCP,
  Command,
  Hook,
  ChatMessage,
  ItemType,
  Theme,
  ParsedPlugin,
  PluginDependency,
} from "@/types";

function trackChange(state: PluginState, change: string): { version: string; changelog: ChangelogEntry[] } {
  const parts = state.version.split(".").map(Number);
  parts[2]++;
  const newVersion = parts.join(".");

  const latestEntry = state.changelog[0];
  const now = Date.now();

  if (latestEntry && (now - latestEntry.timestamp) < 5 * 60 * 1000) {
    return {
      version: newVersion,
      changelog: [
        { ...latestEntry, version: newVersion, changes: [...latestEntry.changes, change] },
        ...state.changelog.slice(1),
      ],
    };
  }

  return {
    version: newVersion,
    changelog: [
      { version: newVersion, timestamp: now, changes: [change] },
      ...state.changelog,
    ],
  };
}

// Debounced sync to API
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSyncToApi() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { useLibraryStore } = require("@/stores/library");
    const lib = useLibraryStore.getState();
    if (lib.activePluginId) {
      const pluginData = usePluginStore.getState().getPluginData();
      lib.saveCurrentPlugin(pluginData);
    }
  }, 1000);
}

export const usePluginStore = create<PluginStore & { hydrate: (data: PluginData) => void }>()(
  subscribeWithSelector(
    (set, get) => ({
      pluginName: "",
      version: "0.1.0",
      skills: [],
      agents: [],
      commands: [],
      hooks: [],
      mcps: [],
      selectedItemId: null,
      selectedItemType: null,
      theme: "dark",
      inventoryCollapsed: false,
      rightPanelCollapsed: false,
      chatMessages: [],
      changelog: [],
      dependencies: [],
      githubRepo: null,

      hydrate: (data: PluginData) =>
        set({
          pluginName: data.pluginName,
          version: data.version,
          skills: data.skills,
          agents: data.agents,
          commands: data.commands,
          hooks: data.hooks,
          mcps: data.mcps,
          changelog: data.changelog,
          dependencies: data.dependencies,
          selectedItemId: null,
          selectedItemType: null,
        }),

      setGithubRepo: (repo: string | null) => set({ githubRepo: repo }),
      setPluginName: (name: string) => set({ pluginName: name }),
      selectItem: (id: string | null, type: ItemType | null) =>
        set({ selectedItemId: id, selectedItemType: type }),
      setTheme: (theme: Theme) => set({ theme }),
      toggleInventory: () =>
        set((s) => ({ inventoryCollapsed: !s.inventoryCollapsed })),
      toggleRightPanel: () =>
        set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),

      addSkill: (skill: Skill) =>
        set((s) => {
          if (s.skills.some((sk) => sk.name === skill.name)) return s;
          const tracked = trackChange(s, `Added skill: ${skill.name}`);
          return { skills: [...s.skills, skill], ...tracked };
        }),
      updateSkill: (id: string, data: Partial<Skill>) =>
        set((s) => ({
          skills: s.skills.map((sk) =>
            sk.id === id ? { ...sk, ...data } : sk
          ),
        })),
      removeSkill: (id: string) =>
        set((s) => {
          const skill = s.skills.find((sk) => sk.id === id);
          const tracked = skill ? trackChange(s, `Removed skill: ${skill.name}`) : { version: s.version, changelog: s.changelog };
          return {
            skills: s.skills.filter((sk) => sk.id !== id),
            selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
            selectedItemType: s.selectedItemId === id ? null : s.selectedItemType,
            ...tracked,
          };
        }),

      addAgent: (agent: Agent) =>
        set((s) => {
          if (s.agents.some((a) => a.name === agent.name)) return s;
          const tracked = trackChange(s, `Added agent: ${agent.name}`);
          return { agents: [...s.agents, agent], ...tracked };
        }),
      updateAgent: (id: string, data: Partial<Agent>) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),
      removeAgent: (id: string) =>
        set((s) => {
          const agent = s.agents.find((a) => a.id === id);
          const tracked = agent ? trackChange(s, `Removed agent: ${agent.name}`) : { version: s.version, changelog: s.changelog };
          return {
            agents: s.agents.filter((a) => a.id !== id),
            selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
            selectedItemType: s.selectedItemId === id ? null : s.selectedItemType,
            ...tracked,
          };
        }),

      addMCP: (mcp: MCP) =>
        set((s) => {
          const tracked = trackChange(s, `Added MCP: ${mcp.name}`);
          return { mcps: [...s.mcps, mcp], ...tracked };
        }),
      updateMCP: (id: string, data: Partial<MCP>) =>
        set((s) => ({
          mcps: s.mcps.map((m) => (m.id === id ? { ...m, ...data } : m)),
        })),
      removeMCP: (id: string) =>
        set((s) => {
          const mcp = s.mcps.find((m) => m.id === id);
          const tracked = mcp ? trackChange(s, `Removed MCP: ${mcp.name}`) : { version: s.version, changelog: s.changelog };
          return {
            mcps: s.mcps.filter((m) => m.id !== id),
            selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
            selectedItemType: s.selectedItemId === id ? null : s.selectedItemType,
            ...tracked,
          };
        }),

      addCommand: (command: Command) =>
        set((s) => {
          if (s.commands.some((c) => c.name === command.name)) return s;
          const tracked = trackChange(s, `Added command: ${command.name}`);
          return { commands: [...s.commands, command], ...tracked };
        }),
      updateCommand: (id: string, data: Partial<Command>) =>
        set((s) => ({
          commands: s.commands.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),
      removeCommand: (id: string) =>
        set((s) => {
          const command = s.commands.find((c) => c.id === id);
          const tracked = command ? trackChange(s, `Removed command: ${command.name}`) : { version: s.version, changelog: s.changelog };
          return {
            commands: s.commands.filter((c) => c.id !== id),
            selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
            selectedItemType: s.selectedItemId === id ? null : s.selectedItemType,
            ...tracked,
          };
        }),

      addHook: (hook: Hook) =>
        set((s) => {
          const tracked = trackChange(s, `Added hook: ${hook.name}`);
          return { hooks: [...s.hooks, hook], ...tracked };
        }),
      updateHook: (id: string, data: Partial<Hook>) =>
        set((s) => ({
          hooks: s.hooks.map((h) => (h.id === id ? { ...h, ...data } : h)),
        })),
      removeHook: (id: string) =>
        set((s) => {
          const hook = s.hooks.find((h) => h.id === id);
          const tracked = hook ? trackChange(s, `Removed hook: ${hook.name}`) : { version: s.version, changelog: s.changelog };
          return {
            hooks: s.hooks.filter((h) => h.id !== id),
            selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
            selectedItemType: s.selectedItemId === id ? null : s.selectedItemType,
            ...tracked,
          };
        }),
      toggleHook: (id: string) =>
        set((s) => ({
          hooks: s.hooks.map((h) =>
            h.id === id ? { ...h, enabled: !h.enabled } : h
          ),
        })),

      bumpVersion: (type: "major" | "minor" | "patch") =>
        set((s) => {
          const parts = s.version.split(".").map(Number);
          if (type === "major") { parts[0]++; parts[1] = 0; parts[2] = 0; }
          else if (type === "minor") { parts[1]++; parts[2] = 0; }
          else { parts[2]++; }
          const newVersion = parts.join(".");
          return {
            version: newVersion,
            changelog: [
              { version: newVersion, timestamp: Date.now(), changes: [`Version bump: ${type}`] },
              ...s.changelog,
            ],
          };
        }),

      addChatMessage: (message: ChatMessage) =>
        set((s) => ({ chatMessages: [...s.chatMessages, message].slice(-200) })),
      clearChatMessages: () => set({ chatMessages: [] }),

      addDependency: (dep: PluginDependency) =>
        set((s) => ({
          dependencies: [...s.dependencies, dep],
        })),

      removeDependency: (id: string) =>
        set((s) => {
          const dep = s.dependencies.find((d) => d.id === id);
          if (!dep) return s;
          const skillIdsToRemove = new Set(dep.importedSkillIds);
          const agentIdsToRemove = new Set(dep.importedAgentIds);
          return {
            dependencies: s.dependencies.filter((d) => d.id !== id),
            skills: s.skills.filter((sk) => !skillIdsToRemove.has(sk.id)),
            agents: s.agents.filter((a) => !agentIdsToRemove.has(a.id)),
          };
        }),

      importPlugin: (data: ParsedPlugin) =>
        set({
          pluginName: data.pluginName,
          version: data.version || "0.1.0",
          skills: data.skills,
          agents: data.agents,
          commands: data.commands,
          hooks: data.hooks,
          mcps: data.mcps,
          changelog: data.changelog || [],
          dependencies: data.dependencies || [],
          selectedItemId: null,
          selectedItemType: null,
        }),

      getPluginData: (): PluginData => {
        const s = get();
        return {
          pluginName: s.pluginName,
          version: s.version,
          skills: s.skills,
          agents: s.agents,
          commands: s.commands,
          hooks: s.hooks,
          mcps: s.mcps,
          changelog: s.changelog,
          dependencies: s.dependencies,
        };
      },

      resetPlugin: () =>
        set({
          pluginName: "",
          version: "0.1.0",
          skills: [],
          agents: [],
          commands: [],
          hooks: [],
          mcps: [],
          selectedItemId: null,
          selectedItemType: null,
          chatMessages: [],
          changelog: [],
          dependencies: [],
          githubRepo: null,
        }),
    })
  )
);

// Subscribe to data changes and auto-sync to API (debounced)
// Only track data fields, not UI state like selectedItemId, theme, etc.
const dataSelector = (s: PluginState) => ({
  pluginName: s.pluginName,
  version: s.version,
  skills: s.skills,
  agents: s.agents,
  commands: s.commands,
  hooks: s.hooks,
  mcps: s.mcps,
  changelog: s.changelog,
  dependencies: s.dependencies,
});

usePluginStore.subscribe(dataSelector, () => {
  scheduleSyncToApi();
}, { equalityFn: Object.is });
