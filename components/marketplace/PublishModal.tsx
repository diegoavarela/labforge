"use client";

import { useState, useCallback } from "react";
import { X, Globe, Loader2, Check, AlertCircle } from "lucide-react";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: {
    name: string;
    description: string;
    skillMd: string;
    scripts: { filename: string; content: string; language: string }[];
  };
  version: string;
}

export default function PublishModal({ isOpen, onClose, skill, version }: PublishModalProps) {
  const [slug, setSlug] = useState(skill.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  const [publishVersion, setPublishVersion] = useState(version);
  const [changelog, setChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setResult(null);

    const frontmatter = `---\nname: ${skill.name}\ndescription: ${skill.description}\nversion: ${publishVersion}\n---\n\n`;
    const fullSkillMd = frontmatter + skill.skillMd;

    try {
      const res = await fetch("/api/clawhub/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: skill.name,
          version: publishVersion,
          changelog,
          skillMd: fullSkillMd,
          scripts: skill.scripts,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({ success: true, message: data.output || "Published successfully!" });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Publish failed" });
    } finally {
      setPublishing(false);
    }
  }, [slug, publishVersion, changelog, skill]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border-default rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Globe size={16} className="text-purple-400" />
            Publish to ClawHub
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              placeholder="my-skill"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Version</label>
            <input
              value={publishVersion}
              onChange={(e) => setPublishVersion(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Changelog (optional)</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              rows={3}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus resize-none"
              placeholder="What changed in this version..."
            />
          </div>

          {result && (
            <div className={`flex items-start gap-2 text-[11px] p-3 rounded-lg ${
              result.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}>
              {result.success ? <Check size={12} className="shrink-0 mt-0.5" /> : <AlertCircle size={12} className="shrink-0 mt-0.5" />}
              <span className="whitespace-pre-wrap">{result.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-default">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-text-secondary border border-border-default rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !slug}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishing ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
