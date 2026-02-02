"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Terminal,
  Bot,
  Sparkles,
  Plug,
  Webhook,
  Download,
} from "lucide-react";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";
import ImportModal from "@/components/dependencies/ImportModal";
import type { ItemType } from "@/types";

interface InventorySection {
  type: ItemType;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  dotClass: string;
}

const sections: InventorySection[] = [
  { type: "command", label: "Commands", icon: <Terminal size={12} />, colorClass: "text-command", dotClass: "bg-command" },
  { type: "agent", label: "Agents", icon: <Bot size={12} />, colorClass: "text-agent", dotClass: "bg-agent" },
  { type: "skill", label: "Skills", icon: <Sparkles size={12} />, colorClass: "text-skill", dotClass: "bg-skill" },
  { type: "mcp", label: "MCPs", icon: <Plug size={12} />, colorClass: "text-mcp", dotClass: "bg-mcp" },
  { type: "hook", label: "Hooks", icon: <Webhook size={12} />, colorClass: "text-hook", dotClass: "bg-hook" },
];

export default function InventoryPanel() {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);

  const { commands, agents, skills, mcps, hooks, selectedItemId, selectItem } =
    usePluginStore(
      useShallow((s) => ({
        commands: s.commands,
        agents: s.agents,
        skills: s.skills,
        mcps: s.mcps,
        hooks: s.hooks,
        selectedItemId: s.selectedItemId,
        selectItem: s.selectItem,
      }))
    );

  const addCommand = usePluginStore((s) => s.addCommand);
  const addAgent = usePluginStore((s) => s.addAgent);
  const addSkill = usePluginStore((s) => s.addSkill);
  const addMCP = usePluginStore((s) => s.addMCP);
  const addHook = usePluginStore((s) => s.addHook);

  const dependencies = usePluginStore((s) => s.dependencies);

  const importedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dep of dependencies) {
      for (const sid of dep.importedSkillIds) ids.add(sid);
      for (const aid of dep.importedAgentIds) ids.add(aid);
    }
    return ids;
  }, [dependencies]);

  const removeCommand = usePluginStore((s) => s.removeCommand);
  const removeAgent = usePluginStore((s) => s.removeAgent);
  const removeSkill = usePluginStore((s) => s.removeSkill);
  const removeMCP = usePluginStore((s) => s.removeMCP);
  const removeHook = usePluginStore((s) => s.removeHook);

  const handleRemove = useCallback(
    (id: string, type: ItemType) => {
      switch (type) {
        case "command": removeCommand(id); break;
        case "agent": removeAgent(id); break;
        case "skill": removeSkill(id); break;
        case "mcp": removeMCP(id); break;
        case "hook": removeHook(id); break;
      }
    },
    [removeCommand, removeAgent, removeSkill, removeMCP, removeHook]
  );

  const getItems = useCallback(
    (type: ItemType) => {
      const items = {
        command: commands,
        agent: agents,
        skill: skills,
        mcp: mcps,
        hook: hooks,
      }[type];

      if (!search) return items;
      const q = search.toLowerCase();
      return items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          ("description" in i && (i as { description?: string }).description?.toLowerCase().includes(q))
      );
    },
    [commands, agents, skills, mcps, hooks, search]
  );

  const handleAdd = useCallback(
    (type: ItemType) => {
      const id = crypto.randomUUID();
      switch (type) {
        case "command":
          addCommand({ id, name: "/new-command", description: "", nodes: [], edges: [] });
          selectItem(id, "command");
          break;
        case "agent":
          addAgent({
            id, name: "new-agent", description: "", model: "claude-sonnet-4-20250514",
            context: "fork", allowedTools: [], mcpIds: [], skillIds: [], instructions: "",
          });
          selectItem(id, "agent");
          break;
        case "skill":
          addSkill({
            id, name: "new-skill", description: "", content: "", files: [],
            source: "local", categories: [], tags: [],
          });
          selectItem(id, "skill");
          break;
        case "mcp":
          addMCP({
            id, name: "new-mcp", description: "", source: "", transport: ["stdio"],
            installCommand: "", authType: null, tools: [], configuredEnvVars: {},
            isConfigured: false, categories: [], isOfficial: false,
          });
          selectItem(id, "mcp");
          break;
        case "hook":
          addHook({
            id, name: "new-hook", enabled: true, event: "", matcher: "",
            action: { type: "bash", config: {} },
          });
          selectItem(id, "hook");
          break;
      }
    },
    [addCommand, addAgent, addSkill, addMCP, addHook, selectItem]
  );

  const toggleSection = (type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: ItemType) => {
    e.dataTransfer.setData("application/labforge-item", JSON.stringify({ id, type }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all..."
            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-7 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {sections.map((section) => {
          const items = getItems(section.type);
          const isCollapsed = collapsed[section.type];

          return (
            <div key={section.type} className="mb-1">
              {/* Section header */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors group">
                <button
                  onClick={() => toggleSection(section.type)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider cursor-pointer flex-1"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className={section.colorClass}>{section.icon}</span>
                  {section.label}
                  <span className="text-text-muted font-normal ml-1">({items.length})</span>
                </button>
                <button
                  onClick={() => handleAdd(section.type)}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-all cursor-pointer p-0.5 rounded hover:bg-bg-tertiary"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Items */}
              {!isCollapsed && (
                <div className="ml-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`group/item w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        selectedItemId === item.id
                          ? "bg-bg-hover text-text-primary"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                      onClick={() => selectItem(item.id, section.type)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id, section.type)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${section.dotClass}`} />
                      <span className="truncate flex-1">
                        {section.type === "command" && !item.name.startsWith("/")
                          ? `/${item.name}`
                          : item.name}
                      </span>
                      {importedIds.has(item.id) && (
                        <span className="text-[8px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded font-mono shrink-0">
                          imported
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.id, section.type);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 transition-all p-0.5 rounded hover:bg-red-500/10 shrink-0 cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="px-3 py-1.5 text-[10px] text-text-muted">
                      No {section.label.toLowerCase()} yet
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-border-default">
        <button
          onClick={() => setImportOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium text-text-muted border border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          <Download size={10} />
          Import from Library
        </button>
      </div>
      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
