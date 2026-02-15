export interface ScriptFile {
  filename: string;
  content: string;
  language: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  skillMd: string;
  scripts: ScriptFile[];
  metadata: Record<string, unknown>;
  source: "local" | "registry";
  sourceUrl?: string;
}

export interface AssistantAction {
  type: string;
  data: unknown;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: AssistantAction[];
}

export interface RegistrySkill {
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  sourceRef?: string;
  categories: string[];
  stars?: number;
  installs?: number;
  installCommand?: string;
}

export interface ChangelogEntry {
  version: string;
  timestamp: number;
  changes: string[];
}

export type ItemType = "skill";
export type Theme = "light" | "dark";

export interface SkillStoreState {
  skillName: string;
  version: string;
  skills: Skill[];
  selectedItemId: string | null;
  selectedItemType: ItemType | null;
  theme: Theme;
  inventoryCollapsed: boolean;
  rightPanelCollapsed: boolean;
  chatMessages: ChatMessage[];
  changelog: ChangelogEntry[];
}

export interface SkillStoreActions {
  setSkillName: (name: string) => void;
  selectItem: (id: string | null, type: ItemType | null) => void;
  setTheme: (theme: Theme) => void;
  toggleInventory: () => void;
  toggleRightPanel: () => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  duplicateSkill: (id: string) => void;
  bumpVersion: (type: "major" | "minor" | "patch") => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  getSkillProjectData: () => SkillProjectData;
  resetProject: () => void;
}

export type SkillStore = SkillStoreState & SkillStoreActions & {
  githubRepo: string | null;
  setGithubRepo: (repo: string | null) => void;
};

export interface SkillProjectData {
  skillName: string;
  version: string;
  skills: Skill[];
  changelog: ChangelogEntry[];
}

export interface SavedProject {
  id: string;
  skillName: string;
  updatedAt: number;
  data: SkillProjectData;
  _localOnly?: boolean;
}

export interface LibraryState {
  projects: SavedProject[];
  activeProjectId: string | null;
}

export interface LibraryActions {
  saveCurrentProject: (data: SkillProjectData) => void;
  loadProject: (id: string) => SavedProject | undefined;
  deleteProject: (id: string) => void;
  createNewProject: () => string;
  setActiveProjectId: (id: string | null) => void;
  importAsNewProject: (data: SkillProjectData) => string;
}

export type LibraryStore = LibraryState & LibraryActions;

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
}

export interface RegistryMCP {
  id: string;
  name: string;
  description: string;
  source: string;
  categories: string[];
  transport: string[];
  installCommand?: string;
  authType?: string;
  tools: MCPTool[];
  isOfficial: boolean;
  stars?: number;
  downloads?: number;
}
