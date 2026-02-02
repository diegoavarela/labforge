"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { usePluginStore } from "@/stores/plugin";

import type { SkillNodeData } from "@/types";

function SkillNodeComponent({
  id,
  data,
}: {
  id: string;
  data: SkillNodeData;
}) {
  const { setNodes } = useReactFlow();
  const skills = usePluginStore((s) => s.skills);
  const selectItem = usePluginStore((s) => s.selectItem);

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
        className="!bg-cyan-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-cyan-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Skill
        </span>
      </div>
      <div className="p-3">
        <div className="flex gap-1">
          <select
            value={(data.skillId as string) || ""}
            onChange={(e) => updateData("skillId", e.target.value)}
            className="flex-1 bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent-blue cursor-pointer"
          >
            <option value="">Select skill...</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {data.skillId && (
            <button
              onClick={(e) => { e.stopPropagation(); selectItem(data.skillId!, "skill"); }}
              className="p-1 bg-bg-secondary border border-border-default text-text-muted hover:text-cyan-400 hover:border-cyan-400/50 transition-colors cursor-pointer rounded"
              title="Open skill"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(SkillNodeComponent);
