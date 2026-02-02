"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

import type { ShellNodeData } from "@/types";

function ShellNodeComponent({
  id,
  data,
}: {
  id: string;
  data: ShellNodeData;
}) {
  const { setNodes } = useReactFlow();

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
        className="!bg-neutral-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-neutral-600/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Shell
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <textarea
          value={(data.command as string) || ""}
          onChange={(e) => updateData("command", e.target.value)}
          placeholder="shell command..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue resize-none"
          rows={2}
        />
        <input
          value={(data.workingDir as string) || ""}
          onChange={(e) => updateData("workingDir", e.target.value)}
          placeholder="working dir (optional)"
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-neutral-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(ShellNodeComponent);
