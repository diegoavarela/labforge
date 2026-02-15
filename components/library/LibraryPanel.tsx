"use client";

import { Trash2, Plus } from "lucide-react";
import { useLibraryStore } from "@/stores/library";
import { useSkillStore } from "@/stores/skill";

export default function LibraryPanel() {
  const projects = useLibraryStore((s) => s.projects);
  const activeProjectId = useLibraryStore((s) => s.activeProjectId);
  const saveCurrentProject = useLibraryStore((s) => s.saveCurrentProject);
  const loadProject = useLibraryStore((s) => s.loadProject);
  const deleteProject = useLibraryStore((s) => s.deleteProject);
  const createNewProject = useLibraryStore((s) => s.createNewProject);
  const setActiveProjectId = useLibraryStore((s) => s.setActiveProjectId);

  const getSkillProjectData = useSkillStore((s) => s.getSkillProjectData);
  const hydrate = useSkillStore((s) => s.hydrate);
  const resetProject = useSkillStore((s) => s.resetProject);

  const handleSwitch = (id: string) => {
    if (id === activeProjectId) return;
    saveCurrentProject(getSkillProjectData());
    const saved = loadProject(id);
    if (saved) {
      hydrate(saved.data);
      setActiveProjectId(id);
    }
  };

  const handleNewProject = () => {
    saveCurrentProject(getSkillProjectData());
    resetProject();
    createNewProject();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wasActive = id === activeProjectId;
    deleteProject(id);
    if (wasActive) {
      resetProject();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      <button
        onClick={handleNewProject}
        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-text-secondary border border-dashed border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
      >
        <Plus size={12} />
        New Project
      </button>

      {sorted.length === 0 && (
        <p className="text-[11px] text-text-muted text-center py-4">
          No saved projects yet.
        </p>
      )}

      {sorted.map((p) => {
        const isActive = p.id === activeProjectId;
        const skillCount = p.data.skills?.length || 0;

        return (
          <div
            key={p.id}
            onClick={() => handleSwitch(p.id)}
            className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
              isActive
                ? "bg-accent-orange/10 border border-accent-orange/30"
                : "hover:bg-bg-hover border border-transparent"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-text-primary truncate">
                  {p.skillName || "Untitled"}
                </span>
                {isActive && (
                  <span className="text-[9px] px-1 py-0.5 bg-accent-orange/20 text-accent-orange rounded font-medium">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-text-muted">
                  {skillCount} skill{skillCount !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-text-muted">
                  {formatDate(p.updatedAt)}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => handleDelete(e, p.id)}
              className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
              title="Delete project"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
