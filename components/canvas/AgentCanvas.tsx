"use client";

import { useState, useCallback } from "react";
import { Bot, X, Plus, ArrowRight, Wand2, Loader2, Maximize2, Minimize2 } from "lucide-react";
import CopyMarkdown from "@/components/ui/CopyMarkdown";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";
import { sendChatMessage } from "@/lib/ai/assistant";

export default function AgentCanvas({ agentId }: { agentId: string }) {
  const agent = usePluginStore((s) => s.agents.find((a) => a.id === agentId));
  const updateAgent = usePluginStore((s) => s.updateAgent);
  const skills = usePluginStore((s) => s.skills);
  const mcps = usePluginStore((s) => s.mcps);
  const selectItem = usePluginStore((s) => s.selectItem);

  // Commands that use this agent
  const usedByCommands = usePluginStore(
    useShallow((s) =>
      s.commands.filter((c) =>
        c.nodes.some((n) => n.type === "agent" && n.data.agentId === agentId)
      )
    )
  );

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || generating || !agent) return;

    setGenerating(true);
    try {
      const messages = [{ role: "user", content: text }];
      const systemPrompt = `You are an agent instructions generator for Claude Code plugins. Generate ONLY the instructions text for the agent — no explanations, no wrapping. The user will describe what the agent should do.

Current agent name: "${agent.name}"
Current agent description: "${agent.description}"

Output format: plain text instructions for the agent. Be specific and actionable.`;

      let fullContent = "";
      for await (const chunk of sendChatMessage(messages, systemPrompt)) {
        fullContent += chunk;
        updateAgent(agentId, { instructions: fullContent });
      }
    } finally {
      setGenerating(false);
      setPrompt("");
    }
  }, [prompt, generating, agent, agentId, updateAgent]);

  if (!agent) return null;

  const agentSkills = skills.filter((s) => agent.skillIds.includes(s.id));
  const agentMcps = mcps.filter((m) => agent.mcpIds.includes(m.id));
  const availableSkills = skills.filter((s) => !agent.skillIds.includes(s.id));
  const availableMcps = mcps.filter((m) => !agent.mcpIds.includes(m.id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/labforge-item"));
      if (data.type === "skill" && !agent.skillIds.includes(data.id)) {
        updateAgent(agentId, { skillIds: [...agent.skillIds, data.id] });
      } else if (data.type === "mcp" && !agent.mcpIds.includes(data.id)) {
        updateAgent(agentId, { mcpIds: [...agent.mcpIds, data.id] });
      }
    } catch {}
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-agent">
            <Bot size={18} />
            <input
              value={agent.name}
              onChange={(e) => updateAgent(agentId, { name: e.target.value })}
              className="text-xl font-semibold bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-agent w-full"
            />
          </div>
          <input
            value={agent.description}
            onChange={(e) => updateAgent(agentId, { description: e.target.value })}
            placeholder="Agent description..."
            className="text-sm bg-transparent text-text-secondary placeholder:text-text-muted focus:outline-none w-full"
          />
        </div>

        {/* Configuration */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Model</label>
              <select
                value={agent.model}
                onChange={(e) => updateAgent(agentId, { model: e.target.value })}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              >
                <option value="claude-sonnet-4-20250514">claude-sonnet-4</option>
                <option value="claude-opus-4-20250514">claude-opus-4</option>
                <option value="claude-haiku-3.5">claude-haiku-3.5</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Context</label>
              <select
                value={agent.context}
                onChange={(e) => updateAgent(agentId, { context: e.target.value as "fork" | "main" })}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              >
                <option value="fork">fork</option>
                <option value="main">main</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] text-text-muted block">Instructions</label>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Describe what this agent should do..."
                disabled={generating}
                className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-agent transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-agent/10 text-agent border border-agent/20 rounded-lg text-xs font-medium hover:bg-agent/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {generating ? "..." : "Generate"}
              </button>
            </div>
            <div>
              <textarea
                value={agent.instructions}
                onChange={(e) => updateAgent(agentId, { instructions: e.target.value })}
                placeholder="Agent instructions..."
                rows={expanded ? 30 : 12}
                className={`w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus font-mono resize-none transition-all ${expanded ? "min-h-[500px]" : "min-h-[200px]"}`}
              />
              <div className="flex justify-end gap-1 mt-1">
                <CopyMarkdown
                  label=""
                  getContent={() => {
                    const skillNames = skills.filter(s => agent.skillIds.includes(s.id)).map(s => s.name);
                    const mcpNames = mcps.filter(m => agent.mcpIds.includes(m.id)).map(m => m.name);
                    const fm = [
                      "---",
                      `name: ${agent.name}`,
                      `description: ${agent.description}`,
                      `model: ${agent.model}`,
                      `context: ${agent.context}`,
                      `allowedTools:`,
                      ...agent.allowedTools.map(t => `  - ${t}`),
                      `mcps:`,
                      ...mcpNames.map(m => `  - ${m}`),
                      `skills:`,
                      ...skillNames.map(s => `  - ${s}`),
                      "---",
                    ].join("\n");
                    return `${fm}\n\n${agent.instructions}`;
                  }}
                />
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                  title={expanded ? "Collapse" : "Expand"}
                >
                  {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div
          className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Skills ({agentSkills.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {agentSkills.map((sk) => (
              <div key={sk.id} className="flex items-center justify-between bg-bg-tertiary rounded-lg px-3 py-2">
                <button
                  onClick={() => selectItem(sk.id, "skill")}
                  className="flex items-center gap-2 text-xs text-text-primary hover:text-skill transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-skill" />
                  {sk.name}
                </button>
                <button
                  onClick={() => updateAgent(agentId, { skillIds: agent.skillIds.filter((id) => id !== sk.id) })}
                  className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {agentSkills.length === 0 && (
              <p className="text-[11px] text-text-muted py-2">Drop skills here or add below</p>
            )}
          </div>
          {availableSkills.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  updateAgent(agentId, { skillIds: [...agent.skillIds, e.target.value] });
                }
              }}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-muted focus:outline-none focus:border-border-focus"
            >
              <option value="">+ Add skill...</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* MCPs */}
        <div
          className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            MCPs ({agentMcps.length})
          </h3>
          <div className="space-y-1.5">
            {agentMcps.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-bg-tertiary rounded-lg px-3 py-2">
                <button
                  onClick={() => selectItem(m.id, "mcp")}
                  className="flex items-center gap-2 text-xs text-text-primary hover:text-mcp transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-mcp" />
                  {m.name}
                </button>
                <button
                  onClick={() => updateAgent(agentId, { mcpIds: agent.mcpIds.filter((id) => id !== m.id) })}
                  className="text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {agentMcps.length === 0 && (
              <p className="text-[11px] text-text-muted py-2">Drop MCPs here or add below</p>
            )}
          </div>
          {availableMcps.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  updateAgent(agentId, { mcpIds: [...agent.mcpIds, e.target.value] });
                }
              }}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-muted focus:outline-none focus:border-border-focus"
            >
              <option value="">+ Add MCP...</option>
              {availableMcps.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Used by */}
        {usedByCommands.length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Used by</h3>
            <div className="space-y-1.5">
              {usedByCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => selectItem(cmd.id, "command")}
                  className="flex items-center gap-2 text-xs text-text-secondary hover:text-command transition-colors cursor-pointer"
                >
                  <ArrowRight size={11} />
                  <span className="text-command">{cmd.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
