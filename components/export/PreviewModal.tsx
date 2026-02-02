"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import FileTreePreview from "./FileTreePreview";
import { usePluginStore } from "@/stores/plugin";
import { generatePluginStructure } from "@/lib/generator/plugin";
import type { PluginFile } from "@/lib/generator/plugin";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewModal({ isOpen, onClose }: PreviewModalProps) {
  const store = usePluginStore();
  const [selectedFile, setSelectedFile] = useState<PluginFile | null>(null);

  const files = useMemo(() => {
    if (!isOpen) return [];
    return generatePluginStructure({
      pluginName: store.pluginName || "my-plugin",
      version: store.version,
      skills: store.skills,
      agents: store.agents,
      commands: store.commands,
      hooks: store.hooks,
      mcps: store.mcps,
      selectedItemId: store.selectedItemId,
      selectedItemType: store.selectedItemType,
      theme: store.theme,
      inventoryCollapsed: store.inventoryCollapsed,
      rightPanelCollapsed: store.rightPanelCollapsed,
      chatMessages: store.chatMessages,
      changelog: store.changelog,
      dependencies: store.dependencies,
    });
  }, [isOpen, store.pluginName, store.version, store.skills, store.agents, store.commands, store.hooks, store.mcps, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog, store.dependencies]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Plugin Files" size="3xl">
      <div className="grid grid-cols-2 gap-4" style={{ height: "60vh" }}>
        <div className="flex flex-col min-h-0">
          <label className="block text-xs font-medium text-text-muted mb-1 shrink-0">
            File Structure
          </label>
          <div className="flex-1 min-h-0 overflow-auto border border-border-default bg-bg-primary rounded-lg">
            <FileTreePreview
              files={files}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <label className="block text-xs font-medium text-text-muted mb-1 shrink-0">
            {selectedFile ? selectedFile.path : "File Preview"}
          </label>
          <div className="flex-1 min-h-0 border border-border-default bg-bg-primary rounded-lg overflow-auto p-3">
            {selectedFile ? (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                {selectedFile.content}
              </pre>
            ) : (
              <p className="text-text-muted text-xs text-center mt-12">
                Click a file to preview its contents
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
