"use client";

import { useState, useCallback } from "react";
import { generateId } from "@/lib/utils/id";
import { Search, Plus, X, Copy, Sparkles } from "lucide-react";
import { useSkillStore } from "@/stores/skill";
import { useShallow } from "zustand/react/shallow";

export default function InventoryPanel() {
  const [search, setSearch] = useState("");

  const { skills, selectedItemId, selectItem } = useSkillStore(
    useShallow((s) => ({
      skills: s.skills,
      selectedItemId: s.selectedItemId,
      selectItem: s.selectItem,
    }))
  );

  const addSkill = useSkillStore((s) => s.addSkill);
  const removeSkill = useSkillStore((s) => s.removeSkill);
  const duplicateSkill = useSkillStore((s) => s.duplicateSkill);

  const filteredSkills = search
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase())
      )
    : skills;

  const handleAdd = useCallback(() => {
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
  }, [addSkill, selectItem]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-7 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
          />
        </div>
      </div>

      {/* Skills header */}
      <div className="flex items-center justify-between px-3 py-1.5 group">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          <Sparkles size={12} className="text-skill" />
          Skills
          <span className="text-text-muted font-normal">({filteredSkills.length})</span>
        </span>
        <button
          onClick={handleAdd}
          className="text-text-muted hover:text-text-primary transition-all cursor-pointer p-0.5 rounded hover:bg-bg-tertiary"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Skills list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {filteredSkills.map((skill) => (
          <div
            key={skill.id}
            className={`group/item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
              selectedItemId === skill.id
                ? "bg-bg-hover text-text-primary"
                : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
            onClick={() => selectItem(skill.id, "skill")}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-skill" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{skill.name}</div>
              {skill.description && (
                <div className="truncate text-[10px] text-text-muted">{skill.description}</div>
              )}
            </div>
            <span className="text-[9px] text-text-muted shrink-0">
              {skill.scripts.length} script{skill.scripts.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-all shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSkill(skill.id);
                }}
                className="text-text-muted hover:text-text-primary transition-colors p-0.5 rounded hover:bg-bg-tertiary cursor-pointer"
                title="Duplicate"
              >
                <Copy size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSkill(skill.id);
                }}
                className="text-red-400 hover:text-red-300 transition-all p-0.5 rounded hover:bg-red-500/10 cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
        {filteredSkills.length === 0 && (
          <div className="px-3 py-4 text-[10px] text-text-muted text-center">
            {search ? "No matching skills" : "No skills yet — create one to get started"}
          </div>
        )}
      </div>
    </div>
  );
}
