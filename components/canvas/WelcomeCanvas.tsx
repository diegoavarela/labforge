"use client";

import { Sparkles } from "lucide-react";
import { generateId } from "@/lib/utils/id";
import { useSkillStore } from "@/stores/skill";
import { useShallow } from "zustand/react/shallow";

export default function WelcomeCanvas() {
  const { skillName, skills, selectItem } = useSkillStore(
    useShallow((s) => ({
      skillName: s.skillName,
      skills: s.skills,
      selectItem: s.selectItem,
    }))
  );

  const addSkill = useSkillStore((s) => s.addSkill);

  const handleQuickCreate = () => {
    const id = generateId();
    addSkill({
      id,
      name: "new-skill",
      description: "",
      skillMd: "# New Skill\n\nDescribe your skill instructions here.\n",
      scripts: [],
      metadata: {},
      source: "local",
    });
    selectItem(id, "skill");
  };

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            LabForge
          </h1>
          <p className="text-sm text-text-secondary">
            Visual IDE for OpenClaw Skills. Describe what you want in the chat, or:
          </p>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={handleQuickCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer text-skill border-skill/20 hover:bg-skill/5"
          >
            <Sparkles size={14} />
            + New Skill
          </button>
        </div>

        {skills.length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {skillName || "Your Project"}
              </span>
              <span className="text-xs text-text-muted">
                {skills.length} skill{skills.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {skills.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectItem(s.id, "skill")}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Sparkles size={11} className="text-skill" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-text-muted ml-auto">{s.scripts.length} scripts</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
