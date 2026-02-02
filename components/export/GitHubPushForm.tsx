"use client";

import { useState, useCallback } from "react";
import { Github, ExternalLink, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { PluginFile } from "@/lib/generator/plugin";

interface GitHubPushFormProps {
  files: PluginFile[];
  defaultName: string;
}

export default function GitHubPushForm({
  files,
  defaultName,
}: GitHubPushFormProps) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [repoName, setRepoName] = useState(
    defaultName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePush = useCallback(async () => {
    setPushing(true);
    setError(null);
    setRepoUrl(null);

    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          files: files.map((f) => ({ path: f.path, content: f.content })),
          isPrivate,
          existingRepo: mode === "existing",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to push to GitHub");
      }

      setRepoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPushing(false);
    }
  }, [repoName, files, isPrivate, mode]);

  if (repoUrl) {
    return (
      <div className="space-y-3 p-3 border border-green-500/30 bg-green-500/5">
        <p className="text-xs font-mono text-green-400">
          Successfully pushed to GitHub!
        </p>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-mono text-accent-blue hover:underline"
        >
          <ExternalLink size={12} />
          {repoUrl}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs font-mono text-text-secondary cursor-pointer">
          <input
            type="radio"
            name="repo-mode"
            checked={mode === "new"}
            onChange={() => setMode("new")}
            className="accent-accent-blue"
          />
          New repo
        </label>
        <label className="flex items-center gap-1.5 text-xs font-mono text-text-secondary cursor-pointer">
          <input
            type="radio"
            name="repo-mode"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
            className="accent-accent-blue"
          />
          Existing repo
        </label>
      </div>

      <div>
        <label className="block text-xs font-mono text-text-muted mb-1 uppercase">
          {mode === "new" ? "Repository Name" : "Repository Name (owner/repo)"}
        </label>
        <Input
          value={repoName}
          onChange={(value) => setRepoName(value)}
          placeholder={mode === "new" ? "my-plugin" : "username/my-plugin"}
        />
      </div>

      {mode === "new" && (
        <label className="flex items-center gap-2 text-xs font-mono text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="accent-accent-blue"
          />
          Private repository
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2 border border-red-500/30 bg-red-500/5 text-xs font-mono text-red-400">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <Button
        variant="primary"
        onClick={handlePush}
        disabled={pushing || !repoName.trim()}
      >
        <Github size={14} />
        {pushing ? "Pushing..." : "Push"}
      </Button>
    </div>
  );
}
