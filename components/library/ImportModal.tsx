"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FolderOpen, FileArchive, Loader2, AlertCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useLibraryStore } from "@/stores/library";
import { generateId } from "@/lib/utils/id";
import type { SkillProjectData, Skill } from "@/types";

interface ImportPreview {
  name: string;
  description: string;
  version: string;
  skillMd: string;
  scripts: { filename: string; content: string; language: string }[];
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importAsNewProject = useLibraryStore((s) => s.importAsNewProject);

  const reset = () => {
    setPreview(null);
    setError(null);
    setLoading(false);
    setFolderPath("");
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/skills/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setPreview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFolderImport = async () => {
    if (!folderPath.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/skills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: folderPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setPreview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    const skill: Skill = {
      id: generateId(),
      name: preview.name,
      description: preview.description,
      skillMd: preview.skillMd,
      scripts: preview.scripts,
      metadata: {},
      source: "local",
    };

    const projectData: SkillProjectData = {
      skillName: preview.name,
      version: preview.version || "0.1.0",
      skills: [skill],
      changelog: [],
    };

    importAsNewProject(projectData);
    handleClose();
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Skill" size="lg">
      {!preview ? (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-accent-orange bg-accent-orange/5"
                : "border-border-default hover:border-text-muted"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".zip,.tar,.tar.gz,.tgz"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <FileArchive size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-sm text-text-primary font-medium">
              Drop a ZIP, TAR, or TGZ file here
            </p>
            <p className="text-xs text-text-muted mt-1">
              or click to browse
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-default" />
            <span className="text-[11px] text-text-muted">or</span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          {/* Folder path */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFolderImport()}
                placeholder="/path/to/skill/folder"
                className="w-full pl-9 pr-3 py-2 text-sm bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange"
              />
            </div>
            <button
              onClick={handleFolderImport}
              disabled={!folderPath.trim() || loading}
              className="px-4 py-2 text-sm bg-bg-primary border border-border-default rounded-lg hover:bg-bg-hover text-text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Import
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={16} className="animate-spin text-accent-orange" />
              <span className="text-sm text-text-muted">Parsing...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="space-y-3">
            <div className="p-3 bg-bg-primary border border-border-default rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">{preview.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-accent-orange/20 text-accent-orange rounded font-mono">
                  v{preview.version || "0.1.0"}
                </span>
              </div>
              {preview.description && (
                <p className="text-xs text-text-muted">{preview.description}</p>
              )}
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span>{preview.scripts.length} script{preview.scripts.length !== 1 ? "s" : ""}</span>
                <span>{preview.skillMd.length} chars in SKILL.md</span>
              </div>
            </div>

            {preview.scripts.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] text-text-muted font-medium">Files:</p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {preview.scripts.map((s) => (
                    <div key={s.filename} className="flex items-center gap-2 px-2 py-1 rounded bg-bg-primary text-[11px]">
                      <span className="text-text-primary font-mono truncate">{s.filename}</span>
                      <span className="text-text-muted ml-auto shrink-0">{s.language}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-bg-hover text-text-secondary cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 text-sm bg-accent-orange text-white rounded-lg hover:bg-accent-orange/90 font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={14} />
              Import Skill
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
