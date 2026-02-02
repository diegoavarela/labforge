"use client";

import { useState } from "react";
import { Package, Sun, Moon, Download, FolderTree } from "lucide-react";
import ExportModal from "@/components/export/ExportModal";
import PreviewModal from "@/components/export/PreviewModal";
import LoginButton from "@/components/auth/LoginButton";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";

export default function Header() {
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const pluginName = usePluginStore((s) => s.pluginName);
  const version = usePluginStore((s) => s.version);
  const setPluginName = usePluginStore((s) => s.setPluginName);
  const theme = usePluginStore((s) => s.theme);
  const setTheme = usePluginStore((s) => s.setTheme);
  const counts = usePluginStore(
    useShallow((s) => ({
      skills: s.skills.length,
      agents: s.agents.length,
      commands: s.commands.length,
      hooks: s.hooks.length,
      mcps: s.mcps.length,
    }))
  );

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <>
      <header className="bg-bg-secondary border-b border-border-default px-4 py-2 flex items-center gap-4 h-11">
        {/* Brand */}
        <span className="text-sm font-semibold text-text-primary tracking-tight shrink-0">
          Plugin Forge
        </span>

        <div className="w-px h-4 bg-border-default" />

        {/* Plugin name */}
        <div className="flex items-center gap-2 min-w-0">
          <Package size={14} className="text-accent-orange shrink-0" />
          <input
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
            placeholder="my-plugin"
            className="bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none border-b border-transparent hover:border-border-default focus:border-accent-orange w-40 transition-colors"
          />
          <span className="text-[10px] font-mono text-text-muted shrink-0">
            v{version}
          </span>
        </div>

        {/* Component badges */}
        <div className="flex gap-1.5 items-center">
          {counts.commands > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-command/10 text-command rounded-md font-medium">
              {counts.commands} cmd{counts.commands > 1 ? "s" : ""}
            </span>
          )}
          {counts.agents > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-agent/10 text-agent rounded-md font-medium">
              {counts.agents} agent{counts.agents > 1 ? "s" : ""}
            </span>
          )}
          {counts.skills > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-skill/10 text-skill rounded-md font-medium">
              {counts.skills} skill{counts.skills > 1 ? "s" : ""}
            </span>
          )}
          {counts.mcps > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-mcp/10 text-mcp rounded-md font-medium">
              {counts.mcps} mcp{counts.mcps > 1 ? "s" : ""}
            </span>
          )}
        </div>

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
            title="Preview plugin files"
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
