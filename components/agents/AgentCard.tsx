"use client";

import { Diamond, Plug, Square } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { usePluginStore } from "@/stores/plugin";
import type { Agent } from "@/types";

interface AgentCardProps {
  agent: Agent;
  onEdit: () => void;
}

export default function AgentCard({ agent, onEdit }: AgentCardProps) {
  const mcps = usePluginStore((s) => s.mcps);
  const skills = usePluginStore((s) => s.skills);

  const connectedMcps = agent.mcpIds
    .map((id) => mcps.find((m) => m.id === id))
    .filter(Boolean);

  const usedSkills = agent.skillIds
    .map((id) => skills.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <Card variant="agent" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Diamond size={18} className="text-agent shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2 min-w-0">
            <div>
              <h3 className="font-mono font-bold text-sm text-text-primary">
                {agent.name}
              </h3>
              {agent.description && (
                <p className="text-text-secondary text-xs font-mono mt-0.5">
                  {agent.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {connectedMcps.map((mcp) => (
                <span
                  key={mcp!.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent-cyan/20 text-accent-cyan rounded-full"
                >
                  <Plug size={10} />
                  {mcp!.name}
                </span>
              ))}
              {usedSkills.map((skill) => (
                <span
                  key={skill!.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-accent-blue/20 text-accent-blue rounded-full"
                >
                  <Square size={10} />
                  {skill!.name}
                </span>
              ))}
            </div>

            <span className="inline-block w-fit px-2 py-0.5 text-xs font-mono bg-agent/20 text-agent rounded-full">
              {agent.model}
            </span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </Card>
  );
}
