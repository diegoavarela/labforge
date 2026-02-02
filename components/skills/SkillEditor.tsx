"use client";

import { useState } from "react";
import { generateId } from "@/lib/utils/id";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fetchSkillContent } from "@/lib/registry/skills";
import type { Skill, SkillFile } from "@/types";
import { Trash2, FileCode, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

type Tab = "edit" | "preview";

interface SkillEditorProps {
  initial?: Skill;
  onSave: (skill: Skill) => void;
  onCancel: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none p-3 bg-bg-tertiary border border-border-default rounded h-[300px] overflow-y-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*No content yet*"}</ReactMarkdown>
    </div>
  );
}

function TabBar({
  activeTab,
  onTabChange,
  rightSlot,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-0 border-b border-border-default mb-1">
      {(["edit", "preview"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-3 py-1.5 text-xs font-mono uppercase cursor-pointer transition-colors ${
            activeTab === tab
              ? "text-text-primary border-b-2 border-accent-orange"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {tab}
        </button>
      ))}
      {rightSlot && <div className="ml-auto pr-1">{rightSlot}</div>}
    </div>
  );
}

export default function SkillEditor({ initial, onSave, onCancel, onFullscreenChange }: SkillEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [files, setFiles] = useState<SkillFile[]>(initial?.files ?? []);
  const [addingFile, setAddingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [fetching, setFetching] = useState(false);
  const [mainTab, setMainTab] = useState<Tab>("edit");
  const [fullscreen, setFullscreen] = useState(false);
  const [fileTab, setFileTab] = useState<Record<number, Tab>>({});

  function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    onFullscreenChange?.(next);
  }

  function getFileTab(i: number): Tab {
    return fileTab[i] ?? "edit";
  }
  function setFileTabAt(i: number, tab: Tab) {
    setFileTab((prev) => ({ ...prev, [i]: tab }));
  }

  function handleSave() {
    if (!name.trim()) return;
    const skill: Skill = {
      id: initial?.id ?? generateId(),
      name: name.trim(),
      description: description.trim(),
      content,
      files,
      source: "local",
      sourceUrl: initial?.sourceUrl,
      categories: initial?.categories ?? [],
      tags: initial?.tags ?? [],
    };
    onSave(skill);
  }

  async function handleFetch() {
    if (!initial?.sourceUrl) return;
    setFetching(true);
    try {
      const fetched = await fetchSkillContent(initial.sourceUrl);
      if (fetched) setContent(fetched);
    } catch {
      // ignore
    }
    setFetching(false);
  }

  function addFile() {
    if (!newFilePath.trim()) return;
    const ext = newFilePath.split(".").pop() ?? "txt";
    setFiles([...files, { path: newFilePath.trim(), content: newFileContent, language: ext }]);
    setNewFilePath("");
    setNewFileContent("");
    setAddingFile(false);
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div className={`flex flex-col ${fullscreen ? "h-full gap-2" : "gap-4 max-h-[70vh]"} overflow-y-auto`}>
      {fullscreen ? (
        <div className="flex gap-3">
          <div className="flex-1"><Input label="Name" value={name} onChange={setName} placeholder="my-skill" /></div>
          <div className="flex-1"><Input label="Description" value={description} onChange={setDescription} placeholder="What this skill does..." /></div>
        </div>
      ) : (
        <>
          <Input label="Name" value={name} onChange={setName} placeholder="my-skill" />
          <Input label="Description" value={description} onChange={setDescription} placeholder="What this skill does..." />
        </>
      )}

      <div className={`flex flex-col gap-1 ${fullscreen ? "flex-1 min-h-0" : ""}`}>
        <div className="flex items-center justify-between">
          <label className="text-text-secondary text-xs font-mono uppercase">
            SKILL.md Content
          </label>
          {initial?.sourceUrl && (
            <button
              type="button"
              onClick={handleFetch}
              disabled={fetching}
              className="flex items-center gap-1 text-[11px] font-mono text-accent-orange hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={11} className={fetching ? "animate-spin" : ""} />
              {fetching ? "Fetching..." : "Fetch from source"}
            </button>
          )}
        </div>
        <TabBar
          activeTab={mainTab}
          onTabChange={setMainTab}
          rightSlot={
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          }
        />
        {mainTab === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full ${fullscreen ? "flex-1 min-h-0" : "h-[300px]"} bg-bg-tertiary border border-border-default rounded p-3 font-mono text-[13px] text-text-primary resize-y leading-relaxed focus:outline-none focus:border-accent-orange`}
            placeholder="# My Skill&#10;&#10;Write your SKILL.md content here..."
            spellCheck={false}
          />
        ) : (
          <div className={`prose prose-invert prose-sm max-w-none p-3 bg-bg-tertiary border border-border-default rounded overflow-y-auto ${fullscreen ? "flex-1 min-h-0" : "h-[300px]"}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*No content yet*"}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-text-secondary text-xs font-mono uppercase">
            Files
          </label>
          <Button variant="ghost" size="sm" onClick={() => setAddingFile(true)}>
            + Add File
          </Button>
        </div>

        {files.map((file, i) => (
          <div key={`${file.path}-${i}`} className="border border-border-default bg-bg-tertiary p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-text-primary flex items-center gap-1">
                <FileCode size={12} />
                {file.path}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-text-muted hover:text-red-400 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <TabBar activeTab={getFileTab(i)} onTabChange={(t) => setFileTabAt(i, t)} />
            {getFileTab(i) === "edit" ? (
              <textarea
                value={file.content}
                onChange={(e) => {
                  const updated = [...files];
                  updated[i] = { ...updated[i], content: e.target.value };
                  setFiles(updated);
                }}
                className="w-full h-[150px] bg-bg-primary border border-border-default rounded p-2 font-mono text-xs text-text-primary resize-y focus:outline-none focus:border-accent-orange"
                spellCheck={false}
              />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none p-2 bg-bg-primary border border-border-default rounded h-[150px] overflow-y-auto text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.content || "*No content*"}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {addingFile && (
          <div className="border border-border-default bg-bg-tertiary p-3 flex flex-col gap-2">
            <Input
              placeholder="scripts/setup.sh"
              value={newFilePath}
              onChange={setNewFilePath}
            />
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              className="w-full h-[150px] bg-bg-primary border border-border-default rounded p-2 font-mono text-xs text-text-primary resize-y focus:outline-none focus:border-accent-orange"
              placeholder="File content..."
              spellCheck={false}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAddingFile(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={addFile}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex gap-2 justify-end ${fullscreen ? "pt-1" : "pt-2"} border-t border-border-default`}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
