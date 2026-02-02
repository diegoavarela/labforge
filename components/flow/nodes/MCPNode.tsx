"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import { memo, useCallback, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { usePluginStore } from "@/stores/plugin";

import type { McpNodeData } from "@/types";

function MCPNodeComponent({ id, data }: { id: string; data: McpNodeData }) {
  const { setNodes } = useReactFlow();
  const mcps = usePluginStore((s) => s.mcps);
  const selectItem = usePluginStore((s) => s.selectItem);

  const selectedMCP = useMemo(
    () => mcps.find((m) => m.id === data.mcpId),
    [mcps, data.mcpId]
  );

  const enabledTools = useMemo(
    () => (selectedMCP?.tools.filter((t) => t.enabled) ?? []).slice(0, 50),
    [selectedMCP]
  );

  const updateData = useCallback(
    (field: string, value: unknown) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      );
    },
    [id, setNodes]
  );

  const args = (data.args as Record<string, string>) || {};
  const argEntries = Object.entries(args);
  const rows = [...argEntries, ["", ""]].slice(0, 3);

  const updateArg = useCallback(
    (idx: number, key: string, val: string) => {
      const entries = Object.entries(
        (data.args as Record<string, string>) || {}
      );
      while (entries.length <= idx) entries.push(["", ""]);
      entries[idx] = [key, val];
      const newArgs: Record<string, string> = {};
      for (const [k, v] of entries) {
        if (k) newArgs[k] = v;
      }
      updateData("args", newArgs);
    },
    [data.args, updateData]
  );

  return (
    <div className="min-w-[220px] bg-bg-tertiary border border-border-default shadow-sm rounded-lg transition-shadow hover:shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
      <div className="bg-cyan-500/80 px-3 py-1 rounded-t-lg">
        <span className="text-white text-xs font-mono font-bold uppercase">
          MCP
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex gap-1">
          <select
            value={(data.mcpId as string) || ""}
            onChange={(e) => updateData("mcpId", e.target.value)}
            className="flex-1 bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent-blue cursor-pointer"
          >
            <option value="">Select MCP...</option>
            {mcps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {data.mcpId && (
            <button
              onClick={(e) => { e.stopPropagation(); selectItem(data.mcpId!, "mcp"); }}
              className="p-1 bg-bg-secondary border border-border-default text-text-muted hover:text-cyan-400 hover:border-cyan-400/50 transition-colors cursor-pointer rounded"
              title="Open MCP"
            >
              <ExternalLink size={11} />
            </button>
          )}
        </div>
        {selectedMCP && (
          <select
            value={(data.toolName as string) || ""}
            onChange={(e) => updateData("toolName", e.target.value)}
            className="w-full bg-bg-secondary border border-border-default px-2 py-1 text-xs font-mono text-text-primary outline-none focus:border-accent-blue cursor-pointer"
          >
            <option value="">Select tool...</option>
            {enabledTools.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-col gap-1">
          {rows.map((entry, idx) => (
            <div key={idx} className="flex gap-1">
              <input
                value={entry[0]}
                onChange={(e) => updateArg(idx, e.target.value, entry[1])}
                placeholder="key"
                className="w-1/2 bg-bg-secondary border border-border-default px-1 py-0.5 text-[10px] font-mono text-text-primary placeholder:text-text-muted outline-none"
              />
              <input
                value={entry[1]}
                onChange={(e) => updateArg(idx, entry[0], e.target.value)}
                placeholder="value"
                className="w-1/2 bg-bg-secondary border border-border-default px-1 py-0.5 text-[10px] font-mono text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
          ))}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !border-2 !border-bg-secondary !rounded-full"
      />
    </div>
  );
}

export default memo(MCPNodeComponent);
