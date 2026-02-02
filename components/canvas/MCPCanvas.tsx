"use client";

import { Plug, ArrowRight, Eye, EyeOff } from "lucide-react";
import CopyMarkdown from "@/components/ui/CopyMarkdown";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";
import { useState } from "react";

export default function MCPCanvas({ mcpId }: { mcpId: string }) {
  const mcp = usePluginStore((s) => s.mcps.find((m) => m.id === mcpId));
  const updateMCP = usePluginStore((s) => s.updateMCP);
  const selectItem = usePluginStore((s) => s.selectItem);
  const [showEnvValues, setShowEnvValues] = useState(false);

  const usedByAgents = usePluginStore(
    useShallow((s) => s.agents.filter((a) => a.mcpIds.includes(mcpId)))
  );

  if (!mcp) return null;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-mcp">
            <Plug size={18} />
            <input
              value={mcp.name}
              onChange={(e) => updateMCP(mcpId, { name: e.target.value })}
              className="text-xl font-semibold bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-mcp w-full"
            />
            <CopyMarkdown
              label="Copy JSON"
              getContent={() => {
                const config: Record<string, unknown> = { command: mcp.installCommand };
                if (Object.keys(mcp.configuredEnvVars).length > 0) config.env = mcp.configuredEnvVars;
                return JSON.stringify({ mcpServers: { [mcp.name]: config } }, null, 2);
              }}
            />
          </div>
          <input
            value={mcp.description}
            onChange={(e) => updateMCP(mcpId, { description: e.target.value })}
            placeholder="MCP description..."
            className="text-sm bg-transparent text-text-secondary placeholder:text-text-muted focus:outline-none w-full"
          />
        </div>

        {/* Config */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Source</label>
              <span className="text-xs text-text-primary">{mcp.source || "custom"}</span>
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Transport</label>
              <span className="text-xs text-text-primary font-mono">{mcp.transport.join(", ")}</span>
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Install Command</label>
              <input
                value={mcp.installCommand}
                onChange={(e) => updateMCP(mcpId, { installCommand: e.target.value })}
                placeholder="npx @example/mcp-server"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              />
            </div>
          </div>
        </div>

        {/* Env vars */}
        {Object.keys(mcp.configuredEnvVars).length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Environment Variables</h3>
              <button
                onClick={() => setShowEnvValues(!showEnvValues)}
                className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                {showEnvValues ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(mcp.configuredEnvVars).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-mono w-40 shrink-0">{key}</span>
                  <input
                    type={showEnvValues ? "text" : "password"}
                    value={value}
                    onChange={(e) =>
                      updateMCP(mcpId, {
                        configuredEnvVars: { ...mcp.configuredEnvVars, [key]: e.target.value },
                      })
                    }
                    className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:border-border-focus"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {mcp.tools.length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Tools Available ({mcp.tools.length})
            </h3>
            <div className="space-y-1.5">
              {mcp.tools.map((tool) => (
                <div key={tool.name} className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-text-muted" />
                  <span className="font-mono text-text-primary">{tool.name}</span>
                  {tool.description && (
                    <span className="text-text-muted truncate">— {tool.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Used by */}
        {usedByAgents.length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Used by</h3>
            <div className="space-y-1.5">
              {usedByAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => selectItem(agent.id, "agent")}
                  className="flex items-center gap-2 text-xs text-text-secondary hover:text-agent transition-colors cursor-pointer"
                >
                  <ArrowRight size={11} />
                  <span className="text-agent">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
