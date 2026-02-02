"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

import type { LoopNodeData } from "@/types";

function LoopNodeComponent({
  id,
  data,
}: {
  id: string;
  data: LoopNodeData;
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
        className="!bg-blue-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-blue-500 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Loop
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <input
          value={(data.collection as string) || ""}
          onChange={(e) => updateData("collection", e.target.value)}
          placeholder="collection / iterable..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
        <input
          value={(data.maxIterations as string) || ""}
          onChange={(e) => updateData("maxIterations", e.target.value)}
          placeholder="max iterations (optional)"
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
      </div>
      <div className="flex justify-between px-3 pb-1">
        <span className="text-blue-400 text-[10px] font-mono">BODY</span>
        <span className="text-text-muted text-[10px] font-mono">DONE</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="body"
        style={{ left: "30%" }}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="done"
        style={{ left: "70%" }}
        className="!bg-neutral-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(LoopNodeComponent);
