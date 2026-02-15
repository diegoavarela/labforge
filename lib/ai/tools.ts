export const skillTools = [
  {
    name: "create_skill",
    description: "Create a new skill with SKILL.md content and optional script files.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "UUID for the skill (format: 8-4-4-4-12 hex)" },
        name: { type: "string", description: "Skill name" },
        description: { type: "string", description: "Brief description" },
        skillMd: { type: "string", description: "SKILL.md markdown content" },
        scripts: {
          type: "array",
          description: "Script files for this skill",
          items: {
            type: "object",
            properties: {
              filename: { type: "string", description: "e.g. scripts/deploy.sh" },
              content: { type: "string", description: "Script file content" },
              language: { type: "string", description: "bash, python, etc." },
            },
            required: ["filename", "content", "language"],
          },
        },
      },
      required: ["id", "name", "description", "skillMd"],
    },
  },
  {
    name: "edit_skill_md",
    description: "Edit the SKILL.md content of the currently selected skill.",
    input_schema: {
      type: "object" as const,
      properties: {
        skillId: { type: "string", description: "ID of the skill to edit" },
        skillMd: { type: "string", description: "New SKILL.md content" },
      },
      required: ["skillId", "skillMd"],
    },
  },
  {
    name: "add_script",
    description: "Add a new script file to an existing skill.",
    input_schema: {
      type: "object" as const,
      properties: {
        skillId: { type: "string", description: "ID of the skill" },
        filename: { type: "string", description: "Script filename (e.g. scripts/build.sh)" },
        content: { type: "string", description: "Script file content" },
        language: { type: "string", description: "bash, python, etc." },
      },
      required: ["skillId", "filename", "content", "language"],
    },
  },
];
