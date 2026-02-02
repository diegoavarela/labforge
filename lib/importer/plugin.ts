import JSZip from "jszip";
import type { Skill, Agent, Command, Hook, MCP, SkillFile, FlowNode, FlowEdge } from "@/types";

export interface ParsedPlugin {
  pluginName: string;
  skills: Skill[];
  agents: Agent[];
  commands: Command[];
  hooks: Hook[];
  mcps: MCP[];
  version?: string;
  changelog?: import("@/types").ChangelogEntry[];
  dependencies?: import("@/types").PluginDependency[];
}

import { generateId } from "@/lib/utils/id";

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      meta[key] = val;
    }
  }
  return { meta, body: match[2].trim() };
}

function parseFrontmatterList(content: string, key: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  const lines = match[1].split("\n");
  const items: string[] = [];
  let collecting = false;

  for (const line of lines) {
    if (line.startsWith(`${key}:`)) {
      collecting = true;
      continue;
    }
    if (collecting) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        items.push(trimmed.slice(2).trim());
      } else {
        collecting = false;
      }
    }
  }
  return items;
}

function parseSkill(slug: string, skillMd: string, extraFiles: Map<string, string>): Skill {
  const { meta, body } = parseFrontmatter(skillMd);

  const files: SkillFile[] = [];
  for (const [path, content] of extraFiles) {
    const ext = path.split(".").pop() || "";
    files.push({ path, content, language: ext });
  }

  return {
    id: generateId(),
    name: meta.name || slug,
    description: meta.description || "",
    content: body,
    files,
    source: "local",
    categories: [],
    tags: [],
  };
}

function parseAgent(filename: string, content: string, skills: Skill[], mcps: MCP[]): Agent {
  const { meta, body } = parseFrontmatter(content);

  const allowedTools = parseFrontmatterList(content, "allowedTools");
  const mcpNames = parseFrontmatterList(content, "mcps");
  const skillNames = parseFrontmatterList(content, "skills");

  const mcpIds = mcpNames
    .map((name) => mcps.find((m) => m.name === name)?.id)
    .filter((id): id is string => !!id);
  const skillIds = skillNames
    .map((name) => skills.find((s) => s.name === name)?.id)
    .filter((id): id is string => !!id);

  return {
    id: generateId(),
    name: meta.name || filename.replace(/\.md$/, ""),
    description: meta.description || "",
    model: meta.model || "sonnet",
    context: (meta.context as "fork" | "main") || "fork",
    allowedTools,
    mcpIds,
    skillIds,
    instructions: body,
  };
}

interface PipelineStep {
  label: string;
  details: string[];
}

/** Extract structured pipeline steps from the markdown body */
function extractPipelineSteps(body: string, meta: Record<string, string>): PipelineStep[] {
  const steps: PipelineStep[] = [];
  const bodyLines = body.split("\n");

  // 1) ASCII art pipeline (├──▶ / └──▶)
  const pipelineRegex = /[├└]──▶\s*(.+)/g;
  let match;
  while ((match = pipelineRegex.exec(body)) !== null) {
    const label = match[1].trim();
    const matchLineIdx = body.slice(0, match.index).split("\n").length - 1;
    const details: string[] = [];
    for (let i = matchLineIdx + 1; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (!line.trim() || line.match(/[├└]──▶/) || line.trim() === "```") break;
      const cleaned = line.replace(/^[\s│]+/, "").trim();
      if (cleaned) details.push(cleaned);
    }
    steps.push({ label, details });
  }
  if (steps.length > 0) return steps;

  // 2) ## headings with detail sections
  const headingRegex = /^##\s+(.+)/gm;
  while ((match = headingRegex.exec(body)) !== null) {
    const heading = match[1].trim();
    if (/^(uso|usage|output|flags)/i.test(heading)) continue;
    // Collect body text until next heading
    const afterIdx = match.index + match[0].length;
    const nextHeading = body.indexOf("\n## ", afterIdx);
    const sectionText = body.slice(afterIdx, nextHeading === -1 ? undefined : nextHeading).trim();
    const details = sectionText.split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("```") && !l.startsWith("#"));
    steps.push({ label: heading, details });
  }
  if (steps.length > 0) return steps;

  // 3) Fallback: single step
  steps.push({ label: meta.name || "Step", details: meta.description ? [meta.description] : [] });
  return steps;
}

/** Try to find the agent name referenced in step details (e.g. "Invocar: spec agent" or "Invocar dev agent") */
function extractAgentName(details: string[], label: string): string | null {
  const all = [label, ...details].join("\n");
  // "Invocar: spec agent" or "Invocar spec agent" or "invoke X agent"
  const m = all.match(/invocar[:\s]+(\w+)\s+agent/i) || all.match(/invoke[:\s]+(\w+)\s+agent/i);
  return m ? m[1] : null;
}

/** Extract skills mentioned (e.g. "Lee skills: arch, api-design") */
function extractSkills(details: string[]): string[] {
  const all = details.join("\n");
  const m = all.match(/lee\s+skills?:\s*(.+)/i);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

/** Extract prompt/wait text */
function extractPromptText(details: string[], label: string): string | null {
  const all = [label, ...details].join("\n");
  const m = all.match(/esperar[:\s]*[""]?(.+?)[""]?\s*$/im)
    || all.match(/confirmar[:\s]*(.+)/i)
    || all.match(/⏸️\s*(.+)/);
  return m ? m[1].trim() : null;
}

/** Extract loop max iterations */
function extractMaxIterations(details: string[]): string | null {
  const all = details.join(" ");
  const m = all.match(/(?:máximo|max|loop)\s+(\d+)/i);
  return m ? m[1] : null;
}

/** Extract condition text (e.g. "Si FAIL → volver a FASE 3") */
function extractCondition(details: string[]): string | null {
  for (const d of details) {
    if (/si\s+(fail|hay|falla)/i.test(d) || /if\s+(fail|error)/i.test(d)) return d;
  }
  return null;
}

function generateFlowFromMarkdown(
  body: string,
  meta: Record<string, string>,
  agents: Agent[],
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const Y_STEP = 160;
  const X_CENTER = 250;

  const pipelineSteps = extractPipelineSteps(body, meta);

  // Also parse the ## FASE sections for richer detail (agent invocations, skills, etc.)
  const sectionDetails = new Map<string, string[]>();
  const sectionRegex = /^##\s+(.+)/gm;
  let secMatch;
  while ((secMatch = sectionRegex.exec(body)) !== null) {
    const heading = secMatch[1].trim().toLowerCase();
    const afterIdx = secMatch.index + secMatch[0].length;
    const nextH = body.indexOf("\n## ", afterIdx);
    const text = body.slice(afterIdx, nextH === -1 ? undefined : nextH);
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("```"));
    // Match by FASE number or heading keywords
    const faseMatch = heading.match(/fase\s+(\d+)/);
    if (faseMatch) {
      sectionDetails.set(`fase${faseMatch[1]}`, lines);
    }
    sectionDetails.set(heading, lines);
  }

  // Start node
  const startId = generateId();
  nodes.push({
    id: startId,
    type: "start",
    position: { x: X_CENTER, y: 0 },
    data: { label: meta.name || "Command", commandName: meta.name ? `/${meta.name}` : "" },
  });
  let prevId = startId;
  let y = Y_STEP;

  for (const step of pipelineSteps) {
    // Enrich step details from matching ## section
    const faseMatch = step.label.match(/fase\s+(\d+)/i);
    const sectionKey = faseMatch ? `fase${faseMatch[1]}` : step.label.toLowerCase();
    const enrichedDetails = [...step.details, ...(sectionDetails.get(sectionKey) || [])];

    const agentName = extractAgentName(enrichedDetails, step.label);
    const skills = extractSkills(enrichedDetails);
    const promptText = extractPromptText(enrichedDetails, step.label);
    const maxIter = extractMaxIterations(enrichedDetails);
    const condition = extractCondition(enrichedDetails);

    // Determine node type and data based on extracted info
    let type: FlowNode["type"] = "step";
    let data: Record<string, unknown> = { label: step.label };

    if (agentName) {
      type = "agent";
      const resolved = agents.find((a) => a.name.toLowerCase() === agentName.toLowerCase());
      data = {
        label: step.label,
        agentId: resolved?.id || "",
        prompt: `Invocar ${agentName} agent` + (skills.length ? ` (skills: ${skills.join(", ")})` : ""),
      };
    }

    // A step that has both agent + prompt → split into agent node + prompt node
    if (agentName && promptText) {
      // Agent node
      const agentNodeId = generateId();
      nodes.push({ id: agentNodeId, type: "agent", position: { x: X_CENTER, y }, data });
      edges.push({ id: generateId(), source: prevId, target: agentNodeId });
      prevId = agentNodeId;
      y += Y_STEP;

      // Prompt node
      const promptNodeId = generateId();
      nodes.push({
        id: promptNodeId,
        type: "prompt",
        position: { x: X_CENTER, y },
        data: { label: `Esperar aprobación`, prompt: promptText, placeholder: "" },
      });
      edges.push({ id: generateId(), source: prevId, target: promptNodeId });
      prevId = promptNodeId;
      y += Y_STEP;
      continue;
    }

    // Agent-only node (already built data above)
    if (agentName) {
      // If also has condition (e.g. REVIEW: si FAIL → volver), add condition after agent
      const nodeId = generateId();
      nodes.push({ id: nodeId, type, position: { x: X_CENTER, y }, data });
      edges.push({ id: generateId(), source: prevId, target: nodeId });
      prevId = nodeId;
      y += Y_STEP;

      if (condition) {
        const condId = generateId();
        nodes.push({
          id: condId,
          type: "condition",
          position: { x: X_CENTER, y },
          data: { label: "Check", condition },
        });
        edges.push({ id: generateId(), source: prevId, target: condId });
        prevId = condId;
        y += Y_STEP;
      }

      if (maxIter) {
        const loopId = generateId();
        nodes.push({
          id: loopId,
          type: "loop",
          position: { x: X_CENTER, y },
          data: { label: `Loop (max ${maxIter})`, maxIterations: maxIter, collection: "" },
        });
        edges.push({ id: generateId(), source: prevId, target: loopId });
        prevId = loopId;
        y += Y_STEP;
      }

      continue;
    }

    // Prompt-only
    if (promptText && !agentName) {
      type = "prompt";
      data = { label: step.label, prompt: promptText, placeholder: "" };
    }
    // Loop-only
    else if (maxIter) {
      type = "loop";
      data = { label: step.label, maxIterations: maxIter, collection: "" };
    }
    // Condition-only
    else if (condition) {
      type = "condition";
      data = { label: step.label, condition };
    }
    // Plain step
    else {
      data = { label: step.label, command: enrichedDetails.slice(0, 3).join("; ") };
    }

    const nodeId = generateId();
    nodes.push({ id: nodeId, type, position: { x: X_CENTER, y }, data });
    edges.push({ id: generateId(), source: prevId, target: nodeId });
    prevId = nodeId;
    y += Y_STEP;
  }

  const endId = generateId();
  nodes.push({ id: endId, type: "end", position: { x: X_CENTER, y }, data: {} });
  edges.push({ id: generateId(), source: prevId, target: endId });

  return { nodes, edges };
}

function parseCommand(filename: string, content: string, agents: Agent[] = []): Command {
  const { meta, body } = parseFrontmatter(content);

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Parse the YAML-like nodes/edges from the body
  const sections = body.split(/^(nodes:|edges:)$/m);
  let currentSection = "";

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed === "nodes:") {
      currentSection = "nodes";
      continue;
    }
    if (trimmed === "edges:") {
      currentSection = "edges";
      continue;
    }
    if (!trimmed) continue;

    const items = trimmed.split(/\n  - /).filter(Boolean);
    for (let raw of items) {
      raw = raw.replace(/^- /, "");
      const lines = raw.split("\n").map((l) => l.trim());
      const obj: Record<string, string> = {};
      for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx > 0) {
          obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      }

      if (currentSection === "nodes" && obj.id && obj.type) {
        let position = { x: 0, y: 0 };
        try {
          const posMatch = obj.position?.match(/\{\s*x:\s*([-\d.]+),\s*y:\s*([-\d.]+)\s*\}/);
          if (posMatch) position = { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) };
        } catch { /* keep default */ }

        let data: Record<string, unknown> = {};
        try {
          if (obj.data) data = JSON.parse(obj.data);
        } catch { /* keep empty */ }

        nodes.push({
          id: obj.id,
          type: obj.type as FlowNode["type"],
          position,
          data,
        });
      }

      if (currentSection === "edges" && obj.id && obj.source && obj.target) {
        const edge: FlowEdge = { id: obj.id, source: obj.source, target: obj.target };
        if (obj.sourceHandle) edge.sourceHandle = obj.sourceHandle;
        if (obj.label) edge.label = obj.label;
        edges.push(edge);
      }
    }
  }

  // Fallback: if no nodes were parsed, generate flow from markdown content
  if (nodes.length === 0) {
    const generated = generateFlowFromMarkdown(body, meta, agents);
    nodes.push(...generated.nodes);
    edges.push(...generated.edges);
  }

  return {
    id: generateId(),
    name: meta.name || filename.replace(/\.md$/, ""),
    description: meta.description || "",
    nodes,
    edges,
  };
}

function parseHook(filename: string, content: string): Hook {
  const data = JSON.parse(content);
  return {
    id: generateId(),
    name: filename.replace(/\.json$/, ""),
    enabled: true,
    event: data.event || "",
    matcher: data.matcher || "",
    action: data.action || { type: "bash", config: {} },
  };
}

function parseMCPs(settingsContent: string): MCP[] {
  const settings = JSON.parse(settingsContent);
  const servers = settings.mcpServers || {};
  const mcps: MCP[] = [];

  for (const [slug, config] of Object.entries(servers)) {
    const cfg = config as { command: string; env?: Record<string, string> };
    mcps.push({
      id: generateId(),
      name: slug,
      description: "",
      source: "",
      transport: ["stdio"],
      installCommand: cfg.command || "",
      authType: null,
      tools: [],
      configuredEnvVars: cfg.env || {},
      isConfigured: true,
      categories: [],
      isOfficial: false,
    });
  }

  return mcps;
}

// --- tar.gz support (browser-native gzip + minimal tar parser) ---

interface TarEntry {
  name: string;
  content: string;
  isDir: boolean;
}

async function parseTarGz(file: File): Promise<TarEntry[]> {
  const ds = new DecompressionStream("gzip");
  const decompressed = file.stream().pipeThrough(ds);
  const buf = await new Response(decompressed).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const decoder = new TextDecoder();
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.slice(offset, offset + 512);
    // Empty block = end of archive
    if (header.every((b) => b === 0)) break;

    // name: bytes 0-99
    let name = decoder.decode(header.slice(0, 100)).replace(/\0.*$/, "");
    // prefix: bytes 345-499 (ustar)
    const prefix = decoder.decode(header.slice(345, 500)).replace(/\0.*$/, "");
    if (prefix) name = prefix + "/" + name;

    // Strip leading "./" or leading directory component (like zip root)
    name = name.replace(/^\.\//, "");

    // size: bytes 124-135 (octal)
    const sizeStr = decoder.decode(header.slice(124, 136)).replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    // type: byte 156
    const typeFlag = String.fromCharCode(header[156]);
    const isDir = typeFlag === "5" || name.endsWith("/");

    offset += 512;

    let content = "";
    if (size > 0) {
      content = decoder.decode(bytes.slice(offset, offset + size));
      // Advance past data blocks (512-byte aligned)
      offset += Math.ceil(size / 512) * 512;
    }

    if (name) entries.push({ name, content, isDir });
  }

  return entries;
}

function buildFilesMapFromTar(entries: TarEntry[]): Map<string, string> {
  // Strip common root prefix (e.g. "my-plugin/")
  const fileEntries = entries.filter((e) => !e.isDir && e.name);
  if (fileEntries.length === 0) return new Map();

  const parts = fileEntries[0].name.split("/");
  let commonPrefix = "";
  if (parts.length > 1) {
    const candidate = parts[0] + "/";
    if (fileEntries.every((e) => e.name.startsWith(candidate))) {
      commonPrefix = candidate;
    }
  }

  const map = new Map<string, string>();
  for (const e of fileEntries) {
    const path = commonPrefix ? e.name.slice(commonPrefix.length) : e.name;
    if (path) map.set(path, e.content);
  }
  return map;
}

async function parsePluginFromTar(file: File): Promise<ParsedPlugin> {
  const entries = await parseTarGz(file);
  const files = buildFilesMapFromTar(entries);

  // Detect root dir name from tar (e.g. "kaostc-plugin")
  const fileEntries = entries.filter((e) => !e.isDir && e.name);
  const firstParts = fileEntries[0]?.name.split("/");
  const rootDirName = (firstParts && firstParts.length > 1) ? firstParts[0] : "";

  const result: ParsedPlugin = {
    pluginName: "",
    skills: [],
    agents: [],
    commands: [],
    hooks: [],
    mcps: [],
  };

  // plugin.json
  const pluginJsonContent = files.get("plugin.json");
  if (pluginJsonContent) {
    try {
      const data = JSON.parse(pluginJsonContent);
      result.pluginName = data.name || "";
    } catch { /* ignore */ }
  }

  // Fallback: README.md # heading
  if (!result.pluginName) {
    const readme = files.get("README.md");
    if (readme) {
      const m = readme.match(/^#\s+(.+)/m);
      if (m) result.pluginName = m[1].trim();
    }
  }

  // Fallback: root directory name
  if (!result.pluginName && rootDirName) {
    result.pluginName = rootDirName;
  }

  // Fallback: filename without extension
  if (!result.pluginName) {
    result.pluginName = file.name.replace(/\.(tar\.gz|tgz)$/i, "");
  }

  // MCPs
  const settingsContent = files.get(".claude/settings.json");
  if (settingsContent) {
    try { result.mcps = parseMCPs(settingsContent); } catch { /* ignore */ }
  }

  // Skills
  const skillDirs = new Map<string, { skillMd: string; extra: Map<string, string> }>();
  for (const [path, content] of files) {
    const match = path.match(/^skills\/([^/]+)\/(.+)$/);
    if (!match) continue;
    const [, slug, filename] = match;
    if (!skillDirs.has(slug)) skillDirs.set(slug, { skillMd: "", extra: new Map() });
    const dir = skillDirs.get(slug)!;
    if (filename === "SKILL.md") dir.skillMd = content;
    else dir.extra.set(filename, content);
  }
  for (const [slug, dir] of skillDirs) {
    if (!dir.skillMd) continue;
    result.skills.push(parseSkill(slug, dir.skillMd, dir.extra));
  }

  // Agents
  for (const [path, content] of files) {
    if (!path.match(/^agents\/[^/]+\.md$/)) continue;
    const filename = path.split("/").pop()!;
    result.agents.push(parseAgent(filename, content, result.skills, result.mcps));
  }

  // Commands
  for (const [path, content] of files) {
    if (!path.match(/^commands\/[^/]+\.md$/)) continue;
    const filename = path.split("/").pop()!;
    result.commands.push(parseCommand(filename, content, result.agents));
  }

  // Hooks
  for (const [path, content] of files) {
    if (!path.match(/^hooks\/[^/]+\.json$/)) continue;
    const filename = path.split("/").pop()!;
    result.hooks.push(parseHook(filename, content));
  }

  return result;
}

// --- Unified entry point ---

export async function parsePluginArchive(file: File): Promise<ParsedPlugin> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) {
    return parsePluginFromTar(file);
  }
  return parsePluginZip(file);
}

export async function parsePluginZip(file: File): Promise<ParsedPlugin> {
  const zip = await JSZip.loadAsync(file);

  const result: ParsedPlugin = {
    pluginName: "",
    skills: [],
    agents: [],
    commands: [],
    hooks: [],
    mcps: [],
  };

  // 1. plugin.json → pluginName
  const pluginJson = zip.file("plugin.json");
  if (pluginJson) {
    try {
      const data = JSON.parse(await pluginJson.async("string"));
      result.pluginName = data.name || "";
    } catch { /* ignore */ }
  }

  // Fallback: README.md # heading
  if (!result.pluginName) {
    const readme = zip.file("README.md");
    if (readme) {
      try {
        const text = await readme.async("string");
        const m = text.match(/^#\s+(.+)/m);
        if (m) result.pluginName = m[1].trim();
      } catch { /* ignore */ }
    }
  }

  // Fallback: filename
  if (!result.pluginName) {
    result.pluginName = file.name.replace(/\.zip$/i, "");
  }

  // 2. MCPs first (agents reference them)
  const settingsFile = zip.file(".claude/settings.json");
  if (settingsFile) {
    try {
      result.mcps = parseMCPs(await settingsFile.async("string"));
    } catch { /* ignore */ }
  }

  // 3. Skills (agents reference them)
  const skillDirs = new Map<string, { skillMd: string; files: Map<string, string> }>();
  zip.forEach((path, entry) => {
    const match = path.match(/^skills\/([^/]+)\/(.+)$/);
    if (!match || entry.dir) return;
    const [, slug, filename] = match;
    if (!skillDirs.has(slug)) skillDirs.set(slug, { skillMd: "", files: new Map() });
    const dir = skillDirs.get(slug)!;
    // We'll read content below
    if (filename === "SKILL.md") {
      dir.skillMd = path;
    } else {
      dir.files.set(filename, path);
    }
  });

  for (const [slug, dir] of skillDirs) {
    if (!dir.skillMd) continue;
    const skillContent = await zip.file(dir.skillMd)!.async("string");
    const extraFiles = new Map<string, string>();
    for (const [filename, path] of dir.files) {
      extraFiles.set(filename, await zip.file(path)!.async("string"));
    }
    result.skills.push(parseSkill(slug, skillContent, extraFiles));
  }

  // 4. Agents
  zip.forEach((path, entry) => {
    if (entry.dir || !path.match(/^agents\/[^/]+\.md$/)) return;
  });
  const agentFiles = Object.keys(zip.files).filter(
    (p) => p.match(/^agents\/[^/]+\.md$/) && !zip.files[p].dir
  );
  for (const path of agentFiles) {
    const content = await zip.file(path)!.async("string");
    const filename = path.split("/").pop()!;
    result.agents.push(parseAgent(filename, content, result.skills, result.mcps));
  }

  // 5. Commands
  const commandFiles = Object.keys(zip.files).filter(
    (p) => p.match(/^commands\/[^/]+\.md$/) && !zip.files[p].dir
  );
  for (const path of commandFiles) {
    const content = await zip.file(path)!.async("string");
    const filename = path.split("/").pop()!;
    result.commands.push(parseCommand(filename, content, result.agents));
  }

  // 6. Hooks
  const hookFiles = Object.keys(zip.files).filter(
    (p) => p.match(/^hooks\/[^/]+\.json$/) && !zip.files[p].dir
  );
  for (const path of hookFiles) {
    const content = await zip.file(path)!.async("string");
    const filename = path.split("/").pop()!;
    result.hooks.push(parseHook(filename, content));
  }

  return result;
}
