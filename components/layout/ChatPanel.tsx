"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePluginStore } from "@/stores/plugin";
import { sendChatMessage } from "@/lib/ai/assistant";
import type { StreamEvent } from "@/lib/ai/assistant";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import ChatMessage from "@/components/chat/ChatMessage";
import type { AssistantAction, Skill, Agent, MCP, Command, Hook } from "@/types";

export default function ChatPanel() {
  const chatMessages = usePluginStore((s) => s.chatMessages);
  const addChatMessage = usePluginStore((s) => s.addChatMessage);

  const addSkill = usePluginStore((s) => s.addSkill);
  const addAgent = usePluginStore((s) => s.addAgent);
  const addMCP = usePluginStore((s) => s.addMCP);
  const addCommand = usePluginStore((s) => s.addCommand);
  const addHook = usePluginStore((s) => s.addHook);
  const selectItem = usePluginStore((s) => s.selectItem);

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
      // Use AI-provided ID if present (for cross-references), otherwise generate
      const id = (data.id as string) || crypto.randomUUID();

      switch (action.type) {
        case "create_skill":
          addSkill({
            id,
            name: (data.name as string) || "Untitled Skill",
            description: (data.description as string) || "",
            content: (data.content as string) || "",
            files: [],
            source: "local",
            categories: [],
            tags: [],
          } satisfies Skill);
          break;

        case "create_agent":
          addAgent({
            id,
            name: (data.name as string) || "Untitled Agent",
            description: (data.description as string) || "",
            model: (data.model as string) || "claude-sonnet-4-20250514",
            context: "fork",
            allowedTools: (data.allowedTools as string[]) || [],
            mcpIds: (data.mcpIds as string[]) || [],
            skillIds: (data.skillIds as string[]) || [],
            instructions: (data.instructions as string) || "",
          } satisfies Agent);
          break;

        case "add_mcp":
          addMCP({
            id,
            name: (data.name as string) || "Untitled MCP",
            description: (data.description as string) || "",
            source: (data.source as string) || "",
            transport: (data.transport as string[]) || ["stdio"],
            installCommand: (data.installCommand as string) || "",
            authType: null,
            tools: [],
            configuredEnvVars: {},
            isConfigured: false,
            categories: [],
            isOfficial: false,
          } satisfies MCP);
          break;

        case "create_command": {
          const nodes = (data.nodes as Command["nodes"]) || [];
          const edges = (data.edges as Command["edges"]) || [];
          addCommand({
            id,
            name: (data.name as string) || "Untitled Command",
            description: (data.description as string) || "",
            nodes,
            edges,
          } satisfies Command);
          // Select the command to show the flow
          selectItem(id, "command");
          break;
        }

        case "create_hook":
          addHook({
            id,
            name: (data.name as string) || "Untitled Hook",
            enabled: true,
            event: (data.event as string) || "",
            matcher: (data.matcher as string) || "",
            action: (data.action as Hook["action"]) || {
              type: "bash",
              config: {},
            },
          } satisfies Hook);
          break;
      }
    },
    [addSkill, addAgent, addMCP, addCommand, addHook, selectItem]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput("");

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: text,
      timestamp: Date.now(),
    };
    addChatMessage(userMessage);

    setIsLoading(true);
    setStreamingContent("");

    try {
      const state = usePluginStore.getState();
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
        id: crypto.randomUUID(),
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-xs">
        {chatMessages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-center gap-2 py-12">
            <p className="text-xs">Describe what you want to build.</p>
            <p className="text-[10px] text-text-muted/60">
              e.g. &quot;Create a code review agent with GitHub MCP&quot;
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

        {/* Streaming message */}
        {isLoading && streamingContent && (
          <div className="mr-auto bg-bg-tertiary text-text-secondary px-3 py-2 rounded-lg text-xs max-w-[85%]">
            <div className="prose prose-sm max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_pre]:text-[11px] [&_pre]:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-text-muted text-xs px-3 py-2">
            <Loader2 size={12} className="animate-spin" />
            <span>thinking...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
