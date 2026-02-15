"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Download, Github, Copy, Check, ExternalLink, AlertCircle, Clipboard } from "lucide-react";
import { copyToClipboard } from "@/lib/utils/clipboard";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FileTreePreview from "./FileTreePreview";
import { useSkillStore } from "@/stores/skill";
import { generateSkillStructure } from "@/lib/generator/skill";
import { generateAndDownloadZip } from "@/lib/generator/zip";
import { validateSkill } from "@/lib/validator/skill";
import ValidationReport from "./ValidationReport";
import type { SkillFile } from "@/lib/generator/skill";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const store = useSkillStore();
  const { data: session } = useSession();
  const githubRepo = useSkillStore((s) => s.githubRepo);
  const [projectName, setProjectName] = useState(store.skillName || "my-skills");
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ url?: string; error?: string } | null>(null);

  const files = useMemo(() => {
    return generateSkillStructure({
      skillName: projectName,
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
  }, [projectName, store.version, store.skills, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog]);

  const validation = useMemo(() => {
    return validateSkill({
      skillName: projectName,
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
  }, [projectName, store.version, store.skills, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      store.setSkillName(projectName);
      await generateAndDownloadZip(projectName, files);
    } finally {
      setDownloading(false);
    }
  }, [projectName, files, store]);

  const handlePush = useCallback(async () => {
    if (!githubRepo) return;
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: githubRepo,
          files: files.map((f) => ({ path: f.path, content: f.content })),
          isPrivate: false,
          existingRepo: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushResult({ error: data.error || "Failed to push" });
      } else {
        setPushResult({ url: data.url });
      }
    } catch (err) {
      setPushResult({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setPushing(false);
    }
  }, [githubRepo, files]);

  const pushDisabled = !session || !githubRepo;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Skills" size="3xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Project Name
          </label>
          <Input
            value={projectName}
            onChange={(value) => setProjectName(value)}
            placeholder="my-skills"
          />
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ height: "50vh" }}>
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
            <div className="group/preview relative flex-1 min-h-0 border border-border-default bg-bg-primary rounded-lg overflow-auto p-3">
              {selectedFile ? (
                <>
                  <button
                    onClick={() => {
                      copyToClipboard(selectedFile.content);
                      setCopiedFile(true);
                      setTimeout(() => setCopiedFile(false), 2000);
                    }}
                    className="sticky top-0 float-right p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all opacity-0 group-hover/preview:opacity-60 hover:!opacity-100 cursor-pointer z-10"
                    title="Copy file contents"
                  >
                    {copiedFile ? <Check size={12} className="text-green-400" /> : <Clipboard size={12} />}
                  </button>
                  <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-words">
                    {selectedFile.content}
                  </pre>
                </>
              ) : (
                <p className="text-text-muted text-xs text-center mt-12">
                  Click a file to preview its contents
                </p>
              )}
            </div>
          </div>
        </div>

        <ValidationReport
          report={validation}
          onNavigate={(id, type) => {
            store.selectItem(id, type as "skill");
            onClose();
          }}
        />

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-default">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading || !validation.isValid}
            className="w-full"
          >
            <Download size={14} />
            {downloading ? "Generating..." : !validation.isValid ? "Fix errors to export" : "Download ZIP"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={pushDisabled || pushing}
            onClick={handlePush}
            className="w-full"
          >
            <Github size={14} />
            {pushing ? "Pushing..." : githubRepo ? `Push to ${githubRepo.split("/")[1]}` : "Push to GitHub"}
          </Button>
        </div>

        {pushResult?.url && (
          <div className="space-y-2 p-3 border border-green-500/30 bg-green-500/5">
            <p className="text-xs font-mono text-green-400">Successfully pushed to GitHub!</p>
            <a
              href={pushResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-mono text-accent-blue hover:underline"
            >
              <ExternalLink size={12} />
              {pushResult.url}
            </a>
          </div>
        )}

        {pushResult?.error && (
          <div className="flex items-start gap-2 p-2 border border-red-500/30 bg-red-500/5 text-xs font-mono text-red-400">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {pushResult.error}
          </div>
        )}
      </div>
    </Modal>
  );
}
