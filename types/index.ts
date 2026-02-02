export interface SkillFile {
  path: string;
  content: string;
  language: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  files: SkillFile[];
  source: "local" | "registry";
  sourceUrl?: string;
  categories: string[];
  tags: string[];
  installs?: number;
  stars?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  context: "fork" | "main";
  allowedTools: string[];
  mcpIds: string[];
  skillIds: string[];
  instructions: string;
}

// Node data types
interface NodeDataBase { [key: string]: unknown }
export interface StartNodeData extends NodeDataBase { label?: string; commandName?: string }
export interface StepNodeData extends NodeDataBase { label?: string; command?: string; workingDir?: string }
export interface AgentNodeData extends NodeDataBase { label?: string; agentId?: string; prompt?: string }
export interface BranchNodeData extends NodeDataBase { label?: string; condition?: string }
export interface McpNodeData extends NodeDataBase { label?: string; mcpId?: string; toolName?: string; args?: Record<string, string> }
export interface ParallelNodeData extends NodeDataBase { label?: string }
export interface NotifyNodeData extends NodeDataBase { label?: string; channel?: string; message?: string }
export interface EndNodeData extends NodeDataBase { label?: string }
export interface ConditionNodeData extends NodeDataBase { label?: string; condition?: string }
export interface LoopNodeData extends NodeDataBase { label?: string; maxIterations?: string; collection?: string }
export interface SkillNodeData extends NodeDataBase { label?: string; skillId?: string }
export interface ShellNodeData extends NodeDataBase { label?: string; command?: string; workingDir?: string }
export interface PromptNodeData extends NodeDataBase { label?: string; prompt?: string; placeholder?: string }
export interface VariableNodeData extends NodeDataBase { label?: string; key?: string; value?: string }
export interface TemplateNodeData extends NodeDataBase { label?: string; template?: string }

interface FlowNodeBase {
  id: string;
  position: { x: number; y: number };
}

export type FlowNode =
  | (FlowNodeBase & { type: "start"; data: StartNodeData })
  | (FlowNodeBase & { type: "step"; data: StepNodeData })
  | (FlowNodeBase & { type: "agent"; data: AgentNodeData })
  | (FlowNodeBase & { type: "branch"; data: BranchNodeData })
  | (FlowNodeBase & { type: "mcp"; data: McpNodeData })
  | (FlowNodeBase & { type: "parallel"; data: ParallelNodeData })
  | (FlowNodeBase & { type: "notify"; data: NotifyNodeData })
  | (FlowNodeBase & { type: "end"; data: EndNodeData })
  | (FlowNodeBase & { type: "condition"; data: ConditionNodeData })
  | (FlowNodeBase & { type: "loop"; data: LoopNodeData })
  | (FlowNodeBase & { type: "skill"; data: SkillNodeData })
  | (FlowNodeBase & { type: "shell"; data: ShellNodeData })
  | (FlowNodeBase & { type: "prompt"; data: PromptNodeData })
  | (FlowNodeBase & { type: "variable"; data: VariableNodeData })
  | (FlowNodeBase & { type: "template"; data: TemplateNodeData });

// Helper type to extract data for a given node type
export type FlowNodeDataFor<T extends FlowNode["type"]> = Extract<FlowNode, { type: T }>["data"];

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface HookAction {
  type: "bash" | "mcp_call" | "agent";
  config: Record<string, string>;
}

export interface Hook {
  id: string;
  name: string;
  enabled: boolean;
  event: string;
  matcher: string;
  action: HookAction;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
}

export interface MCP {
  id: string;
  name: string;
  description: string;
  source: string;
  transport: string[];
  installCommand: string;
  authType: string | null;
  tools: MCPTool[];
  configuredEnvVars: Record<string, string>;
  isConfigured: boolean;
  categories: string[];
  isOfficial: boolean;
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

export interface PluginDependency {
  id: string;
  sourcePluginId: string;
  sourcePluginName: string;
  importedSkillIds: string[];
  importedAgentIds: string[];
}

export interface ChangelogEntry {
  version: string;
  timestamp: number;
  changes: string[];
}

export type ItemType = "command" | "agent" | "skill" | "mcp" | "hook";
export type Theme = "light" | "dark";

export interface PluginState {
  pluginName: string;
  version: string;
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
  hooks: Hook[];
  mcps: MCP[];
  selectedItemId: string | null;
  selectedItemType: ItemType | null;
  theme: Theme;
  inventoryCollapsed: boolean;
  rightPanelCollapsed: boolean;
  chatMessages: ChatMessage[];
  changelog: ChangelogEntry[];
  dependencies: PluginDependency[];
}

export interface ParsedPlugin {
  pluginName: string;
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
  hooks: Hook[];
  mcps: MCP[];
  version?: string;
  changelog?: ChangelogEntry[];
  dependencies?: PluginDependency[];
}

export interface PluginActions {
  setPluginName: (name: string) => void;
  selectItem: (id: string | null, type: ItemType | null) => void;
  setTheme: (theme: Theme) => void;
  toggleInventory: () => void;
  toggleRightPanel: () => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, agent: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  addMCP: (mcp: MCP) => void;
  updateMCP: (id: string, mcp: Partial<MCP>) => void;
  removeMCP: (id: string) => void;
  addCommand: (command: Command) => void;
  updateCommand: (id: string, command: Partial<Command>) => void;
  removeCommand: (id: string) => void;
  addHook: (hook: Hook) => void;
  updateHook: (id: string, hook: Partial<Hook>) => void;
  removeHook: (id: string) => void;
  toggleHook: (id: string) => void;
  bumpVersion: (type: "major" | "minor" | "patch") => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  addDependency: (dep: PluginDependency) => void;
  removeDependency: (id: string) => void;
  importPlugin: (data: ParsedPlugin) => void;
  getPluginData: () => PluginData;
  resetPlugin: () => void;
}

export type PluginStore = PluginState & PluginActions;

// Library (multi-project support)
export interface PluginData {
  pluginName: string;
  version: string;
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
  hooks: Hook[];
  mcps: MCP[];
  changelog: ChangelogEntry[];
  dependencies: PluginDependency[];
}

export interface SavedPlugin {
  id: string;
  pluginName: string;
  updatedAt: number;
  data: PluginData;
  _localOnly?: boolean;
}

export interface LibraryState {
  plugins: SavedPlugin[];
  activePluginId: string | null;
}

export interface LibraryActions {
  saveCurrentPlugin: (data: PluginData) => void;
  loadPlugin: (id: string) => SavedPlugin | undefined;
  deletePlugin: (id: string) => void;
  createNewPlugin: () => string;
  setActivePluginId: (id: string | null) => void;
  importAsNewPlugin: (data: PluginData) => string;
}

export type LibraryStore = LibraryState & LibraryActions;
