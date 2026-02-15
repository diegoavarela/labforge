import type { Node, Edge } from "@xyflow/react";

export type FlowNodeType =
  | "start"
  | "step"
  | "shell"
  | "decision"
  | "retry"
  | "parallel"
  | "apiCall"
  | "end";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: FlowNodeType;
  description?: string;
  command?: string;        // shell nodes
  condition?: string;      // decision nodes
  retryCount?: number;     // retry nodes
  fixStrategy?: string;    // retry nodes — auto-fix command
  branches?: string[];     // parallel nodes
  endpoint?: string;       // apiCall nodes
  method?: string;         // apiCall nodes
}

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export const NODE_COLORS: Record<FlowNodeType, string> = {
  start: "#22c55e",
  step: "#3b82f6",
  shell: "#f97316",
  decision: "#eab308",
  retry: "#ef4444",
  parallel: "#a855f7",
  apiCall: "#06b6d4",
  end: "#6b7280",
};

export const NODE_LABELS: Record<FlowNodeType, string> = {
  start: "Start",
  step: "Step",
  shell: "Shell",
  decision: "Decision",
  retry: "Retry",
  parallel: "Parallel",
  apiCall: "API Call",
  end: "End",
};
