"use client";

import { useState } from "react";
import { Sparkles, Sun, Moon, Download, FolderTree } from "lucide-react";
import ExportModal from "@/components/export/ExportModal";
import PreviewModal from "@/components/export/PreviewModal";
import LoginButton from "@/components/auth/LoginButton";
import { useSkillStore } from "@/stores/skill";

export default function Header() {
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const skillName = useSkillStore((s) => s.skillName);
  const version = useSkillStore((s) => s.version);
  const setSkillName = useSkillStore((s) => s.setSkillName);
  const theme = useSkillStore((s) => s.theme);
  const setTheme = useSkillStore((s) => s.setTheme);
  const skillCount = useSkillStore((s) => s.skills.length);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <>
      <header className="bg-bg-secondary border-b border-border-default px-4 py-2 flex items-center gap-4 h-11">
        {/* Brand */}
        <span className="text-sm font-bold tracking-tighter shrink-0 font-mono">
          <span className="text-accent-orange">Lab</span><span className="text-text-primary">Forge</span>
        </span>

        <div className="w-px h-4 bg-border-default" />

        {/* Project name */}
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-skill shrink-0" />
          <input
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="my-skill-project"
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none border-b border-transparent hover:border-border-default focus:border-accent-orange w-40 transition-colors"
          />
          <span className="text-[10px] font-mono text-text-muted shrink-0">
            v{version}
          </span>
        </div>

        {/* Skill count badge */}
        {skillCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-skill/10 text-skill rounded-md font-medium">
            {skillCount} skill{skillCount > 1 ? "s" : ""}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button
            onClick={() => setPreviewOpen(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            title="Preview skill files"
          >
            <FolderTree size={14} />
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <Download size={12} />
            Export
          </button>

          <LoginButton />
        </div>
      </header>
      <PreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}
