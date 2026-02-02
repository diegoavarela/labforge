import type { Command, FlowNode, FlowEdge, PluginState } from "@/types";

export interface SimulationStep {
  nodeId: string;
  nodeType: FlowNode["type"];
  nodeName: string;
  status: "success" | "warning" | "error";
  description: string;
  warnings: string[];
}

export interface SimulationResult {
  commandName: string;
  steps: SimulationStep[];
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDeg.set(n.id, 0);
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      const d = (inDeg.get(next) || 1) - 1;
      inDeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => nodeMap.get(id)!).filter(Boolean);
}

export function simulateCommand(
  command: Command,
  state: PluginState
): SimulationResult {
  const steps: SimulationStep[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const ordered = topoSort(command.nodes, command.edges);

  for (const node of ordered) {
    const step = simulateNode(node, state);
    steps.push(step);
    if (step.status === "error") allErrors.push(...step.warnings);
    if (step.status === "warning") allWarnings.push(...step.warnings);
  }

  return {
    commandName: command.name,
    steps,
    errors: allErrors,
    warnings: allWarnings,
    isValid: allErrors.length === 0,
  };
}

function simulateNode(node: FlowNode, state: PluginState): SimulationStep {
  const warnings: string[] = [];
  let status: SimulationStep["status"] = "success";
  let description = "";

  switch (node.type) {
    case "start":
      description = `Command starts: ${node.data.commandName || "unnamed"}`;
      break;
    case "end":
      description = "Command ends";
      break;
    case "agent": {
      const agent = node.data.agentId
        ? state.agents.find((a) => a.id === node.data.agentId)
        : undefined;
      if (node.data.agentId && !agent) {
        status = "error";
        warnings.push(`Agent not found: ${node.data.agentId}`);
        description = "Invoke agent (MISSING)";
      } else if (!node.data.agentId) {
        status = "warning";
        warnings.push("No agent selected");
        description = "Invoke agent (none selected)";
      } else {
        for (const sid of agent!.skillIds) {
          if (!state.skills.find((s) => s.id === sid)) {
            status = "warning";
            warnings.push(
              `Agent "${agent!.name}" references missing skill: ${sid}`
            );
          }
        }
        for (const mid of agent!.mcpIds) {
          if (!state.mcps.find((m) => m.id === mid)) {
            status = "warning";
            warnings.push(
              `Agent "${agent!.name}" references missing MCP: ${mid}`
            );
          }
        }
        description = `Invoke agent "${agent!.name}" (${agent!.model})`;
      }
      break;
    }
    case "skill": {
      const skill = node.data.skillId
        ? state.skills.find((s) => s.id === node.data.skillId)
        : undefined;
      if (node.data.skillId && !skill) {
        status = "error";
        warnings.push(`Skill not found: ${node.data.skillId}`);
        description = "Apply skill (MISSING)";
      } else if (!node.data.skillId) {
        status = "warning";
        warnings.push("No skill selected");
        description = "Apply skill (none selected)";
      } else {
        description = `Apply skill "${skill!.name}"`;
      }
      break;
    }
    case "mcp": {
      const mcp = node.data.mcpId
        ? state.mcps.find((m) => m.id === node.data.mcpId)
        : undefined;
      if (node.data.mcpId && !mcp) {
        status = "error";
        warnings.push(`MCP not found: ${node.data.mcpId}`);
        description = "Call MCP (MISSING)";
      } else if (!node.data.mcpId) {
        status = "warning";
        warnings.push("No MCP selected");
        description = "Call MCP (none selected)";
      } else {
        if (!mcp!.isConfigured) {
          status = "warning";
          warnings.push(`MCP "${mcp!.name}" not fully configured`);
        }
        description = `Call MCP "${mcp!.name}" → ${node.data.toolName || "?"}`;
      }
      break;
    }
    case "shell":
    case "step":
      description = `Execute: ${node.data.command || "(empty command)"}`;
      if (!node.data.command) {
        status = "warning";
        warnings.push("Empty shell command");
      }
      break;
    case "condition":
      description = `Evaluate: ${node.data.condition || "(no condition)"}`;
      if (!node.data.condition) {
        status = "warning";
        warnings.push("Empty condition");
      }
      break;
    case "branch":
      description = `Branch on: ${node.data.condition || "(no condition)"}`;
      if (!node.data.condition) {
        status = "warning";
        warnings.push("Empty branch condition");
      }
      break;
    case "loop":
      description = `Loop over: ${node.data.collection || "(no collection)"}`;
      if (!node.data.collection) {
        status = "warning";
        warnings.push("Empty loop collection");
      }
      break;
    case "prompt":
      description = `Prompt: "${node.data.prompt || "(empty)"}"`;
      break;
    case "variable":
      description = `Set ${node.data.key || "?"} = ${node.data.value || ""}`;
      break;
    case "template":
      description = "Render template";
      break;
    case "notify":
      description = `Notify: ${node.data.channel || "?"} — "${node.data.message || ""}"`;
      break;
    case "parallel":
      description = "Execute branches in parallel";
      break;
  }

  return {
    nodeId: node.id,
    nodeType: node.type,
    nodeName: node.type,
    status,
    description,
    warnings,
  };
}
