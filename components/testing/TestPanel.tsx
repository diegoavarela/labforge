"use client";

import { useState, useCallback, useEffect } from "react";
import { Play, Eye, AlertTriangle, Check, X, Loader2, FileCode, CheckCircle, XCircle, Diff } from "lucide-react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Skill } from "@/types";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false }
);

type TestTab = "dryrun" | "agentview" | "deps" | "diff";

interface DependencyResult {
  bin: string;
  installed: boolean;
}

export default function TestPanel({ skill, version }: { skill: Skill; version: string }) {
  const [tab, setTab] = useState<TestTab>("agentview");
  const [dryRunOutput, setDryRunOutput] = useState("");
  const [dryRunning, setDryRunning] = useState(false);
  const [selectedScript, setSelectedScript] = useState(skill.scripts[0]?.filename || "");
  const [deps, setDeps] = useState<DependencyResult[]>([]);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState("");
  const [diffModified, setDiffModified] = useState("");
  const [diffFile, setDiffFile] = useState("SKILL.md");

  // Build what the agent sees
  const agentView = buildAgentView(skill, version);

  const handleDryRun = useCallback(async () => {
    const script = skill.scripts.find((s) => s.filename === selectedScript);
    if (!script) return;
    setDryRunning(true);
    setDryRunOutput("");
    try {
      const res = await fetch("/api/skills/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: script.filename, content: script.content }),
      });
      const data = await res.json();
      setDryRunOutput(data.output || "No output");
    } catch (err) {
      setDryRunOutput(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setDryRunning(false);
    }
  }, [skill, selectedScript]);

  const handleCheckDeps = useCallback(async () => {
    setCheckingDeps(true);
    try {
      const fullMd = `---\nname: ${skill.name}\ndescription: ${skill.description}\nversion: ${version}\n---\n\n${skill.skillMd}`;
      const res = await fetch("/api/skills/check-deps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillMd: fullMd }),
      });
      const data = await res.json();
      setDeps(data.dependencies || []);
    } catch {}
    setCheckingDeps(false);
  }, [skill, version]);

  // Auto-check deps on mount
  useEffect(() => {
    if (tab === "deps") handleCheckDeps();
  }, [tab, handleCheckDeps]);

  // Set up diff when switching to diff tab
  useEffect(() => {
    if (tab === "diff") {
      if (diffFile === "SKILL.md") {
        setDiffOriginal(skill.skillMd);
        setDiffModified(skill.skillMd);
      } else {
        const script = skill.scripts.find((s) => s.filename === diffFile);
        if (script) {
          setDiffOriginal(script.content);
          setDiffModified(script.content);
        }
      }
    }
  }, [tab, diffFile, skill]);

  const tabs: { id: TestTab; label: string; icon: React.ReactNode }[] = [
    { id: "agentview", label: "Agent View", icon: <Eye size={11} /> },
    { id: "dryrun", label: "Dry Run", icon: <Play size={11} /> },
    { id: "deps", label: "Dependencies", icon: <AlertTriangle size={11} /> },
    { id: "diff", label: "Diff View", icon: <Diff size={11} /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border-default bg-bg-secondary overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              tab === t.id
                ? "text-text-primary border-amber-400"
                : "text-text-muted border-transparent hover:text-text-secondary"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Agent View */}
        {tab === "agentview" && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 bg-bg-tertiary border-b border-border-default">
              <p className="text-[10px] text-text-muted">
                This is what the AI agent sees when this skill is loaded — the rendered frontmatter + instructions.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
                <div className="font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {agentView}
                </div>
              </div>
              {/* Also render markdown preview */}
              <div className="mt-4">
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Rendered Preview</div>
                <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-lg [&_h2]:text-base [&_pre]:bg-bg-tertiary [&_pre]:border [&_pre]:border-border-default [&_code]:text-accent-orange">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {skill.skillMd}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dry Run */}
        {tab === "dryrun" && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 bg-bg-tertiary border-b border-border-default flex items-center gap-3">
              <select
                value={selectedScript}
                onChange={(e) => setSelectedScript(e.target.value)}
                className="bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none"
              >
                {skill.scripts.length === 0 && <option value="">No scripts</option>}
                {skill.scripts.map((s) => (
                  <option key={s.filename} value={s.filename}>{s.filename}</option>
                ))}
              </select>
              <button
                onClick={handleDryRun}
                disabled={dryRunning || !selectedScript}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {dryRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                {dryRunning ? "Running..." : "Run"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {dryRunOutput ? (
                <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap bg-bg-tertiary border border-border-default rounded-lg p-4">
                  {dryRunOutput}
                </pre>
              ) : (
                <div className="text-center py-8 text-text-muted text-xs">
                  Select a script and click Run to test it with dry-run mode
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {tab === "deps" && (
          <div className="h-full overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleCheckDeps}
                disabled={checkingDeps}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-bg-secondary border border-border-default rounded-lg hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {checkingDeps ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
                Re-check
              </button>
            </div>
            {deps.length === 0 && !checkingDeps && (
              <div className="text-center py-8 text-text-muted text-xs">
                No CLI dependencies detected in this skill
              </div>
            )}
            <div className="space-y-2">
              {deps.map((d) => (
                <div key={d.bin} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  d.installed
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}>
                  {d.installed ? (
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-text-primary">{d.bin}</span>
                  <span className={`text-[10px] ml-auto ${d.installed ? "text-green-400" : "text-red-400"}`}>
                    {d.installed ? "Installed" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diff View */}
        {tab === "diff" && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-2 bg-bg-tertiary border-b border-border-default flex items-center gap-3">
              <select
                value={diffFile}
                onChange={(e) => setDiffFile(e.target.value)}
                className="bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none"
              >
                <option value="SKILL.md">SKILL.md</option>
                {skill.scripts.map((s) => (
                  <option key={s.filename} value={s.filename}>{s.filename}</option>
                ))}
              </select>
              <span className="text-[10px] text-text-muted">Edit the right panel to compare changes</span>
            </div>
            <div className="flex-1 min-h-0">
              <DiffEditor
                height="100%"
                language={diffFile === "SKILL.md" ? "markdown" : "shell"}
                theme="vs-dark"
                original={diffOriginal}
                modified={diffModified}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  readOnly: false,
                  renderSideBySide: true,
                  scrollBeyondLastLine: false,
                }}
                onMount={(editor) => {
                  const modifiedEditor = editor.getModifiedEditor();
                  modifiedEditor.onDidChangeModelContent(() => {
                    setDiffModified(modifiedEditor.getValue());
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildAgentView(skill: Skill, version: string): string {
  const lines: string[] = [];
  lines.push("┌─────────────────────────────────────────┐");
  lines.push("│  SKILL LOADED: " + skill.name.padEnd(25) + "│");
  lines.push("├─────────────────────────────────────────┤");
  lines.push("│ version: " + version.padEnd(30) + "│");
  lines.push("│ description: " + (skill.description || "(none)").slice(0, 26).padEnd(26) + "│");
  if (skill.scripts.length > 0) {
    lines.push("│ scripts:".padEnd(42) + "│");
    for (const s of skill.scripts) {
      lines.push("│   - " + s.filename.padEnd(35) + "│");
    }
  }
  lines.push("└─────────────────────────────────────────┘");
  lines.push("");
  lines.push("--- SKILL.md Content (what the agent reads) ---");
  lines.push("");
  lines.push(skill.skillMd);
  return lines.join("\n");
}
