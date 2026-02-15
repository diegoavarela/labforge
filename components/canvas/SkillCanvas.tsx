"use client";

import { useState, useCallback } from "react";
import { Sparkles, Plus, X, FileText, Code, Eye, FolderDown, Check, Loader2, Share2, Globe, Users, HardDrive } from "lucide-react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkillStore } from "@/stores/skill";
import { generateId } from "@/lib/utils/id";
import type { ScriptFile } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function getMonacoLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    sh: "shell",
    bash: "shell",
    py: "python",
    js: "javascript",
    ts: "typescript",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    toml: "ini",
  };
  return map[ext] || "plaintext";
}

type Tab = "skillmd" | "preview" | "distribute" | string;

export default function SkillCanvas({ skillId }: { skillId: string }) {
  const skill = useSkillStore((s) => s.skills.find((sk) => sk.id === skillId));
  const updateSkill = useSkillStore((s) => s.updateSkill);

  const [activeTab, setActiveTab] = useState<Tab>("skillmd");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const handleUpdateSkillMd = useCallback((value: string | undefined) => {
    if (value !== undefined) updateSkill(skillId, { skillMd: value });
  }, [skillId, updateSkill]);

  const handleUpdateScript = useCallback((filename: string, content: string | undefined) => {
    if (!skill || content === undefined) return;
    updateSkill(skillId, {
      scripts: skill.scripts.map((s) =>
        s.filename === filename ? { ...s, content } : s
      ),
    });
  }, [skill, skillId, updateSkill]);

  const handleAddScript = useCallback(() => {
    if (!skill) return;
    const name = `scripts/new-script-${skill.scripts.length + 1}.sh`;
    const newScript: ScriptFile = {
      filename: name,
      content: "#!/bin/bash\nset -euo pipefail\n\n# Your script here\n",
      language: "bash",
    };
    updateSkill(skillId, { scripts: [...skill.scripts, newScript] });
    setActiveTab(name);
  }, [skill, skillId, updateSkill]);

  const handleRemoveScript = useCallback((filename: string) => {
    if (!skill) return;
    updateSkill(skillId, {
      scripts: skill.scripts.filter((s) => s.filename !== filename),
    });
    if (activeTab === filename) setActiveTab("skillmd");
  }, [skill, skillId, updateSkill, activeTab]);

  const handleSaveLocal = useCallback(async () => {
    if (!skill) return;
    setSaving(true);
    setSaveResult(null);

    const frontmatter = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n`;
    const fullSkillMd = frontmatter + skill.skillMd;

    try {
      const res = await fetch("/api/skills/save-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skill.name,
          skillMd: fullSkillMd,
          scripts: skill.scripts,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveResult(`Saved to ${data.path}`);
      } else {
        setSaveResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setSaveResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult(null), 4000);
    }
  }, [skill]);

  if (!skill) return null;

  const fileTree = [
    { name: "SKILL.md", type: "file" as const },
    ...skill.scripts.map((s) => ({ name: s.filename, type: "file" as const })),
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border-default px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles size={16} className="text-skill shrink-0" />
          <input
            value={skill.name}
            onChange={(e) => updateSkill(skillId, { name: e.target.value })}
            className="text-lg font-semibold bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-skill flex-1"
            placeholder="Skill name"
          />
          <button
            onClick={handleSaveLocal}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-text-secondary border border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <FolderDown size={12} />}
            Save to Local
          </button>
          {saveResult && (
            <span className={`text-[10px] px-2 py-1 rounded ${saveResult.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
              {saveResult}
            </span>
          )}
        </div>
        <input
          value={skill.description}
          onChange={(e) => updateSkill(skillId, { description: e.target.value })}
          placeholder="Skill description..."
          className="text-sm bg-transparent text-text-secondary placeholder:text-text-muted focus:outline-none w-full"
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File explorer sidebar */}
        <div className="w-48 shrink-0 border-r border-border-default bg-bg-secondary overflow-y-auto">
          <div className="px-2 py-2">
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider px-2 mb-1">Files</div>
            {fileTree.map((f) => (
              <button
                key={f.name}
                onClick={() => setActiveTab(f.name === "SKILL.md" ? "skillmd" : f.name)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                  (f.name === "SKILL.md" && activeTab === "skillmd") || activeTab === f.name
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {f.name === "SKILL.md" ? <FileText size={11} /> : <Code size={11} />}
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            <button
              onClick={() => setActiveTab("preview")}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer mt-1 ${
                activeTab === "preview"
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <Eye size={11} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("distribute")}
              className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                activeTab === "distribute"
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <Share2 size={11} />
              <span>Distribute</span>
            </button>
            <div className="border-t border-border-default mt-2 pt-2">
              <button
                onClick={handleAddScript}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                <Plus size={11} />
                New Script
              </button>
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="shrink-0 flex items-center gap-0 border-b border-border-default bg-bg-secondary overflow-x-auto">
            <button
              onClick={() => setActiveTab("skillmd")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === "skillmd"
                  ? "text-text-primary border-skill"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              SKILL.md
            </button>
            {skill.scripts.map((s) => (
              <div key={s.filename} className="flex items-center shrink-0">
                <button
                  onClick={() => setActiveTab(s.filename)}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === s.filename
                      ? "text-text-primary border-accent-orange"
                      : "text-text-muted border-transparent hover:text-text-secondary"
                  }`}
                >
                  {s.filename.split("/").pop()}
                </button>
                <button
                  onClick={() => handleRemoveScript(s.filename)}
                  className="p-0.5 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === "preview"
                  ? "text-text-primary border-blue-400"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("distribute")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === "distribute"
                  ? "text-text-primary border-purple-400"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              Distribute
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {activeTab === "skillmd" && (
              <MonacoEditor
                height="100%"
                language="markdown"
                theme="vs-dark"
                value={skill.skillMd}
                onChange={handleUpdateSkillMd}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                }}
              />
            )}

            {activeTab === "preview" && (
              <div className="h-full overflow-y-auto p-6">
                <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_pre]:bg-bg-tertiary [&_pre]:border [&_pre]:border-border-default [&_code]:text-accent-orange">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {`---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.skillMd}`}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {activeTab === "distribute" && (
              <DistributionPanel skill={skill} onSaveLocal={handleSaveLocal} saving={saving} saveResult={saveResult} />
            )}

            {skill.scripts.map((s) =>
              activeTab === s.filename ? (
                <MonacoEditor
                  key={s.filename}
                  height="100%"
                  language={getMonacoLanguage(s.filename)}
                  theme="vs-dark"
                  value={s.content}
                  onChange={(value) => handleUpdateScript(s.filename, value)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    wordWrap: "off",
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                  }}
                />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Distribution Panel Component
function DistributionPanel({ skill, onSaveLocal, saving, saveResult }: {
  skill: { name: string; description: string };
  onSaveLocal: () => void;
  saving: boolean;
  saveResult: string | null;
}) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Share2 size={18} className="text-purple-400" />
            Distribution
          </h2>
          <p className="text-sm text-text-secondary">
            Choose how to distribute <span className="font-mono text-text-primary">{skill.name}</span>
          </p>
        </div>

        {/* Local */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-green-400" />
            <h3 className="text-sm font-semibold text-text-primary">Local</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded-md font-medium">Ready</span>
          </div>
          <p className="text-xs text-text-secondary">
            Save to <span className="font-mono text-text-muted">~/.openclaw/workspace/skills/{skill.name}/</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onSaveLocal}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <FolderDown size={12} />}
              {saving ? "Saving..." : "Save to Local"}
            </button>
            {saveResult && (
              <span className={`text-[10px] px-2 py-1 rounded ${saveResult.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {saveResult}
              </span>
            )}
          </div>
        </div>

        {/* Team */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 opacity-60">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-text-primary">Team</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary text-text-muted rounded-md font-medium">Coming Soon</span>
          </div>
          <p className="text-xs text-text-secondary">
            Share privately with your organization via an internal skill registry.
          </p>
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-bg-tertiary text-text-muted border border-border-default rounded-lg cursor-not-allowed"
          >
            <Users size={12} />
            Share with Team
          </button>
        </div>

        {/* ClawHub */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 opacity-60">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-text-primary">ClawHub</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-bg-tertiary text-text-muted rounded-md font-medium">Phase 3</span>
          </div>
          <p className="text-xs text-text-secondary">
            Publish to the public ClawHub marketplace for the community.
          </p>
          <button
            disabled
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-bg-tertiary text-text-muted border border-border-default rounded-lg cursor-not-allowed"
          >
            <Globe size={12} />
            Publish to ClawHub
          </button>
        </div>
      </div>
    </div>
  );
}
