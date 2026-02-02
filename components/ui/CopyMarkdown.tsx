"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils/clipboard";

interface CopyMarkdownProps {
  getContent: () => string;
  label?: string;
}

export default function CopyMarkdown({ getContent, label = "Copy .md" }: CopyMarkdownProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getContent]);

  const isIconOnly = !label;

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer ${
        isIconOnly
          ? "p-1.5 rounded hover:bg-bg-hover"
          : "px-2.5 py-1 text-[10px] font-medium border border-border-default rounded-lg hover:bg-bg-hover"
      }`}
      title={label || "Copy .md"}
    >
      {copied ? <Check size={isIconOnly ? 12 : 10} className="text-green-400" /> : <Copy size={isIconOnly ? 12 : 10} />}
      {!isIconOnly && (copied ? "Copied!" : label)}
    </button>
  );
}
