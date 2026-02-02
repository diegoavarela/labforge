"use client";

import { ZoomIn, ZoomOut, Maximize2, Map, FileDown, Play, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/utils/clipboard";

interface CanvasToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleMinimap: () => void;
  minimapVisible: boolean;
  onExport: () => void;
  onDryRun: () => void;
  onCopyMarkdown?: () => string;
}

export default function CanvasToolbar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleMinimap,
  minimapVisible,
  onExport,
  onDryRun,
  onCopyMarkdown,
}: CanvasToolbarProps) {
  const [copied, setCopied] = useState(false);
  const btnClass =
    "p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all cursor-pointer";

  const handleCopy = useCallback(() => {
    if (!onCopyMarkdown) return;
    copyToClipboard(onCopyMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyMarkdown]);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-border-default bg-bg-secondary">
      <button onClick={onZoomIn} className={btnClass} title="Zoom In">
        <ZoomIn size={14} />
      </button>
      <button onClick={onZoomOut} className={btnClass} title="Zoom Out">
        <ZoomOut size={14} />
      </button>
      <button onClick={onFitView} className={btnClass} title="Fit View">
        <Maximize2 size={14} />
      </button>
      <button
        onClick={onToggleMinimap}
        className={`${btnClass} ${minimapVisible ? "text-green-400" : ""}`}
        title="Toggle Minimap"
      >
        <Map size={14} />
      </button>
      <div className="flex-1" />
      {onCopyMarkdown && (
        <button onClick={handleCopy} className={btnClass} title="Copy .md">
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      )}
      <button onClick={onDryRun} className={btnClass} title="Dry Run">
        <Play size={14} />
      </button>
      <button onClick={onExport} className={btnClass} title="Export Markdown">
        <FileDown size={14} />
      </button>
    </div>
  );
}
