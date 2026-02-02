"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

import type { VariableNodeData } from "@/types";

function VariableNodeComponent({
  id,
  data,
}: {
  id: string;
  data: VariableNodeData;
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
    <div className="min-w-[180px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-sky-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-sky-400/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Variable
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <input
          value={(data.key as string) || ""}
          onChange={(e) => updateData("key", e.target.value)}
          placeholder="variable name..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
        <input
          value={(data.value as string) || ""}
          onChange={(e) => updateData("value", e.target.value)}
          placeholder="default value..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-sky-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(VariableNodeComponent);
