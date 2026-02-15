import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { generateId } from "@/lib/utils/id";
import type {
  SkillStore,
  SkillStoreState,
  SkillProjectData,
  Skill,
  ChatMessage,
  ItemType,
  Theme,
  ChangelogEntry,
} from "@/types";

function trackChange(state: SkillStoreState, change: string): { version: string; changelog: ChangelogEntry[] } {
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
    if (lib.activeProjectId) {
      const projectData = useSkillStore.getState().getSkillProjectData();
      lib.saveCurrentProject(projectData);
    }
  }, 1000);
}

export const useSkillStore = create<SkillStore & { hydrate: (data: SkillProjectData) => void }>()(
  subscribeWithSelector(
    (set, get) => ({
      skillName: "",
      version: "0.1.0",
      skills: [],
      selectedItemId: null,
      selectedItemType: null,
      theme: "dark",
      inventoryCollapsed: false,
      rightPanelCollapsed: false,
      chatMessages: [],
      changelog: [],
      githubRepo: null,

      hydrate: (data: SkillProjectData) =>
        set({
          skillName: data.skillName,
          version: data.version,
          skills: data.skills,
          changelog: data.changelog,
          selectedItemId: null,
          selectedItemType: null,
        }),

      setGithubRepo: (repo: string | null) => set({ githubRepo: repo }),
      setSkillName: (name: string) => set({ skillName: name }),
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
      duplicateSkill: (id: string) =>
        set((s) => {
          const skill = s.skills.find((sk) => sk.id === id);
          if (!skill) return s;
          const newSkill: Skill = {
            ...skill,
            id: generateId(),
            name: `${skill.name}-copy`,
            scripts: skill.scripts.map((sc) => ({ ...sc })),
            metadata: { ...skill.metadata },
          };
          const tracked = trackChange(s, `Duplicated skill: ${skill.name}`);
          return { skills: [...s.skills, newSkill], ...tracked };
        }),

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

      getSkillProjectData: (): SkillProjectData => {
        const s = get();
        return {
          skillName: s.skillName,
          version: s.version,
          skills: s.skills,
          changelog: s.changelog,
        };
      },

      resetProject: () =>
        set({
          skillName: "",
          version: "0.1.0",
          skills: [],
          selectedItemId: null,
          selectedItemType: null,
          chatMessages: [],
          changelog: [],
          githubRepo: null,
        }),
    })
  )
);

// Subscribe to data changes and auto-sync
const dataSelector = (s: SkillStoreState) => ({
  skillName: s.skillName,
  version: s.version,
  skills: s.skills,
  changelog: s.changelog,
});

useSkillStore.subscribe(dataSelector, () => {
  scheduleSyncToApi();
}, { equalityFn: Object.is });
