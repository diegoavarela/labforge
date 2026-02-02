"use client";

import { useState, useCallback } from "react";
import { Sparkles, ArrowRight, Wand2, Loader2, Maximize2, Minimize2 } from "lucide-react";
import CopyMarkdown from "@/components/ui/CopyMarkdown";
import { usePluginStore } from "@/stores/plugin";
import { useShallow } from "zustand/react/shallow";
import { sendChatMessage } from "@/lib/ai/assistant";

export default function SkillCanvas({ skillId }: { skillId: string }) {
  const skill = usePluginStore((s) => s.skills.find((sk) => sk.id === skillId));
  const updateSkill = usePluginStore((s) => s.updateSkill);
  const selectItem = usePluginStore((s) => s.selectItem);

  const usedByAgents = usePluginStore(
    useShallow((s) => s.agents.filter((a) => a.skillIds.includes(skillId)))
  );

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || generating || !skill) return;

    setGenerating(true);
    try {
      const messages = [
        {
          role: "user",
          content: text,
        },
      ];

      const systemPrompt = `You are a skill content generator for Claude Code plugins. Generate ONLY the markdown content for a skill.md file — no explanations, no wrapping, no code fences. The user will describe what the skill should do.

Current skill name: "${skill.name}"
Current skill description: "${skill.description}"

Output format: raw markdown content for the skill file. Start with a heading.`;

      let fullContent = "";
      for await (const chunk of sendChatMessage(messages, systemPrompt)) {
        fullContent += chunk;
        updateSkill(skillId, { content: fullContent });
      }
    } finally {
      setGenerating(false);
      setPrompt("");
    }
  }, [prompt, generating, skill, skillId, updateSkill]);

  if (!skill) return null;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-skill">
            <Sparkles size={18} />
            <input
              value={skill.name}
              onChange={(e) => updateSkill(skillId, { name: e.target.value })}
              className="text-xl font-semibold bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-skill w-full"
            />
          </div>
          <input
            value={skill.description}
            onChange={(e) => updateSkill(skillId, { description: e.target.value })}
            placeholder="Skill description..."
            className="text-sm bg-transparent text-text-secondary placeholder:text-text-muted focus:outline-none w-full"
          />
        </div>

        {/* Metadata */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Metadata</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Source</label>
              <span className="text-xs text-text-primary capitalize">{skill.source}</span>
            </div>
            {skill.sourceUrl && (
              <div>
                <label className="text-[11px] text-text-muted block mb-1">URL</label>
                <span className="text-xs text-text-primary font-mono truncate block">{skill.sourceUrl}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content editor with AI prompt */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Skill.md Content</h3>

          {/* AI Prompt bar */}
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe what this skill should do..."
              disabled={generating}
              className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-skill transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-skill/10 text-skill border border-skill/20 rounded-lg text-xs font-medium hover:bg-skill/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>

          <div>
            <textarea
              value={skill.content}
              onChange={(e) => updateSkill(skillId, { content: e.target.value })}
              placeholder="# Skill Name&#10;&#10;Describe the skill instructions here..."
              rows={expanded ? 40 : 16}
              className={`w-full bg-bg-tertiary border border-border-default rounded-lg px-4 py-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none font-mono leading-relaxed transition-all ${expanded ? "min-h-[600px]" : "min-h-[200px]"}`}
            />
            <div className="flex justify-end gap-1 mt-1">
              <CopyMarkdown
                label=""
                getContent={() => {
                  const fm = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---`;
                  return `${fm}\n\n${skill.content}`;
                }}
              />
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Used by */}
        {usedByAgents.length > 0 && (
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Used by</h3>
            <div className="space-y-1.5">
              {usedByAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => selectItem(agent.id, "agent")}
                  className="flex items-center gap-2 text-xs text-text-secondary hover:text-agent transition-colors cursor-pointer"
                >
                  <ArrowRight size={11} />
                  <span className="text-agent">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
