"use client";

import { useState } from "react";
import { generateId } from "@/lib/utils/id";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import type { MCP, MCPTool } from "@/types";

interface CustomMCPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (mcp: MCP) => void;
}

type SourceType = "npm" | "github" | "local" | "url";

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "npm", label: "npm package" },
  { value: "github", label: "GitHub repo" },
  { value: "local", label: "Local path" },
  { value: "url", label: "URL (SSE/HTTP)" },
];

const TRANSPORT_OPTIONS = [
  { value: "stdio", label: "stdio" },
  { value: "sse", label: "SSE" },
  { value: "http", label: "HTTP" },
];

const SOURCE_PLACEHOLDERS: Record<SourceType, string> = {
  npm: "@scope/package-name",
  github: "owner/repo",
  local: "/path/to/server",
  url: "https://example.com/mcp",
};

export default function CustomMCPModal({
  isOpen,
  onClose,
  onAdd,
}: CustomMCPModalProps) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("npm");
  const [sourceValue, setSourceValue] = useState("");
  const [transport, setTransport] = useState("stdio");
  const [tools, setTools] = useState<MCPTool[]>([]);

  function addTool() {
    setTools((prev) => [
      ...prev,
      { name: "", description: "", inputSchema: {}, enabled: true },
    ]);
  }

  function updateTool(index: number, field: "name" | "description", value: string) {
    setTools((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function removeTool(index: number) {
    setTools((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdd() {
    if (!name.trim()) return;
    const mcp: MCP = {
      id: generateId(),
      name: name.trim(),
      description: `Custom MCP: ${sourceValue}`,
      source: sourceValue,
      transport: [transport],
      installCommand:
        sourceType === "npm"
          ? `npx ${sourceValue}`
          : sourceType === "github"
            ? `npx @anthropic/mcp-install ${sourceValue}`
            : "",
      authType: null,
      tools: tools.filter((t) => t.name.trim()),
      configuredEnvVars: {},
      isConfigured: false,
      categories: ["custom"],
      isOfficial: false,
    };
    onAdd(mcp);
    resetForm();
    onClose();
  }

  function resetForm() {
    setName("");
    setSourceType("npm");
    setSourceValue("");
    setTransport("stdio");
    setTools([]);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom MCP" size="lg">
      <div className="flex flex-col gap-4">
        <Input label="Name" placeholder="My MCP Server" value={name} onChange={setName} />

        {/* Source type */}
        <div className="flex flex-col gap-2">
          <span className="text-text-secondary text-xs font-mono uppercase">
            Source
          </span>
          <div className="flex gap-2 flex-wrap">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSourceType(opt.value)}
                className={`px-3 py-1 text-xs font-mono border cursor-pointer transition-colors ${
                  sourceType === opt.value
                    ? "border-accent-cyan text-accent-cyan bg-accent-cyan/10"
                    : "border-border-default text-text-secondary hover:border-text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Input
            placeholder={SOURCE_PLACEHOLDERS[sourceType]}
            value={sourceValue}
            onChange={setSourceValue}
          />
        </div>

        <Select
          label="Transport"
          options={TRANSPORT_OPTIONS}
          value={transport}
          onChange={setTransport}
        />

        {/* Tools */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-xs font-mono uppercase">
              Tools
            </span>
            <button
              onClick={addTool}
              className="text-xs font-mono text-accent-cyan hover:underline cursor-pointer"
            >
              + Add Tool
            </button>
          </div>
          {tools.map((tool, i) => (
            <div
              key={i}
              className="flex gap-2 items-start p-2 bg-bg-secondary border border-border-default"
            >
              <div className="flex-1 flex flex-col gap-1">
                <Input
                  placeholder="Tool name"
                  value={tool.name}
                  onChange={(v) => updateTool(i, "name", v)}
                />
                <Input
                  placeholder="Description"
                  value={tool.description}
                  onChange={(v) => updateTool(i, "description", v)}
                />
              </div>
              <button
                onClick={() => removeTool(i)}
                className="text-text-muted hover:text-red-400 mt-1 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {tools.length === 0 && (
            <p className="text-text-muted text-xs font-mono">
              No tools defined yet
            </p>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            Add to Plugin
          </Button>
        </div>
      </div>
    </Modal>
  );
}
