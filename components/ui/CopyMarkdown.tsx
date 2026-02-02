"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyMarkdownProps {
  getContent: () => string;
  label?: string;
}

export default function CopyMarkdown({ getContent, label = "Copy .md" }: CopyMarkdownProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getContent]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-muted border border-border-default rounded-lg hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
      title={label}
    >
      {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
      {copied ? "Copied!" : label}
    </button>
  );
}
