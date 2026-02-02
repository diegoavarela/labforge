import type { Command, FlowNode, FlowEdge } from "@/types";

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

function describeNode(node: FlowNode, edges: FlowEdge[]): string {
  switch (node.type) {
    case "start":
      return `**Start**: ${node.data.commandName || "command"}`;
    case "end":
      return `**End**: Pipeline terminates`;
    case "step":
      return `**Shell**: \`${node.data.command || "..."}\`${node.data.workingDir ? ` (cwd: ${node.data.workingDir})` : ""}`;
    case "shell":
      return `**Shell**: \`${node.data.command || "..."}\`${node.data.workingDir ? ` (cwd: ${node.data.workingDir})` : ""}`;
    case "agent":
      return `**Agent**: ${node.data.agentId || "unset"}${node.data.prompt ? ` — "${node.data.prompt}"` : ""}`;
    case "branch": {
      const trueEdge = edges.find(
        (e) => e.source === node.id && (e.sourceHandle === "pass" || e.sourceHandle === "true")
      );
      const falseEdge = edges.find(
        (e) => e.source === node.id && (e.sourceHandle === "fail" || e.sourceHandle === "false")
      );
      return `**Condition**: \`${node.data.condition || "..."}\`\n  - true → ${trueEdge?.target || "?"}\n  - false → ${falseEdge?.target || "?"}`;
    }
    case "condition": {
      const trueEdge = edges.find(
        (e) => e.source === node.id && (e.sourceHandle === "pass" || e.sourceHandle === "true")
      );
      const falseEdge = edges.find(
        (e) => e.source === node.id && (e.sourceHandle === "fail" || e.sourceHandle === "false")
      );
      return `**Condition**: \`${node.data.condition || "..."}\`\n  - true → ${trueEdge?.target || "?"}\n  - false → ${falseEdge?.target || "?"}`;
    }
    case "loop":
      return `**Loop**: over \`${node.data.collection || "..."}\`${node.data.maxIterations ? ` (max: ${node.data.maxIterations})` : ""}`;
    case "skill":
      return `**Skill**: ${node.data.skillId || "unset"}`;
    case "mcp":
      return `**MCP**: ${node.data.mcpId || "unset"} → ${node.data.toolName || "unset"}`;
    case "prompt":
      return `**Prompt**: "${node.data.prompt || "..."}"`;
    case "variable":
      return `**Variable**: \`${node.data.key || "?"}\` = \`${node.data.value || ""}\``;
    case "template":
      return `**Template**:\n\`\`\`\n${node.data.template || "..."}\n\`\`\``;
    case "notify":
      return `**Notify**: channel=${node.data.channel || "?"}, message="${node.data.message || "..."}"`;
    case "parallel":
      return `**Parallel**: executes branches concurrently`;
  }
}

export function generateCommandMarkdown(command: Command): string {
  const sorted = topoSort(command.nodes, command.edges);
  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: "${command.name}"`);
  if (command.description) lines.push(`description: "${command.description}"`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${command.name}`);
  if (command.description) {
    lines.push("");
    lines.push(command.description);
  }
  lines.push("");
  lines.push("## Pipeline");
  lines.push("");

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i];
    lines.push(`${i + 1}. ${describeNode(node, command.edges)}`);
  }

  lines.push("");
  return lines.join("\n");
}
