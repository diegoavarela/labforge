"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType, AssistantAction } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
  actions?: AssistantAction[];
  onApplyAction?: (action: AssistantAction) => void;
}

const ACTION_LABELS: Record<string, string> = {
  create_skill: "Create Skill",
  create_agent: "Create Agent",
  add_mcp: "Add MCP",
  create_command: "Create Command",
  create_hook: "Create Hook",
};

export default function ChatMessage({
  message,
  actions,
  onApplyAction,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayContent = message.content;

  return (
    <div
      className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
        isUser
          ? "ml-auto bg-bg-tertiary text-text-primary"
          : "mr-auto bg-bg-hover text-text-secondary"
      }`}
    >
      <div className="break-words">
        {isUser ? (
          <span className="whitespace-pre-wrap">{displayContent}</span>
        ) : (
          <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_pre]:text-[11px] [&_pre]:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
          </div>
        )}
      </div>

      {actions && actions.length > 0 && onApplyAction && (
        <div className="mt-2 flex flex-col gap-1">
          {actions.length > 1 && (
            <button
              onClick={() => actions.forEach((a) => onApplyAction(a))}
              className="w-full px-2 py-1.5 text-[11px] font-medium bg-accent-orange/10 text-accent-orange border border-accent-orange/20 rounded-lg hover:bg-accent-orange/20 transition-colors cursor-pointer"
            >
              Apply All ({actions.length})
            </button>
          )}
          <details className={actions.length > 1 ? "" : "open"}>
            {actions.length > 1 && (
              <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text-secondary py-0.5">
                {actions.length} actions
              </summary>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {actions.map((action, idx) => {
                const data = action.data as Record<string, unknown>;
                return (
                  <button
                    key={idx}
                    onClick={() => onApplyAction(action)}
                    className="px-2 py-0.5 text-[10px] font-medium bg-accent-green/10 text-accent-green border border-accent-green/20 rounded-md hover:bg-accent-green/20 transition-colors cursor-pointer"
                  >
                    {ACTION_LABELS[action.type] || action.type}
                    {data?.name ? ` "${data.name}"` : ""}
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
