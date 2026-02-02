"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

function EndNodeComponent() {
  return (
    <div className="min-w-[140px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-red-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-red-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          End
        </span>
      </div>
      <div className="p-3">
        <p className="text-text-muted text-[10px] font-mono">Pipeline ends</p>
      </div>
    </div>
  );
}

export default memo(EndNodeComponent);
