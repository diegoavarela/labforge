"use client";

import {
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type {
  ValidationReport as Report,
  ValidationIssue,
} from "@/lib/validator/plugin";

interface Props {
  report: Report;
  onNavigate?: (componentId: string, componentType: string) => void;
}

export default function ValidationReport({ report, onNavigate }: Props) {
  const errors = report.issues.filter((i) => i.severity === "error");
  const [expanded, setExpanded] = useState(false);
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const infos = report.issues.filter((i) => i.severity === "info");

  if (report.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs text-green-400 font-medium">
          All checks passed
        </span>
      </div>
    );
  }

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-bg-tertiary hover:bg-bg-secondary transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-xs font-medium text-text-primary">
            Validation
          </span>
          {errors.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500/20 text-red-400 rounded">
              {errors.length} error{errors.length !== 1 ? "s" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-yellow-500/20 text-yellow-400 rounded">
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </span>
          )}
          {infos.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-400 rounded">
              {infos.length} info
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-border-default">
          {report.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onNavigate,
}: {
  issue: ValidationIssue;
  onNavigate?: (id: string, type: string) => void;
}) {
  const Icon =
    issue.severity === "error"
      ? XCircle
      : issue.severity === "warning"
        ? AlertTriangle
        : Info;
  const color =
    issue.severity === "error"
      ? "text-red-400"
      : issue.severity === "warning"
        ? "text-yellow-400"
        : "text-blue-400";

  return (
    <button
      onClick={() =>
        issue.componentId && onNavigate?.(issue.componentId, issue.component)
      }
      className="w-full flex items-start gap-2 px-3 py-2 hover:bg-bg-secondary/50 transition-colors text-left cursor-pointer"
      disabled={!issue.componentId}
    >
      <Icon size={12} className={`${color} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {issue.component}
          </span>
          <span className="text-xs text-text-primary">
            {issue.componentName}
          </span>
        </div>
        <p className="text-[11px] text-text-secondary">{issue.message}</p>
        {issue.fix && (
          <p className="text-[10px] text-text-muted mt-0.5">
            Fix: {issue.fix}
          </p>
        )}
      </div>
    </button>
  );
}
