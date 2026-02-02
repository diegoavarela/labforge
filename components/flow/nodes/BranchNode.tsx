"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

import type { BranchNodeData } from "@/types";

function BranchNodeComponent({
  id,
  data,
}: {
  id: string;
  data: BranchNodeData;
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
        className="!bg-amber-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-amber-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Branch
        </span>
      </div>
      <div className="p-3">
        <input
          value={(data.condition as string) || ""}
          onChange={(e) => updateData("condition", e.target.value)}
          placeholder="condition expression..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
      </div>
      <div className="flex justify-between px-3 pb-1">
        <span className="text-green-400 text-[10px] font-mono">PASS</span>
        <span className="text-red-400 text-[10px] font-mono">FAIL</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        style={{ left: "30%" }}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="fail"
        style={{ left: "70%" }}
        className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(BranchNodeComponent);
