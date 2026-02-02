"use client";

import { useState, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils/clipboard";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  markdown,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Command" size="2xl">
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold uppercase text-text-primary border border-border-default hover:bg-bg-hover transition-colors cursor-pointer"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="bg-bg-tertiary border border-border-default p-4 text-xs font-mono text-text-primary overflow-auto max-h-[60vh] whitespace-pre-wrap">
          {markdown}
        </pre>
      </div>
    </Modal>
  );
}
