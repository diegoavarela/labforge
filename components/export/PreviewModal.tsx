"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import FileTreePreview from "./FileTreePreview";
import { useSkillStore } from "@/stores/skill";
import { generateSkillStructure } from "@/lib/generator/skill";
import type { SkillFile } from "@/lib/generator/skill";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewModal({ isOpen, onClose }: PreviewModalProps) {
  const store = useSkillStore();
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);

  const files = useMemo(() => {
    if (!isOpen) return [];
    return generateSkillStructure({
      skillName: store.skillName || "my-skills",
      version: store.version,
      skills: store.skills,
      selectedItemId: store.selectedItemId,
      selectedItemType: store.selectedItemType,
      theme: store.theme,
      inventoryCollapsed: store.inventoryCollapsed,
      rightPanelCollapsed: store.rightPanelCollapsed,
      chatMessages: store.chatMessages,
      changelog: store.changelog,
    });
  }, [isOpen, store.skillName, store.version, store.skills, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Skill Files" size="3xl">
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
