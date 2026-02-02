"use client";

import { useRef } from "react";
import { Trash2, Plus, Upload } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useLibraryStore } from "@/stores/library";
import { usePluginStore } from "@/stores/plugin";
import { parsePluginArchive } from "@/lib/importer/plugin";

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
  const plugins = useLibraryStore((s) => s.plugins);
  const activePluginId = useLibraryStore((s) => s.activePluginId);
  const saveCurrentPlugin = useLibraryStore((s) => s.saveCurrentPlugin);
  const loadPlugin = useLibraryStore((s) => s.loadPlugin);
  const deletePlugin = useLibraryStore((s) => s.deletePlugin);
  const createNewPlugin = useLibraryStore((s) => s.createNewPlugin);
  const setActivePluginId = useLibraryStore((s) => s.setActivePluginId);
  const importAsNewPlugin = useLibraryStore((s) => s.importAsNewPlugin);

  const getPluginData = usePluginStore((s) => s.getPluginData);
  const importPlugin = usePluginStore((s) => s.importPlugin);
  const resetPlugin = usePluginStore((s) => s.resetPlugin);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSwitch = (id: string) => {
    if (id === activePluginId) return;
    // Save current plugin first
    saveCurrentPlugin(getPluginData());
    // Load selected
    const saved = loadPlugin(id);
    if (saved) {
      importPlugin({ ...saved.data, pluginName: saved.data.pluginName });
      setActivePluginId(id);
    }
    onClose();
  };

  const handleNewPlugin = () => {
    // Save current
    saveCurrentPlugin(getPluginData());
    // Reset store and create new entry
    resetPlugin();
    createNewPlugin();
    onClose();
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Auto-save current plugin first
      saveCurrentPlugin(getPluginData());
      const parsed = await parsePluginArchive(file);
      const pluginData: import("@/types").PluginData = {
        pluginName: parsed.pluginName,
        version: parsed.version || "0.1.0",
        skills: parsed.skills,
        agents: parsed.agents,
        commands: parsed.commands,
        hooks: parsed.hooks,
        mcps: parsed.mcps,
        changelog: parsed.changelog || [],
        dependencies: parsed.dependencies || [],
      };
      importAsNewPlugin(pluginData);
      importPlugin(parsed);
      onClose();
    } catch (err) {
      console.error("Failed to import plugin:", err);
    }
    e.target.value = "";
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const wasActive = id === activePluginId;
    deletePlugin(id);
    if (wasActive) {
      resetPlugin();
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const sorted = [...plugins].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plugin Library" size="md">
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleNewPlugin}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary border border-dashed border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <Plus size={14} />
            New Plugin
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-secondary border border-dashed border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
          >
            <Upload size={14} />
            Import ZIP
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.tgz,application/gzip,application/x-gzip,application/x-tar"
            onChange={handleImportZip}
            className="hidden"
          />
        </div>

        {sorted.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">
            No saved plugins yet. Your current plugin will be saved when you switch or create a new one.
          </p>
        )}

        {sorted.map((p) => {
          const isActive = p.id === activePluginId;
          const total =
            p.data.skills.length +
            p.data.agents.length +
            p.data.commands.length +
            p.data.hooks.length +
            p.data.mcps.length;

          return (
            <div
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? "bg-accent-orange/10 border border-accent-orange/30"
                  : "hover:bg-bg-hover border border-transparent"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {p.pluginName || "Untitled"}
                  </span>
                  {isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent-orange/20 text-accent-orange rounded font-medium">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-text-muted">
                    {total} component{total !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {formatDate(p.updatedAt)}
                  </span>
                </div>
              </div>

              <button
                  onClick={(e) => handleDelete(e, p.id)}
                  className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer"
                  title="Delete plugin"
                >
                  <Trash2 size={13} />
                </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
