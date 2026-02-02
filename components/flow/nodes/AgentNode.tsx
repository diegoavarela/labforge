"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { usePluginStore } from "@/stores/plugin";

import type { AgentNodeData } from "@/types";

function AgentNodeComponent({ id, data }: { id: string; data: AgentNodeData }) {
  const { setNodes } = useReactFlow();
  const agents = usePluginStore((s) => s.agents);
  const skills = usePluginStore((s) => s.skills);
  const mcps = usePluginStore((s) => s.mcps);
  const selectItem = usePluginStore((s) => s.selectItem);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === data.agentId),
    [agents, data.agentId]
  );

  const agentSkills = useMemo(
    () => skills.filter((s) => selectedAgent?.skillIds?.includes(s.id)),
    [skills, selectedAgent]
  );

  const agentMcps = useMemo(
    () => mcps.filter((m) => selectedAgent?.mcpIds?.includes(m.id)),
    [mcps, selectedAgent]
  );

  const updateData = useCallback(
    (field: string, value: string) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div className="min-w-[200px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-purple-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Agent
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex gap-1">
          <select
            value={(data.agentId as string) || ""}
            onChange={(e) => updateData("agentId", e.target.value)}
            className="flex-1 bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent-blue cursor-pointer"
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {data.agentId && (
            <button
              onClick={(e) => { e.stopPropagation(); selectItem(data.agentId!, "agent"); }}
              className="p-1 bg-bg-secondary border border-border-default text-text-muted hover:text-purple-400 hover:border-purple-400/50 transition-colors cursor-pointer rounded"
              title="Open agent"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>

        {selectedAgent && (agentSkills.length > 0 || agentMcps.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {agentSkills.map((s) => (
              <button
                key={s.id}
                onClick={(e) => { e.stopPropagation(); selectItem(s.id, "skill"); }}
                className="px-1.5 py-0.5 text-[9px] font-mono bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer transition-colors"
              >
                {s.name}
              </button>
            ))}
            {agentMcps.map((m) => (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); selectItem(m.id, "mcp"); }}
                className="px-1.5 py-0.5 text-[9px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 cursor-pointer transition-colors"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={(data.prompt as string) || ""}
          onChange={(e) => updateData("prompt", e.target.value)}
          placeholder="prompt..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue resize-none"
          rows={2}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(AgentNodeComponent);
