"use client";

import { Handle, Position } from "@xyflow/react";
import { memo } from "react";

import type { StartNodeData } from "@/types";

function StartNodeComponent({ data }: { data: StartNodeData }) {
  return (
    <div className="min-w-[180px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <div className="bg-green-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Start
        </span>
      </div>
      <div className="p-3">
        <p className="text-text-primary text-xs font-mono">
          {data.commandName || "Command"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(StartNodeComponent);
