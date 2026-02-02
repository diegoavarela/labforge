import type { PluginState, ItemType } from "@/types";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  component: ItemType | "plugin";
  componentId: string;
  componentName: string;
  message: string;
  fix?: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  isValid: boolean;
}

export function validatePlugin(state: PluginState): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Plugin-level
  if (!state.pluginName?.trim()) {
    issues.push({
      severity: "error",
      component: "plugin",
      componentId: "",
      componentName: "Plugin",
      message: "Plugin name is empty",
      fix: "Set a plugin name",
    });
  }

  // Skills
  for (const skill of state.skills) {
    if (!skill.content?.trim()) {
      issues.push({
        severity: "warning",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "Skill has no content",
        fix: "Add content or remove the skill",
      });
    }
  }

  // Agents
  for (const agent of state.agents) {
    for (const skillId of agent.skillIds) {
      if (!state.skills.find((s) => s.id === skillId)) {
        issues.push({
          severity: "error",
          component: "agent",
          componentId: agent.id,
          componentName: agent.name,
          message: `References missing skill: ${skillId}`,
          fix: "Remove the broken reference or create the skill",
        });
      }
    }
    for (const mcpId of agent.mcpIds) {
      if (!state.mcps.find((m) => m.id === mcpId)) {
        issues.push({
          severity: "error",
          component: "agent",
          componentId: agent.id,
          componentName: agent.name,
          message: `References missing MCP: ${mcpId}`,
          fix: "Remove the broken reference or add the MCP",
        });
      }
    }
    if (!agent.instructions?.trim()) {
      issues.push({
        severity: "warning",
        component: "agent",
        componentId: agent.id,
        componentName: agent.name,
        message: "Agent has no instructions",
      });
    }
  }

  // Commands
  for (const command of state.commands) {
    if (!command.nodes.find((n) => n.type === "start")) {
      issues.push({
        severity: "error",
        component: "command",
        componentId: command.id,
        componentName: command.name,
        message: "No start node",
        fix: "Add a start node",
      });
    }
    for (const node of command.nodes) {
      if (node.type === "agent" && node.data.agentId) {
        if (!state.agents.find((a) => a.id === node.data.agentId)) {
          issues.push({
            severity: "error",
            component: "command",
            componentId: command.id,
            componentName: command.name,
            message: `Node references missing agent: ${node.data.agentId}`,
          });
        }
      }
      if (node.type === "skill" && node.data.skillId) {
        if (!state.skills.find((s) => s.id === node.data.skillId)) {
          issues.push({
            severity: "error",
            component: "command",
            componentId: command.id,
            componentName: command.name,
            message: `Node references missing skill: ${node.data.skillId}`,
          });
        }
      }
      if (node.type === "mcp" && node.data.mcpId) {
        if (!state.mcps.find((m) => m.id === node.data.mcpId)) {
          issues.push({
            severity: "error",
            component: "command",
            componentId: command.id,
            componentName: command.name,
            message: `Node references missing MCP: ${node.data.mcpId}`,
          });
        }
      }
    }
    // Disconnected nodes
    const connected = new Set<string>();
    for (const edge of command.edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }
    for (const node of command.nodes) {
      if (command.nodes.length > 1 && !connected.has(node.id)) {
        issues.push({
          severity: "warning",
          component: "command",
          componentId: command.id,
          componentName: command.name,
          message: `Node "${node.id}" (${node.type}) is disconnected`,
        });
      }
    }
  }

  // MCPs
  for (const mcp of state.mcps) {
    if (!mcp.isConfigured) {
      issues.push({
        severity: "warning",
        component: "mcp",
        componentId: mcp.id,
        componentName: mcp.name,
        message: "MCP not fully configured",
        fix: "Set required environment variables",
      });
    }
  }

  // Hooks
  for (const hook of state.hooks) {
    if (!hook.event) {
      issues.push({
        severity: "error",
        component: "hook",
        componentId: hook.id,
        componentName: hook.name,
        message: "Hook has no event trigger",
      });
    }
  }

  // Orphan skills
  for (const skill of state.skills) {
    const usedByAgent = state.agents.some((a) => a.skillIds.includes(skill.id));
    const usedByCommand = state.commands.some((c) =>
      c.nodes.some((n) => n.type === "skill" && n.data.skillId === skill.id)
    );
    if (!usedByAgent && !usedByCommand) {
      issues.push({
        severity: "info",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "Not referenced by any agent or command",
      });
    }
  }

  return { issues, isValid: !issues.some((i) => i.severity === "error") };
}
