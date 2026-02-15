/**
 * Flow Graph → SKILL.md generator
 * Flow Graph → Shell script generator
 *
 * Converts React Flow nodes/edges back into readable formats.
 */

import type { FlowGraph, FlowNode } from "@/types/flow";

/**
 * Topologically sort nodes following edges from start.
 */
function topoSort(graph: FlowGraph): FlowNode[] {
  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const result: FlowNode[] = [];

  // Find start node
  const startNode = graph.nodes.find((n) => n.data.nodeType === "start");
  if (!startNode) return graph.nodes;

  function dfs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodeMap.get(id);
    if (node) result.push(node);
    for (const next of adj.get(id) || []) {
      dfs(next);
    }
  }

  dfs(startNode.id);

  // Add any unvisited nodes
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) result.push(node);
  }

  return result;
}

/**
 * Generate SKILL.md from a flow graph.
 */
export function flowToSkillMd(graph: FlowGraph): string {
  const sorted = topoSort(graph);
  const lines: string[] = [];

  for (const node of sorted) {
    const { nodeType, label, description, command, condition, retryCount, fixStrategy, endpoint, method } = node.data;

    if (nodeType === "start" || nodeType === "end") continue;

    lines.push(`## ${label}`);
    lines.push("");

    if (description) {
      lines.push(description);
      lines.push("");
    }

    switch (nodeType) {
      case "shell":
        if (command) {
          lines.push("```bash");
          lines.push(command);
          lines.push("```");
          lines.push("");
        }
        break;

      case "decision":
        if (condition) {
          lines.push(`**Condition:** ${condition}`);
          lines.push("");
        }
        break;

      case "retry":
        lines.push(`**Retry:** ${retryCount ?? 3} attempts`);
        if (fixStrategy) {
          lines.push(`**Auto-fix:** ${fixStrategy}`);
        }
        lines.push("");
        break;

      case "apiCall":
        if (endpoint) {
          lines.push(`**${method || "GET"}** \`${endpoint}\``);
          lines.push("");
        }
        break;

      case "parallel":
        lines.push("*Runs in parallel*");
        lines.push("");
        break;

      default:
        break;
    }
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Generate a shell script from a flow graph.
 */
export function flowToShellScript(graph: FlowGraph): string {
  const sorted = topoSort(graph);
  const lines: string[] = [
    "#!/bin/bash",
    "set -euo pipefail",
    "",
    '# Auto-generated from LabForge Flow Visualizer',
    "",
  ];

  let stepNum = 0;

  for (const node of sorted) {
    const { nodeType, label, command, condition, retryCount, fixStrategy, endpoint, method } = node.data;

    if (nodeType === "start") {
      lines.push('echo "🚀 Starting pipeline..."');
      lines.push("");
      continue;
    }

    if (nodeType === "end") {
      lines.push('echo "✅ Pipeline complete."');
      continue;
    }

    stepNum++;
    lines.push(`# --- Step ${stepNum}: ${label} ---`);

    switch (nodeType) {
      case "step":
        lines.push(`echo "→ ${label}"`);
        if (command) lines.push(command);
        break;

      case "shell":
        lines.push(`echo "→ ${label}"`);
        if (command) {
          lines.push(command);
        } else {
          lines.push(`echo "  (no command defined)"`);
        }
        break;

      case "decision":
        lines.push(`echo "→ Checking: ${label}"`);
        lines.push(`if ${condition || "true"}; then`);
        lines.push(`  echo "  ✓ Condition passed"`);
        lines.push("else");
        lines.push(`  echo "  ✗ Condition failed"`);
        lines.push("  exit 1");
        lines.push("fi");
        break;

      case "retry": {
        const count = retryCount ?? 3;
        const fix = fixStrategy || "";
        lines.push(`echo "→ ${label} (with retry)"`);
        lines.push("RETRY_COUNT=0");
        lines.push(`MAX_RETRIES=${count}`);
        lines.push("while true; do");
        lines.push("  if ${COMMAND:-true}; then");
        lines.push("    break");
        lines.push("  fi");
        lines.push("  RETRY_COUNT=$((RETRY_COUNT + 1))");
        lines.push("  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then");
        lines.push(`    echo "  ✗ Failed after $MAX_RETRIES retries"`);
        lines.push("    exit 1");
        lines.push("  fi");
        if (fix && fix !== "auto") {
          lines.push(`  echo "  Attempting fix..."`);
          lines.push(`  ${fix}`);
        }
        lines.push(`  echo "  Retrying ($RETRY_COUNT/$MAX_RETRIES)..."`);
        lines.push("  sleep 2");
        lines.push("done");
        break;
      }

      case "parallel":
        lines.push(`echo "→ ${label} (parallel)"`);
        lines.push("# Add parallel commands here, e.g.:");
        lines.push("# command1 &");
        lines.push("# command2 &");
        lines.push("# wait");
        break;

      case "apiCall":
        lines.push(`echo "→ ${label}"`);
        if (endpoint) {
          lines.push(`curl -s -X ${method || "GET"} "${endpoint}"`);
        } else {
          lines.push('echo "  (no endpoint defined)"');
        }
        break;
    }

    lines.push("");
  }

  return lines.join("\n");
}
