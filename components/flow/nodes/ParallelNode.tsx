"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

function ParallelNodeComponent() {
  return (
    <div className="min-w-[180px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-orange-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Parallel
        </span>
      </div>
      <div className="p-3">
        <p className="text-text-secondary text-xs font-mono">
          Parallel execution
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-1"
        style={{ left: "20%" }}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-2"
        style={{ left: "50%" }}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-3"
        style={{ left: "80%" }}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(ParallelNodeComponent);
