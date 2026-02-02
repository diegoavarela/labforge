"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Download, Github, Copy, Check, ExternalLink, AlertCircle, Clipboard } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FileTreePreview from "./FileTreePreview";
import { usePluginStore } from "@/stores/plugin";
import { generatePluginStructure } from "@/lib/generator/plugin";
import { generateAndDownloadZip } from "@/lib/generator/zip";
import { validatePlugin } from "@/lib/validator/plugin";
import ValidationReport from "./ValidationReport";
import type { PluginFile } from "@/lib/generator/plugin";
import type { ItemType } from "@/types";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const store = usePluginStore();
  const { data: session } = useSession();
  const githubRepo = usePluginStore((s) => s.githubRepo);
  const [pluginName, setPluginName] = useState(store.pluginName || "my-plugin");
  const [selectedFile, setSelectedFile] = useState<PluginFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ url?: string; error?: string } | null>(null);

  const files = useMemo(() => {
    return generatePluginStructure({
      pluginName,
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
  }, [pluginName, store.version, store.skills, store.agents, store.commands, store.hooks, store.mcps, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog, store.dependencies]);

  const validation = useMemo(() => {
    return validatePlugin({
      pluginName,
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
  }, [pluginName, store.version, store.skills, store.agents, store.commands, store.hooks, store.mcps, store.selectedItemId, store.selectedItemType, store.theme, store.inventoryCollapsed, store.rightPanelCollapsed, store.chatMessages, store.changelog, store.dependencies]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      store.setPluginName(pluginName);
      await generateAndDownloadZip(pluginName, files);
    } finally {
      setDownloading(false);
    }
  }, [pluginName, files, store]);

  const handleCopyInstall = useCallback(() => {
    const slug = pluginName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    navigator.clipboard.writeText(`claude plugin add github:user/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pluginName]);

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
  const pushTooltip = !session
    ? "Login required"
    : !githubRepo
      ? "Select a repo first"
      : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Plugin" size="3xl">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Plugin Name
          </label>
          <Input
            value={pluginName}
            onChange={(value) => setPluginName(value)}
            placeholder="my-plugin"
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
                      navigator.clipboard.writeText(selectedFile.content);
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
            store.selectItem(id, type as ItemType);
            onClose();
          }}
        />

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border-default">
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

          <div className="relative group">
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
            {pushTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-tertiary border border-border-default rounded-lg text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {pushTooltip}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={handleCopyInstall} className="w-full">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Install"}
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
