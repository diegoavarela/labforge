"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback } from "react";

import type { NotifyNodeData } from "@/types";

function NotifyNodeComponent({
  id,
  data,
}: {
  id: string;
  data: NotifyNodeData;
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
        className="!bg-pink-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-pink-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          Notify
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <input
          value={(data.channel as string) || ""}
          onChange={(e) => updateData("channel", e.target.value)}
          placeholder="channel..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue"
        />
        <textarea
          value={(data.message as string) || ""}
          onChange={(e) => updateData("message", e.target.value)}
          placeholder="message template..."
          className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-muted outline-none focus:border-accent-blue resize-none"
          rows={2}
        />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-pink-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(NotifyNodeComponent);
