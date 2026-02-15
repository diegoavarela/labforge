"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Play,
  Square,
  Terminal,
  GitBranch,
  RefreshCw,
  Layers,
  Globe,
  CircleDot,
} from "lucide-react";
import type { FlowNodeData, FlowNodeType } from "@/types/flow";
import { NODE_COLORS } from "@/types/flow";

const ICONS: Record<FlowNodeType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  start: Play,
  step: CircleDot,
  shell: Terminal,
  decision: GitBranch,
  retry: RefreshCw,
  parallel: Layers,
  apiCall: Globe,
  end: Square,
};

function FlowNodeComponent({ data, selected }: { data: FlowNodeData; selected?: boolean }) {
  const color = NODE_COLORS[data.nodeType];
  const Icon = ICONS[data.nodeType];
  const isTerminal = data.nodeType === "start" || data.nodeType === "end";

  return (
    <div
      className={`
        px-4 py-2.5 rounded-xl border-2 bg-bg-secondary shadow-lg
        min-w-[140px] max-w-[220px] text-center transition-shadow
        ${selected ? "shadow-xl ring-2 ring-offset-1 ring-offset-bg-primary" : ""}
      `}
      style={{
        borderColor: color,
        ...(selected ? { ringColor: color } : {}),
      }}
    >
      {data.nodeType !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-bg-secondary"
          style={{ backgroundColor: color }}
        />
      )}

      <div className="flex items-center gap-2 justify-center">
        <Icon size={14} style={{ color }} />
        <span
          className={`text-xs font-semibold ${isTerminal ? "text-text-muted uppercase tracking-wider" : "text-text-primary"}`}
        >
          {data.label}
        </span>
      </div>

      {data.description && !isTerminal && (
        <p className="text-[10px] text-text-muted mt-1 leading-tight truncate">
          {data.description}
        </p>
      )}

      {data.command && data.nodeType === "shell" && (
        <code className="block text-[9px] text-accent-orange mt-1 bg-bg-tertiary rounded px-1.5 py-0.5 truncate font-mono">
          {data.command.split("\n")[0]}
        </code>
      )}

      {data.condition && data.nodeType === "decision" && (
        <code className="block text-[9px] text-yellow-400 mt-1 bg-bg-tertiary rounded px-1.5 py-0.5 truncate font-mono">
          {data.condition}
        </code>
      )}

      {data.nodeType !== "end" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !border-2 !border-bg-secondary"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
}

export default memo(FlowNodeComponent);
