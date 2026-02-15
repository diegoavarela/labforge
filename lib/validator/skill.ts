import type { SkillStoreState } from "@/types";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  severity: ValidationSeverity;
  component: "skill" | "project";
  componentId: string;
  componentName: string;
  message: string;
  fix?: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  isValid: boolean;
}

export function validateSkill(state: SkillStoreState): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Project-level
  if (!state.skillName?.trim()) {
    issues.push({
      severity: "error",
      component: "project",
      componentId: "",
      componentName: "Project",
      message: "Project name is empty",
      fix: "Set a project name",
    });
  }

  // Skills
  for (const skill of state.skills) {
    // SKILL.md content
    if (!skill.skillMd?.trim()) {
      issues.push({
        severity: "warning",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "SKILL.md has no content",
        fix: "Add content to the skill",
      });
    }

    // Frontmatter validation (name, description)
    if (!skill.name?.trim()) {
      issues.push({
        severity: "error",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name || "Unnamed",
        message: "Skill name is required",
      });
    }

    if (!skill.description?.trim()) {
      issues.push({
        severity: "warning",
        component: "skill",
        componentId: skill.id,
        componentName: skill.name,
        message: "Skill description is empty",
        fix: "Add a description",
      });
    }

    // Script validation
    for (const script of skill.scripts) {
      if (!script.content?.trim()) {
        issues.push({
          severity: "error",
          component: "skill",
          componentId: skill.id,
          componentName: skill.name,
          message: `Empty script file: ${script.filename}`,
          fix: "Add content or remove the script",
        });
      } else {
        // Check shebang
        const firstLine = script.content.split("\n")[0];
        if (!firstLine.startsWith("#!")) {
          issues.push({
            severity: "warning",
            component: "skill",
            componentId: skill.id,
            componentName: skill.name,
            message: `Script ${script.filename} missing shebang (e.g. #!/bin/bash)`,
            fix: "Add a shebang line at the top",
          });
        }

        // Check encoding (basic: look for null bytes)
        if (script.content.includes("\0")) {
          issues.push({
            severity: "error",
            component: "skill",
            componentId: skill.id,
            componentName: skill.name,
            message: `Script ${script.filename} contains null bytes (bad encoding)`,
          });
        }
      }
    }
  }

  return { issues, isValid: !issues.some((i) => i.severity === "error") };
}
