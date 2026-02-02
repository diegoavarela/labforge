"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Plug, Wrench } from "lucide-react";
import type { MCP, RegistryMCP } from "@/types";

interface MCPCardProps {
  mcp: MCP | RegistryMCP;
  isLocal: boolean;
  onAdd?: () => void;
  onConfig?: () => void;
  onRemove?: () => void;
}

export default function MCPCard({
  mcp,
  isLocal,
  onAdd,
  onConfig,
  onRemove,
}: MCPCardProps) {
  const configured = "isConfigured" in mcp ? mcp.isConfigured : false;
  const toolCount = mcp.tools?.length ?? 0;
  const enabledTools = mcp.tools?.filter((t) => t.enabled).length ?? 0;

  return (
    <Card variant="mcp" hover className="p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Plug size={14} className="text-accent-cyan shrink-0" />
          <h3 className="font-mono font-bold text-sm text-text-primary truncate">
            {mcp.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={mcp.isOfficial ? "success" : "default"}>
            {mcp.isOfficial ? "Official" : "Community"}
          </Badge>
        </div>
      </div>

      <p className="text-text-secondary text-xs font-mono line-clamp-2 flex-1">
        {mcp.description || "No description"}
      </p>

      <div className="flex flex-wrap gap-1">
        {mcp.categories?.slice(0, 3).map((cat) => (
          <Badge key={cat} variant="info">
            {cat}
          </Badge>
        ))}
        {[...new Set(mcp.transport)]?.map((t, i) => (
          <Badge key={`${t}-${i}`} variant="default">
            {t}
          </Badge>
        ))}
      </div>

      {isLocal && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={
              configured ? "text-accent-green" : "text-accent-orange"
            }
          >
            {configured ? "Configured" : "Needs config"}
          </span>
          {toolCount > 0 && (
            <span className="text-text-muted flex items-center gap-1">
              <Wrench size={10} />
              {enabledTools}/{toolCount} tools
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-1">
        {isLocal ? (
          <>
            <Button variant="ghost" size="sm" onClick={onConfig}>
              Config
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onAdd}>
            + Add
          </Button>
        )}
      </div>
    </Card>
  );
}
