export const pluginTools = [
  {
    name: "create_skill",
    description: "Create a new skill in the plugin. Skills are markdown instruction files.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID for the skill (format: 8-4-4-4-12 hex)" },
        name: { type: "string", description: "Skill name" },
        description: { type: "string", description: "Brief description" },
        content: { type: "string", description: "Markdown content" },
      },
      required: ["id", "name", "description", "content"],
    },
  },
  {
    name: "create_agent",
    description: "Create a new agent. Agents are AI workers that execute tasks.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID" },
        name: { type: "string" },
        description: { type: "string" },
        model: { type: "string" },
        instructions: { type: "string" },
        allowedTools: { type: "array", items: { type: "string" } },
        skillIds: { type: "array", items: { type: "string" }, description: "IDs of skills to attach" },
        mcpIds: { type: "array", items: { type: "string" }, description: "IDs of MCPs to attach" },
      },
      required: ["id", "name", "description", "instructions"],
    },
  },
  {
    name: "add_mcp",
    description: "Add an MCP server integration to the plugin.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        source: { type: "string" },
        transport: { type: "array", items: { type: "string" } },
        installCommand: { type: "string" },
      },
      required: ["id", "name", "description", "source", "installCommand"],
    },
  },
  {
    name: "create_command",
    description: "Create a new command (visual flow/pipeline) in the plugin.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        nodes: { type: "array", description: "Flow nodes array" },
        edges: { type: "array", description: "Flow edges array" },
      },
      required: ["id", "name", "description", "nodes", "edges"],
    },
  },
  {
    name: "create_hook",
    description: "Create a new event-driven hook.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        event: { type: "string" },
        matcher: { type: "string" },
        action: { type: "object" },
      },
      required: ["id", "name", "event", "action"],
    },
  },
];
