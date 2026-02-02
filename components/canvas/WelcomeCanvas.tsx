"use client";

import { Terminal, Bot, Sparkles, Plug, Webhook } from "lucide-react";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";
import type { ItemType } from "@/types";

export default function WelcomeCanvas() {
  const { pluginName, commands, agents, skills, mcps, hooks, selectItem } =
    usePluginStore(
      useShallow((s) => ({
        pluginName: s.pluginName,
        commands: s.commands,
        agents: s.agents,
        skills: s.skills,
        mcps: s.mcps,
        hooks: s.hooks,
        selectItem: s.selectItem,
      }))
    );

  const addCommand = usePluginStore((s) => s.addCommand);
  const addAgent = usePluginStore((s) => s.addAgent);
  const addSkill = usePluginStore((s) => s.addSkill);

  const handleQuickCreate = (type: ItemType) => {
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
    }
  };

  const total = commands.length + agents.length + skills.length + mcps.length + hooks.length;

  // Build dependency data for the graph
  const deps: { cmd: string; agent: string; skills: string[]; mcps: string[] }[] = [];
  for (const cmd of commands) {
    const agentNodes = cmd.nodes.filter((n): n is Extract<typeof n, { type: "agent" }> => n.type === "agent");
    for (const node of agentNodes) {
      const agent = agents.find((a) => a.id === node.data.agentId);
      if (agent) {
        deps.push({
          cmd: cmd.name,
          agent: agent.name,
          skills: agent.skillIds
            .map((sid) => skills.find((s) => s.id === sid)?.name)
            .filter(Boolean) as string[],
          mcps: agent.mcpIds
            .map((mid) => mcps.find((m) => m.id === mid)?.name)
            .filter(Boolean) as string[],
        });
      }
    }
  }

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Plugin Forge
          </h1>
          <p className="text-sm text-text-secondary">
            Describe what you want to build in the chat, or start by creating:
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-center gap-3">
          {[
            { type: "command" as ItemType, label: "Command", icon: <Terminal size={14} />, color: "text-command border-command/20 hover:bg-command/5" },
            { type: "agent" as ItemType, label: "Agent", icon: <Bot size={14} />, color: "text-agent border-agent/20 hover:bg-agent/5" },
            { type: "skill" as ItemType, label: "Skill", icon: <Sparkles size={14} />, color: "text-skill border-skill/20 hover:bg-skill/5" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => handleQuickCreate(item.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${item.color}`}
            >
              {item.icon}
              + {item.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {total > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {pluginName || "Your Plugin"}
              </span>
              <span className="text-xs text-text-muted">
                {total} component{total !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex gap-3">
              {commands.length > 0 && (
                <span className="text-[11px] text-command flex items-center gap-1">
                  <Terminal size={11} /> {commands.length} command{commands.length > 1 ? "s" : ""}
                </span>
              )}
              {agents.length > 0 && (
                <span className="text-[11px] text-agent flex items-center gap-1">
                  <Bot size={11} /> {agents.length} agent{agents.length > 1 ? "s" : ""}
                </span>
              )}
              {skills.length > 0 && (
                <span className="text-[11px] text-skill flex items-center gap-1">
                  <Sparkles size={11} /> {skills.length} skill{skills.length > 1 ? "s" : ""}
                </span>
              )}
              {mcps.length > 0 && (
                <span className="text-[11px] text-mcp flex items-center gap-1">
                  <Plug size={11} /> {mcps.length} mcp{mcps.length > 1 ? "s" : ""}
                </span>
              )}
              {hooks.length > 0 && (
                <span className="text-[11px] text-hook flex items-center gap-1">
                  <Webhook size={11} /> {hooks.length} hook{hooks.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Dependency graph */}
            {deps.length > 0 && (
              <div className="border-t border-border-default pt-3 space-y-2">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Dependency Graph
                </span>
                {deps.map((d, i) => (
                  <div key={i} className="text-xs text-text-secondary font-mono pl-2 space-y-0.5">
                    <div>
                      <span className="text-command">{d.cmd}</span>
                      <span className="text-text-muted mx-1.5">→</span>
                      <span className="text-agent">{d.agent}</span>
                    </div>
                    {d.skills.map((s) => (
                      <div key={s} className="pl-6 text-text-muted">
                        └─ <span className="text-skill">{s}</span>
                      </div>
                    ))}
                    {d.mcps.map((m) => (
                      <div key={m} className="pl-6 text-text-muted">
                        └─ <span className="text-mcp">{m}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
