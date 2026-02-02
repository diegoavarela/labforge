"use client";

import { usePluginStore } from "@/stores/plugin";
import WelcomeCanvas from "@/components/canvas/WelcomeCanvas";
import AgentCanvas from "@/components/canvas/AgentCanvas";
import SkillCanvas from "@/components/canvas/SkillCanvas";
import MCPCanvas from "@/components/canvas/MCPCanvas";
import HookCanvas from "@/components/canvas/HookCanvas";
import FlowCanvas from "@/components/flow/FlowCanvas";

export default function CanvasRouter() {
  const selectedItemId = usePluginStore((s) => s.selectedItemId);
  const selectedItemType = usePluginStore((s) => s.selectedItemType);
  const command = usePluginStore((s) =>
    selectedItemType === "command"
      ? s.commands.find((c) => c.id === selectedItemId)
      : undefined
  );

  if (!selectedItemId || !selectedItemType) {
    return <WelcomeCanvas />;
  }

  switch (selectedItemType) {
    case "command":
      return command ? (
        <FlowCanvas
          key={command.id}
          command={command}
          onUpdate={(data) => {
            usePluginStore.getState().updateCommand(command.id, data);
          }}
        />
      ) : (
        <WelcomeCanvas />
      );
    case "agent":
      return <AgentCanvas key={selectedItemId} agentId={selectedItemId} />;
    case "skill":
      return <SkillCanvas key={selectedItemId} skillId={selectedItemId} />;
    case "mcp":
      return <MCPCanvas key={selectedItemId} mcpId={selectedItemId} />;
    case "hook":
      return <HookCanvas key={selectedItemId} hookId={selectedItemId} />;
    default:
      return <WelcomeCanvas />;
  }
}
