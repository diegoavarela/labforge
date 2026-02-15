/**
 * SKILL.md → Flow Graph parser
 *
 * Extracts steps from markdown structure and produces a React Flow graph.
 * Heuristics:
 *   - ## headers → step nodes
 *   - ```bash blocks → shell nodes
 *   - Lines with "if", "check", "validate", "decide" → decision nodes
 *   - Lines with "retry", "error", "fix" → retry nodes
 *   - Lines with "parallel", "concurrent" → parallel nodes
 *   - Lines with "api", "fetch", "request", "endpoint" → apiCall nodes
 */

import type { FlowGraph, FlowNode, FlowEdge, FlowNodeType, FlowNodeData } from "@/types/flow";

let _idCounter = 0;
function nextId(): string {
  return `flow_${++_idCounter}`;
}

function resetIds(): void {
  _idCounter = 0;
}

interface ParsedStep {
  label: string;
  type: FlowNodeType;
  description?: string;
  command?: string;
  condition?: string;
  retryCount?: number;
  fixStrategy?: string;
  endpoint?: string;
  method?: string;
}

const DECISION_KEYWORDS = /\b(if|check|validate|verify|decide|condition|whether)\b/i;
const RETRY_KEYWORDS = /\b(retry|error|fail|fix|recover|rollback)\b/i;
const PARALLEL_KEYWORDS = /\b(parallel|concurrent|simultaneous|fork)\b/i;
const API_KEYWORDS = /\b(api|fetch|request|endpoint|http|curl|webhook)\b/i;

function classifyStep(text: string, hasCommand: boolean): FlowNodeType {
  if (DECISION_KEYWORDS.test(text)) return "decision";
  if (RETRY_KEYWORDS.test(text)) return "retry";
  if (PARALLEL_KEYWORDS.test(text)) return "parallel";
  if (API_KEYWORDS.test(text)) return "apiCall";
  if (hasCommand) return "shell";
  return "step";
}

/**
 * Parse a SKILL.md string into flow steps.
 */
function extractSteps(markdown: string): ParsedStep[] {
  const steps: ParsedStep[] = [];
  const lines = markdown.split("\n");

  let currentHeader = "";
  let currentBody: string[] = [];
  let currentCommand = "";
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeContent: string[] = [];

  function flush() {
    if (!currentHeader) return;
    const bodyText = currentBody.join(" ").trim();
    const combinedText = `${currentHeader} ${bodyText}`;
    const hasCommand = !!currentCommand;
    const type = classifyStep(combinedText, hasCommand);

    const step: ParsedStep = {
      label: currentHeader,
      type,
      description: bodyText || undefined,
      command: currentCommand || undefined,
    };

    if (type === "decision") {
      step.condition = bodyText || currentHeader;
    }
    if (type === "retry") {
      step.retryCount = 3;
      step.fixStrategy = currentCommand || "auto";
    }
    if (type === "apiCall") {
      const urlMatch = combinedText.match(/https?:\/\/\S+/);
      step.endpoint = urlMatch?.[0];
      const methodMatch = combinedText.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i);
      step.method = methodMatch?.[1]?.toUpperCase();
    }

    steps.push(step);
    currentHeader = "";
    currentBody = [];
    currentCommand = "";
  }

  for (const line of lines) {
    // Track code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        if (codeBlockLang === "bash" || codeBlockLang === "sh" || codeBlockLang === "shell") {
          currentCommand = codeContent.join("\n");
        }
        inCodeBlock = false;
        codeContent = [];
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.replace("```", "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Headers become steps
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      flush();
      // Skip frontmatter-like headers (the skill title)
      const headerText = headerMatch[1].replace(/[🚀🔧⚡️📦✅❌🔄⭐️]/g, "").trim();
      if (headerText) {
        currentHeader = headerText;
      }
      continue;
    }

    // Bullet items under a header
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch && !currentHeader) {
      // Top-level bullets become steps too
      currentHeader = bulletMatch[1].replace(/\*\*/g, "").trim();
      continue;
    }

    if (currentHeader && line.trim()) {
      currentBody.push(line.trim());
    }
  }

  flush();
  return steps;
}

/**
 * Parse shell script content into flow steps.
 */
export function parseShellScript(script: string): ParsedStep[] {
  const steps: ParsedStep[] = [];
  const lines = script.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Comments that look like section headers
    const commentMatch = trimmed.match(/^#\s*[-=]*\s*(.+?)\s*[-=]*$/);
    if (commentMatch) {
      const label = commentMatch[1].trim();
      if (label && !label.startsWith("!") && label.length > 2) {
        steps.push({ label, type: "step" });
      }
      continue;
    }

    // Function definitions
    const funcMatch = trimmed.match(/^(\w+)\s*\(\)\s*\{/);
    if (funcMatch) {
      const name = funcMatch[1]
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      steps.push({ label: name, type: "shell", command: funcMatch[1] + "()" });
      continue;
    }
  }

  return steps;
}

/**
 * Convert parsed steps into a positioned React Flow graph.
 */
function stepsToGraph(steps: ParsedStep[]): FlowGraph {
  resetIds();
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const Y_SPACING = 100;
  const X_CENTER = 250;

  // Start node
  const startId = nextId();
  nodes.push({
    id: startId,
    type: "flowNode",
    position: { x: X_CENTER, y: 0 },
    data: { label: "Start", nodeType: "start" },
  });

  let prevId = startId;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const nodeId = nextId();
    const y = (i + 1) * Y_SPACING;

    const data: FlowNodeData = {
      label: step.label,
      nodeType: step.type,
      description: step.description,
      command: step.command,
      condition: step.condition,
      retryCount: step.retryCount,
      fixStrategy: step.fixStrategy,
      endpoint: step.endpoint,
      method: step.method,
    };

    nodes.push({
      id: nodeId,
      type: "flowNode",
      position: { x: X_CENTER, y },
      data,
    });

    edges.push({
      id: `e_${prevId}_${nodeId}`,
      source: prevId,
      target: nodeId,
      type: "smoothstep",
    });

    prevId = nodeId;
  }

  // End node
  const endId = nextId();
  nodes.push({
    id: endId,
    type: "flowNode",
    position: { x: X_CENTER, y: (steps.length + 1) * Y_SPACING },
    data: { label: "End", nodeType: "end" },
  });

  edges.push({
    id: `e_${prevId}_${endId}`,
    source: prevId,
    target: endId,
    type: "smoothstep",
  });

  return { nodes, edges };
}

/**
 * Main entry: parse SKILL.md content into a flow graph.
 */
export function parseSkillMdToFlow(skillMd: string): FlowGraph {
  const steps = extractSteps(skillMd);
  if (steps.length === 0) {
    resetIds();
    return {
      nodes: [
        { id: "flow_1", type: "flowNode", position: { x: 250, y: 0 }, data: { label: "Start", nodeType: "start" } },
        { id: "flow_2", type: "flowNode", position: { x: 250, y: 100 }, data: { label: "End", nodeType: "end" } },
      ],
      edges: [
        { id: "e_flow_1_flow_2", source: "flow_1", target: "flow_2", type: "smoothstep" },
      ],
    };
  }
  return stepsToGraph(steps);
}

/**
 * Parse a shell script into a flow graph.
 */
export function parseShellToFlow(script: string): FlowGraph {
  const steps = parseShellScript(script);
  return stepsToGraph(steps);
}
