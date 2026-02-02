"use client";

import { useMemo, useCallback, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/utils/clipboard";
import Modal from "@/components/ui/Modal";
import { usePluginStore } from "@/stores/plugin";
import { simulateCommand } from "@/lib/simulator/command";
import type { Command } from "@/types";
import type { SimulationStep } from "@/lib/simulator/command";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  command: Command;
}

export default function DryRunModal({ isOpen, onClose, command }: Props) {
  const store = usePluginStore();

  const result = useMemo(() => {
    if (!isOpen) return null;
    return simulateCommand(command, {
      pluginName: store.pluginName,
      version: store.version,
      skills: store.skills,
      agents: store.agents,
      commands: store.commands,
      hooks: store.hooks,
      mcps: store.mcps,
      selectedItemId: store.selectedItemId,
      selectedItemType: store.selectedItemType,
      theme: store.theme,
      inventoryCollapsed: store.inventoryCollapsed,
      rightPanelCollapsed: store.rightPanelCollapsed,
      chatMessages: store.chatMessages,
      changelog: store.changelog,
      dependencies: store.dependencies,
    });
  }, [
    isOpen,
    command,
    store.skills,
    store.agents,
    store.commands,
    store.hooks,
    store.mcps,
    store.pluginName,
    store.selectedItemId,
    store.selectedItemType,
    store.theme,
    store.inventoryCollapsed,
    store.rightPanelCollapsed,
    store.chatMessages,
    store.dependencies,
  ]);

  const [copied, setCopied] = useState(false);

  const formatReport = useCallback(() => {
    if (!result) return "";
    const lines: string[] = [
      `Dry Run: ${command.name}`,
      result.isValid
        ? `Status: PASS (${result.steps.length} steps${result.warnings.length > 0 ? `, ${result.warnings.length} warnings` : ""})`
        : `Status: FAIL (${result.errors.length} errors)`,
      "",
    ];
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      const icon = step.status === "error" ? "ERROR" : step.status === "warning" ? "WARN" : "OK";
      lines.push(`${i + 1}. [${icon}] ${step.description}`);
      for (const w of step.warnings) {
        lines.push(`   - ${w}`);
      }
    }
    return lines.join("\n");
  }, [result, command.name]);

  const handleCopy = useCallback(() => {
    copyToClipboard(formatReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formatReport]);

  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dry Run: ${command.name}`}
      size="lg"
    >
      <div className="space-y-3">
        {/* Summary */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            result.isValid
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          {result.isValid ? (
            <>
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-xs text-green-400 font-medium">
                All {result.steps.length} steps pass
                {result.warnings.length > 0
                  ? ` (${result.warnings.length} warning${result.warnings.length !== 1 ? "s" : ""})`
                  : ""}
              </span>
            </>
          ) : (
            <>
              <XCircle size={14} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">
                {result.errors.length} error
                {result.errors.length !== 1 ? "s" : ""} found
              </span>
            </>
          )}
          <button
            onClick={handleCopy}
            className="ml-auto p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            title="Copy report"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {result.steps.map((step, i) => (
            <StepRow key={step.nodeId} step={step} index={i} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StepRow({ step, index }: { step: SimulationStep; index: number }) {
  const Icon =
    step.status === "error"
      ? XCircle
      : step.status === "warning"
        ? AlertTriangle
        : CheckCircle2;
  const color =
    step.status === "error"
      ? "text-red-400"
      : step.status === "warning"
        ? "text-yellow-400"
        : "text-green-400";
  const bg =
    step.status === "error"
      ? "bg-red-500/5"
      : step.status === "warning"
        ? "bg-yellow-500/5"
        : "";

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${bg}`}>
      <span className="text-[10px] font-mono text-text-muted mt-0.5 w-4 text-right shrink-0">
        {index + 1}
      </span>
      <Icon size={12} className={`${color} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <p className="text-xs text-text-primary">{step.description}</p>
        {step.warnings.map((w, i) => (
          <p key={i} className="text-[10px] text-text-muted mt-0.5">
            {w}
          </p>
        ))}
      </div>
    </div>
  );
}
