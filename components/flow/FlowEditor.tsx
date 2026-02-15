"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Download,
  FileCode,
  FileText,
  RefreshCw,
  Plus,
} from "lucide-react";
import FlowNodeComponent from "./FlowNodeComponent";
import { parseSkillMdToFlow } from "@/lib/flow/parser";
import { flowToSkillMd, flowToShellScript } from "@/lib/flow/generator";
import type { FlowNode, FlowEdge, FlowNodeType, FlowGraph } from "@/types/flow";
import { NODE_COLORS, NODE_LABELS } from "@/types/flow";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  flowNode: FlowNodeComponent as any,
};

interface FlowEditorProps {
  skillMd: string;
  onSkillMdChange?: (md: string) => void;
}

export default function FlowEditor({ skillMd, onSkillMdChange }: FlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [showExport, setShowExport] = useState<"skillmd" | "shell" | null>(null);
  const lastSkillMdRef = useRef(skillMd);
  const syncFromFlowRef = useRef(false);

  // Parse SKILL.md → Flow on mount or when skillMd changes externally
  useEffect(() => {
    if (syncFromFlowRef.current) {
      syncFromFlowRef.current = false;
      return;
    }
    const graph = parseSkillMdToFlow(skillMd);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    lastSkillMdRef.current = skillMd;
  }, [skillMd, setNodes, setEdges]);

  // Bidirectional sync: flow changes → SKILL.md
  const syncToSkillMd = useCallback(() => {
    if (!onSkillMdChange) return;
    const graph: FlowGraph = {
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
    };
    const newMd = flowToSkillMd(graph);
    if (newMd !== lastSkillMdRef.current) {
      syncFromFlowRef.current = true;
      lastSkillMdRef.current = newMd;
      onSkillMdChange(newMd);
    }
  }, [nodes, edges, onSkillMdChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
    },
    [setEdges]
  );

  // Add new node
  const addNode = useCallback(
    (type: FlowNodeType) => {
      const id = `flow_new_${Date.now()}`;
      // Place below the last node
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
      const newNode: FlowNode = {
        id,
        type: "flowNode",
        position: { x: 250, y: maxY + 100 },
        data: {
          label: NODE_LABELS[type],
          nodeType: type,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes]
  );

  // Generate exports
  const exportedSkillMd = useMemo(() => {
    return flowToSkillMd({ nodes: nodes as FlowNode[], edges: edges as FlowEdge[] });
  }, [nodes, edges]);

  const exportedShell = useMemo(() => {
    return flowToShellScript({ nodes: nodes as FlowNode[], edges: edges as FlowEdge[] });
  }, [nodes, edges]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-bg-primary"
        defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "var(--border-default)", strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--text-muted)" style={{ opacity: 0.15 }} />
        <Controls
          className="!bg-bg-secondary !border-border-default !rounded-lg !shadow-lg [&_button]:!bg-bg-secondary [&_button]:!border-border-default [&_button]:!text-text-secondary [&_button:hover]:!bg-bg-hover"
        />
        <MiniMap
          className="!bg-bg-secondary !border-border-default !rounded-lg"
          maskColor="rgba(0,0,0,0.3)"
          nodeColor={(node) => {
            const data = node.data as { nodeType?: FlowNodeType };
            return NODE_COLORS[data.nodeType || "step"] || "#3b82f6";
          }}
        />

        {/* Toolbar panel */}
        <Panel position="top-left" className="flex gap-1.5">
          {/* Sync button */}
          <button
            onClick={syncToSkillMd}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium bg-bg-secondary border border-border-default rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer shadow-sm"
            title="Sync flow back to SKILL.md"
          >
            <RefreshCw size={12} />
            Sync to Editor
          </button>

          {/* Export SKILL.md */}
          <button
            onClick={() => setShowExport(showExport === "skillmd" ? null : "skillmd")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border rounded-lg transition-colors cursor-pointer shadow-sm ${
              showExport === "skillmd"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <FileText size={12} />
            SKILL.md
          </button>

          {/* Export Shell */}
          <button
            onClick={() => setShowExport(showExport === "shell" ? null : "shell")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border rounded-lg transition-colors cursor-pointer shadow-sm ${
              showExport === "shell"
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <FileCode size={12} />
            Shell Script
          </button>
        </Panel>

        {/* Add node panel */}
        <Panel position="top-right">
          <div className="flex flex-wrap gap-1">
            {(["step", "shell", "decision", "retry", "parallel", "apiCall"] as FlowNodeType[]).map((type) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-bg-secondary border border-border-default rounded-md text-text-secondary hover:bg-bg-hover cursor-pointer shadow-sm"
                title={`Add ${NODE_LABELS[type]} node`}
              >
                <Plus size={10} />
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: NODE_COLORS[type] }}
                />
                {NODE_LABELS[type]}
              </button>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {/* Export preview overlay */}
      {showExport && (
        <div className="absolute bottom-4 left-4 right-4 max-h-[40%] bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-bg-tertiary">
            <span className="text-xs font-semibold text-text-primary">
              {showExport === "skillmd" ? "Generated SKILL.md" : "Generated Shell Script"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showExport === "skillmd" ? exportedSkillMd : exportedShell);
                }}
                className="text-[10px] px-2 py-1 bg-bg-hover text-text-secondary rounded hover:text-text-primary cursor-pointer"
              >
                Copy
              </button>
              <button
                onClick={() => setShowExport(null)}
                className="text-[10px] px-2 py-1 bg-bg-hover text-text-secondary rounded hover:text-text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-text-secondary whitespace-pre-wrap">
            {showExport === "skillmd" ? exportedSkillMd : exportedShell}
          </pre>
        </div>
      )}
    </div>
  );
}
