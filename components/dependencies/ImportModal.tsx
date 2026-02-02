"use client";

import { useState, useMemo } from "react";
import { generateId } from "@/lib/utils/id";
import { Plus, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useLibraryStore } from "@/stores/library";
import { usePluginStore } from "@/stores/plugin";
import type { PluginDependency } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: Props) {
  const libraryPlugins = useLibraryStore((s) => s.plugins);
  const activePluginId = useLibraryStore((s) => s.activePluginId);
  const addSkill = usePluginStore((s) => s.addSkill);
  const addAgent = usePluginStore((s) => s.addAgent);
  const addDependency = usePluginStore((s) => s.addDependency);
  const existingSkills = usePluginStore((s) => s.skills);
  const existingAgents = usePluginStore((s) => s.agents);
  const existingDeps = usePluginStore((s) => s.dependencies);

  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  const otherPlugins = useMemo(
    () => libraryPlugins.filter((p) => p.id !== activePluginId),
    [libraryPlugins, activePluginId]
  );

  const currentPlugin = useMemo(
    () => otherPlugins.find((p) => p.id === selectedPlugin),
    [otherPlugins, selectedPlugin]
  );

  const alreadyImportedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dep of existingDeps) {
      for (const sid of dep.importedSkillIds) ids.add(sid);
      for (const aid of dep.importedAgentIds) ids.add(aid);
    }
    return ids;
  }, [existingDeps]);

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    if (!currentPlugin) return;

    const skillsToImport = currentPlugin.data.skills.filter((s) => selectedSkills.has(s.id));
    const agentsToImport = currentPlugin.data.agents.filter((a) => selectedAgents.has(a.id));

    for (const skill of skillsToImport) {
      if (!existingSkills.some((s) => s.id === skill.id)) {
        addSkill({ ...skill, source: "registry", sourceUrl: `library:${currentPlugin.pluginName}` });
      }
    }
    for (const agent of agentsToImport) {
      if (!existingAgents.some((a) => a.id === agent.id)) {
        addAgent(agent);
      }
    }

    addDependency({
      id: generateId(),
      sourcePluginId: currentPlugin.id,
      sourcePluginName: currentPlugin.pluginName,
      importedSkillIds: skillsToImport.map((s) => s.id),
      importedAgentIds: agentsToImport.map((a) => a.id),
    });

    setSelectedSkills(new Set());
    setSelectedAgents(new Set());
    setSelectedPlugin(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import from Library" size="lg">
      <div className="space-y-4">
        {otherPlugins.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-8">
            No other plugins in your library to import from.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Source Plugin</label>
              <select
                value={selectedPlugin || ""}
                onChange={(e) => {
                  setSelectedPlugin(e.target.value || null);
                  setSelectedSkills(new Set());
                  setSelectedAgents(new Set());
                }}
                className="w-full bg-bg-secondary border border-border-default px-3 py-2 text-xs font-mono text-text-primary rounded-lg outline-none focus:border-accent-blue cursor-pointer"
              >
                <option value="">Select a plugin...</option>
                {otherPlugins.map((p) => (
                  <option key={p.id} value={p.id}>{p.pluginName}</option>
                ))}
              </select>
            </div>

            {currentPlugin && currentPlugin.data.skills.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Skills</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentPlugin.data.skills.map((skill) => {
                    const imported = alreadyImportedIds.has(skill.id);
                    return (
                      <button
                        key={skill.id}
                        onClick={() => !imported && toggleSkill(skill.id)}
                        disabled={imported}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          selectedSkills.has(skill.id)
                            ? "bg-green-500/10 text-green-400 border border-green-500/30"
                            : imported
                            ? "bg-bg-tertiary text-text-muted opacity-50"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        {selectedSkills.has(skill.id) ? <Check size={12} /> : <Plus size={12} />}
                        <span className="truncate">{skill.name}</span>
                        {imported && <span className="ml-auto text-[10px] text-text-muted">already imported</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentPlugin && currentPlugin.data.agents.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Agents</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentPlugin.data.agents.map((agent) => {
                    const imported = alreadyImportedIds.has(agent.id);
                    return (
                      <button
                        key={agent.id}
                        onClick={() => !imported && toggleAgent(agent.id)}
                        disabled={imported}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          selectedAgents.has(agent.id)
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            : imported
                            ? "bg-bg-tertiary text-text-muted opacity-50"
                            : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                        }`}
                      >
                        {selectedAgents.has(agent.id) ? <Check size={12} /> : <Plus size={12} />}
                        <span className="truncate">{agent.name}</span>
                        {imported && <span className="ml-auto text-[10px] text-text-muted">already imported</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(selectedSkills.size > 0 || selectedAgents.size > 0) && (
              <Button variant="primary" size="sm" onClick={handleImport} className="w-full">
                Import {selectedSkills.size + selectedAgents.size} item{selectedSkills.size + selectedAgents.size !== 1 ? "s" : ""}
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
