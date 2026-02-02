"use client";

import { useCallback, useEffect, useMemo, useRef, useState, DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNode from "./nodes/StartNode";
import StepNode from "./nodes/StepNode";
import AgentNode from "./nodes/AgentNode";
import BranchNode from "./nodes/BranchNode";
import MCPNode from "./nodes/MCPNode";
import NotifyNode from "./nodes/NotifyNode";
import ParallelNode from "./nodes/ParallelNode";
import EndNode from "./nodes/EndNode";
import ConditionNode from "./nodes/ConditionNode";
import LoopNode from "./nodes/LoopNode";
import SkillNode from "./nodes/SkillNode";
import ShellNode from "./nodes/ShellNode";
import PromptNode from "./nodes/PromptNode";
import VariableNode from "./nodes/VariableNode";
import TemplateNode from "./nodes/TemplateNode";
import CanvasToolbar from "./CanvasToolbar";
import ExportModal from "./ExportModal";
import DryRunModal from "./DryRunModal";
import { generateCommandMarkdown } from "@/lib/generateCommandMarkdown";
import type { Command } from "@/types";

const nodeTypes = {
  start: StartNode,
  step: StepNode,
  agent: AgentNode,
  branch: BranchNode,
  mcp: MCPNode,
  notify: NotifyNode,
  parallel: ParallelNode,
  end: EndNode,
  condition: ConditionNode,
  loop: LoopNode,
  skill: SkillNode,
  shell: ShellNode,
  prompt: PromptNode,
  variable: VariableNode,
  template: TemplateNode,
};

const defaultEdgeOptions = {
  style: { stroke: "var(--border-default)", strokeWidth: 2, strokeDasharray: "5 3" },
  animated: true,
};

interface FlowCanvasProps {
  command: Command;
  onUpdate: (data: Partial<Command>) => void;
}

function FlowCanvasInner({ command, onUpdate }: FlowCanvasProps) {
  const idCounter = useRef(Date.now());
  const reactFlowInstance = useReactFlow();
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);

  const initialNodes: Node[] = useMemo(
    () =>
      command.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        deletable: n.type !== "start",
      })),
    [command.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      command.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        label: e.label,
      })),
    [command.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      onUpdateRef.current({
        nodes: nodesRef.current.map((n) => ({
          id: n.id,
          type: n.type as Command["nodes"][0]["type"],
          position: n.position,
          data: n.data,
        })),
        edges: edgesRef.current.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          label: (e.label as string) ?? undefined,
        })),
      });
    }, 0);
  }, []);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      scheduleSync();
    },
    [onNodesChange, scheduleSync]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      scheduleSync();
    },
    [onEdgesChange, scheduleSync]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, style: { stroke: "var(--border-default)", strokeWidth: 2, strokeDasharray: "5 3" } },
          eds
        )
      );
      scheduleSync();
    },
    [setEdges, scheduleSync]
  );

  const addNodeAtPosition = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `${type}-${++idCounter.current}`;
      const newNode: Node = {
        id,
        type,
        position,
        data: { label: type.toUpperCase() },
        deletable: type !== "start",
      };
      setNodes((nds) => [...nds, newNode]);
      scheduleSync();
    },
    [setNodes, scheduleSync]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const type = e.dataTransfer.getData("application/reactflow");
      if (type) {
        addNodeAtPosition(type, position);
        return;
      }

      const itemRaw = e.dataTransfer.getData("application/labforge-item");
      if (itemRaw) {
        try {
          const item = JSON.parse(itemRaw) as { id: string; type: string };
          const nodeType = item.type;
          const id = `${nodeType}-${++idCounter.current}`;
          const newNode: Node = {
            id,
            type: nodeType,
            position,
            data: { label: nodeType.toUpperCase(), [`${nodeType}Id`]: item.id },
            deletable: true,
          };
          setNodes((nds) => [...nds, newNode]);
          scheduleSync();
        } catch {
          // ignore invalid JSON
        }
      }
    },
    [reactFlowInstance, addNodeAtPosition, setNodes, scheduleSync]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      scheduleSync();
    },
    [setEdges, scheduleSync]
  );

  const exportMarkdown = useMemo(
    () => generateCommandMarkdown(command),
    [command]
  );

  return (
    <div className="w-full h-full flex flex-col">
      <CanvasToolbar
        onZoomIn={() => reactFlowInstance.zoomIn()}
        onZoomOut={() => reactFlowInstance.zoomOut()}
        onFitView={() => reactFlowInstance.fitView()}
        onToggleMinimap={() => setMinimapVisible((v) => !v)}
        minimapVisible={minimapVisible}
        onExport={() => setExportOpen(true)}
        onDryRun={() => setDryRunOpen(true)}
        onCopyMarkdown={() => exportMarkdown}
      />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onEdgeClick={onEdgeClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.5, maxZoom: 0.7 }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          minZoom={0.2}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
          style={{ background: "var(--bg-primary)" }}
        >
          <Background color="var(--border-default)" gap={20} />
          <Controls
            className="!bg-bg-tertiary !border-border-default !shadow-none [&>button]:!bg-bg-secondary [&>button]:!border-border-default [&>button]:!text-text-primary [&>button:hover]:!bg-bg-hover"
          />
          {minimapVisible && (
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  start: "#22c55e",     // green-500
                  end: "#ef4444",       // red-500
                  step: "#737373",      // neutral-500
                  agent: "#a855f7",     // purple-500
                  skill: "#06b6d4",     // cyan-500
                  mcp: "#06b6d4",       // cyan-500
                  branch: "#f59e0b",    // amber-500
                  condition: "#f59e0b", // amber-500
                  loop: "#ec4899",      // pink-500
                  parallel: "#f97316",  // orange-500
                  shell: "#525252",     // neutral-600
                  prompt: "#eab308",    // yellow-500
                  variable: "#38bdf8",  // sky-400
                  template: "#a3a3a3",  // neutral-400
                  notify: "#ec4899",    // pink-500
                };
                return colors[node.type || ""] || "#737373";
              }}
              maskColor="rgba(0,0,0,0.6)"
              className="!bg-bg-secondary !border-border-default !rounded-lg"
            />
          )}
        </ReactFlow>
      </div>
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        markdown={exportMarkdown}
      />
      <DryRunModal
        isOpen={dryRunOpen}
        onClose={() => setDryRunOpen(false)}
        command={command}
      />
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
