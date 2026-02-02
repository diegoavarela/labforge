"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, Plug, Square } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { usePluginStore } from "@/stores/plugin";
import type { Agent } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-bg-tertiary border border-border-default flex items-center justify-center text-text-muted text-xs font-mono">
      Loading editor...
    </div>
  ),
});

const MODEL_OPTIONS = [
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "claude-haiku", label: "Claude Haiku" },
];

const CONTEXT_OPTIONS = [
  { value: "fork", label: "Fork" },
  { value: "main", label: "Main" },
];

const ALL_TOOLS = [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Grep",
  "Glob",
  "WebSearch",
  "Notebook",
  "TodoRead",
  "TodoWrite",
];

interface AgentEditorProps {
  initial?: Agent;
  onSave: (agent: Agent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ChipSelector({
  label,
  items,
  selectedIds,
  onAdd,
  onRemove,
  icon: Icon,
  colorClass,
}: {
  label: string;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  icon: React.ComponentType<{ size: number }>;
  colorClass: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = useMemo(
    () => items.filter((item) => !selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean),
    [selectedIds, items]
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-text-secondary text-xs font-mono uppercase">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 items-center">
        {selected.map((item) => (
          <span
            key={item!.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono ${colorClass} rounded-full`}
          >
            <Icon size={10} />
            {item!.name}
            <button
              onClick={() => onRemove(item!.id)}
              className="ml-0.5 hover:text-white cursor-pointer"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="relative" ref={ref}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(!open)}
            disabled={available.length === 0}
          >
            + Add
          </Button>
          {open && available.length > 0 && (
            <div className="absolute z-10 top-full left-0 mt-1 bg-bg-secondary border border-border-default shadow-[4px_4px_0_0_#000] min-w-[180px] max-h-[200px] overflow-y-auto">
              {available.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onAdd(item.id);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-text-primary hover:bg-bg-hover cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: AgentEditorProps) {
  const mcps = usePluginStore((s) => s.mcps);
  const skills = usePluginStore((s) => s.skills);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [model, setModel] = useState(initial?.model ?? "claude-sonnet-4");
  const [context, setContext] = useState<"fork" | "main">(
    initial?.context ?? "fork"
  );
  const [allowedTools, setAllowedTools] = useState<string[]>(
    initial?.allowedTools ?? []
  );
  const [mcpIds, setMcpIds] = useState<string[]>(
    // Filter out MCPs that no longer exist
    initial?.mcpIds.filter((id) => mcps.some((m) => m.id === id)) ?? []
  );
  const [skillIds, setSkillIds] = useState<string[]>(
    // Filter out Skills that no longer exist
    initial?.skillIds.filter((id) => skills.some((s) => s.id === id)) ?? []
  );
  const [instructions, setInstructions] = useState(
    initial?.instructions ?? ""
  );

  const mcpItems = useMemo(
    () => mcps.map((m) => ({ id: m.id, name: m.name })),
    [mcps]
  );
  const skillItems = useMemo(
    () => skills.map((s) => ({ id: s.id, name: s.name })),
    [skills]
  );

  function toggleTool(tool: string) {
    setAllowedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  function handleSave() {
    if (!name.trim()) return;
    const agent: Agent = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      model,
      context,
      allowedTools,
      mcpIds,
      skillIds,
      instructions,
    };
    onSave(agent);
  }

  return (
    <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Name" value={name} onChange={setName} placeholder="my-agent" />
        <Input
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="What this agent does..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Model"
          options={MODEL_OPTIONS}
          value={model}
          onChange={setModel}
        />
        <Select
          label="Context"
          options={CONTEXT_OPTIONS}
          value={context}
          onChange={(v) => setContext(v as "fork" | "main")}
        />
      </div>

      {/* Allowed Tools */}
      <div className="flex flex-col gap-1">
        <label className="text-text-secondary text-xs font-mono uppercase">
          Allowed Tools
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {ALL_TOOLS.map((tool) => (
            <label
              key={tool}
              className="flex items-center gap-2 text-xs font-mono text-text-primary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={allowedTools.includes(tool)}
                onChange={() => toggleTool(tool)}
                className="accent-accent-blue cursor-pointer"
              />
              {tool}
            </label>
          ))}
        </div>
      </div>

      {/* MCPs Connected */}
      <ChipSelector
        label="MCPs Connected"
        items={mcpItems}
        selectedIds={mcpIds}
        onAdd={(id) => setMcpIds((prev) => [...prev, id])}
        onRemove={(id) => setMcpIds((prev) => prev.filter((i) => i !== id))}
        icon={Plug}
        colorClass="bg-accent-cyan/20 text-accent-cyan"
      />

      {/* Skills Used */}
      <ChipSelector
        label="Skills Used"
        items={skillItems}
        selectedIds={skillIds}
        onAdd={(id) => setSkillIds((prev) => [...prev, id])}
        onRemove={(id) => setSkillIds((prev) => prev.filter((i) => i !== id))}
        icon={Square}
        colorClass="bg-accent-blue/20 text-accent-blue"
      />

      {/* Instructions */}
      <div className="flex flex-col gap-1">
        <label className="text-text-secondary text-xs font-mono uppercase">
          Instructions
        </label>
        <MonacoEditor
          height="250px"
          language="markdown"
          theme="vs-dark"
          value={instructions}
          onChange={(v) => setInstructions(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "JetBrains Mono, monospace",
            lineNumbers: "on",
            wordWrap: "on",
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-between pt-2 border-t border-border-default">
        <div>
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
