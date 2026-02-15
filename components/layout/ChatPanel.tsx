"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { generateId } from "@/lib/utils/id";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSkillStore } from "@/stores/skill";
import { sendChatMessage } from "@/lib/ai/assistant";
import type { StreamEvent } from "@/lib/ai/assistant";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import ChatMessage from "@/components/chat/ChatMessage";
import type { AssistantAction, Skill, ScriptFile } from "@/types";

export default function ChatPanel() {
  const chatMessages = useSkillStore((s) => s.chatMessages);
  const addChatMessage = useSkillStore((s) => s.addChatMessage);
  const addSkill = useSkillStore((s) => s.addSkill);
  const updateSkill = useSkillStore((s) => s.updateSkill);
  const selectItem = useSkillStore((s) => s.selectItem);
  const skills = useSkillStore((s) => s.skills);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, streamingContent, scrollToBottom]);

  const handleApplyAction = useCallback(
    (action: AssistantAction) => {
      const data = action.data as Record<string, unknown>;
      const id = (data.id as string) || generateId();

      switch (action.type) {
        case "create_skill": {
          const scripts = Array.isArray(data.scripts)
            ? (data.scripts as ScriptFile[])
            : [];
          addSkill({
            id,
            name: (data.name as string) || "Untitled Skill",
            description: (data.description as string) || "",
            skillMd: (data.skillMd as string) || "",
            scripts,
            metadata: {},
            source: "local",
          });
          selectItem(id, "skill");
          break;
        }
        case "edit_skill_md": {
          const skillId = data.skillId as string;
          if (skillId) {
            updateSkill(skillId, { skillMd: data.skillMd as string });
          }
          break;
        }
        case "add_script": {
          const skillId = data.skillId as string;
          const skill = skills.find((s) => s.id === skillId);
          if (skill) {
            const newScript: ScriptFile = {
              filename: (data.filename as string) || "scripts/script.sh",
              content: (data.content as string) || "",
              language: (data.language as string) || "bash",
            };
            updateSkill(skillId, { scripts: [...skill.scripts, newScript] });
          }
          break;
        }
      }
    },
    [addSkill, updateSkill, selectItem, skills]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput("");

    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    addChatMessage(userMessage);

    setIsLoading(true);
    setStreamingContent("");

    try {
      const state = useSkillStore.getState();
      const systemPrompt = buildSystemPrompt(state);

      const allMessages = [...chatMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let textContent = "";

      for await (const event of sendChatMessage(allMessages, systemPrompt)) {
        if (event.type === "text") {
          textContent += event.content || "";
          setStreamingContent(textContent);
        } else if (event.type === "tool_use") {
          handleApplyAction({
            type: event.name!,
            data: event.input || {},
          });
        } else if (event.type === "error") {
          throw new Error(event.content || "Stream error");
        }
      }

      addChatMessage({
        id: generateId(),
        role: "assistant",
        content: textContent,
        timestamp: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [input, isLoading, chatMessages, addChatMessage, handleApplyAction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isLoading && (
        <div className="h-0.5 w-full bg-bg-tertiary overflow-hidden shrink-0">
          <div className="h-full w-1/3 bg-accent-orange rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-xs">
        {chatMessages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-center gap-2 py-12">
            <p className="text-xs">Describe the skill you want to create.</p>
            <p className="text-[10px] text-text-muted/60">
              e.g. &quot;Create a deployment skill with a bash script&quot;
            </p>
          </div>
        )}

        {chatMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            actions={msg.actions}
            onApplyAction={handleApplyAction}
          />
        ))}

        {isLoading && streamingContent && (
          <div className="mr-auto bg-bg-tertiary text-text-secondary px-3 py-2 rounded-lg text-xs max-w-[85%]">
            <div className="prose prose-sm max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_pre]:text-[11px] [&_pre]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-text-muted text-xs px-3 py-2">
            <Loader2 size={12} className="animate-spin" />
            <span>thinking...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-3 border-t border-border-default flex gap-2 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="describe what to build..."
          rows={2}
          className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="text-text-muted hover:text-accent-orange p-2 disabled:opacity-50 self-end transition-colors cursor-pointer"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
