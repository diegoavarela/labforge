"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Download, Github, Copy, Check } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FileTreePreview from "./FileTreePreview";
import GitHubPushForm from "./GitHubPushForm";
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
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const [pluginName, setPluginName] = useState(store.pluginName || "my-plugin");
  const [selectedFile, setSelectedFile] = useState<PluginFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
              disabled={!session}
              onClick={() => setShowGitHubForm(!showGitHubForm)}
              className="w-full"
            >
              <Github size={14} />
              Push to GitHub
            </Button>
            {!session && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-tertiary border border-border-default rounded-lg text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                Login required
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={handleCopyInstall} className="w-full">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Install"}
          </Button>
        </div>

        {showGitHubForm && session && (
          <div className="pt-3 border-t border-border-default">
            <GitHubPushForm files={files} defaultName={pluginName} />
          </div>
        )}
      </div>
    </Modal>
  );
}
