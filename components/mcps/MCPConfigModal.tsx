"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";
import type { MCP, MCPTool } from "@/types";

interface MCPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcp: MCP;
  onSave: (updated: Partial<MCP>) => void;
}

export default function MCPConfigModal({
  isOpen,
  onClose,
  mcp,
  onSave,
}: MCPConfigModalProps) {
  const [envVars, setEnvVars] = useState<Record<string, string>>(
    mcp.configuredEnvVars ?? {}
  );
  const [useEnvRef, setUseEnvRef] = useState<Record<string, boolean>>({});
  const [tools, setTools] = useState<MCPTool[]>(mcp.tools ?? []);

  function handleEnvChange(key: string, value: string) {
    setEnvVars((prev) => ({ ...prev, [key]: value }));
  }

  function toggleEnvRef(key: string) {
    setUseEnvRef((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleTool(index: number) {
    setTools((prev) =>
      prev.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t))
    );
  }

  function selectAll(enabled: boolean) {
    setTools((prev) => prev.map((t) => ({ ...t, enabled })));
  }

  function handleSave() {
    const resolvedVars: Record<string, string> = {};
    for (const [key, val] of Object.entries(envVars)) {
      resolvedVars[key] = useEnvRef[key] ? `\${${val}}` : val;
    }
    onSave({
      configuredEnvVars: resolvedVars,
      tools,
      isConfigured: true,
    });
    onClose();
  }

  const authKey = mcp.authType ?? "API_KEY";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configure ${mcp.name}`} size="lg">
      <div className="flex flex-col gap-5">
        {/* Info */}
        <section className="flex flex-col gap-2">
          <h3 className="font-mono font-bold text-xs uppercase text-text-secondary">
            Info
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-text-muted">Source:</span>{" "}
              <span className="text-text-primary">{mcp.source || "N/A"}</span>
            </div>
            <div>
              <span className="text-text-muted">Transport:</span>{" "}
              <span className="text-text-primary">
                {mcp.transport?.join(", ") || "stdio"}
              </span>
            </div>
            {mcp.installCommand && (
              <div className="col-span-2">
                <span className="text-text-muted">Install:</span>{" "}
                <code className="text-accent-cyan">{mcp.installCommand}</code>
              </div>
            )}
          </div>
        </section>

        {/* Auth */}
        <section className="flex flex-col gap-2">
          <h3 className="font-mono font-bold text-xs uppercase text-text-secondary">
            Authentication
          </h3>
          <div className="flex flex-col gap-2">
            <Input
              label={authKey}
              placeholder={`Enter ${authKey} or env var name`}
              value={envVars[authKey] ?? ""}
              onChange={(v) => handleEnvChange(authKey, v)}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useEnvRef[authKey] ?? false}
                onChange={() => toggleEnvRef(authKey)}
                className="accent-accent-cyan"
              />
              <span className="text-text-secondary text-xs font-mono">
                Use as env var reference ($&#123;VAR_NAME&#125;)
              </span>
            </label>
          </div>
        </section>

        {/* Tools */}
        {tools.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-mono font-bold text-xs uppercase text-text-secondary">
                Tools ({tools.filter((t) => t.enabled).length}/{tools.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => selectAll(true)}
                  className="text-xs font-mono text-accent-cyan hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => selectAll(false)}
                  className="text-xs font-mono text-text-muted hover:underline cursor-pointer"
                >
                  Select None
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {tools.map((tool, i) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-3 p-2 bg-bg-secondary border border-border-default"
                >
                  <Toggle
                    checked={tool.enabled}
                    onChange={() => toggleTool(i)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-text-primary font-bold truncate">
                      {tool.name}
                    </div>
                    <div className="font-mono text-xs text-text-muted truncate">
                      {tool.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
