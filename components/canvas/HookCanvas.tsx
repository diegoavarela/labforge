"use client";

import { Webhook } from "lucide-react";
import CopyMarkdown from "@/components/ui/CopyMarkdown";
import { usePluginStore } from "@/stores/plugin";

export default function HookCanvas({ hookId }: { hookId: string }) {
  const hook = usePluginStore((s) => s.hooks.find((h) => h.id === hookId));
  const updateHook = usePluginStore((s) => s.updateHook);
  const toggleHook = usePluginStore((s) => s.toggleHook);

  if (!hook) return null;

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-hook">
            <Webhook size={18} />
            <input
              value={hook.name}
              onChange={(e) => updateHook(hookId, { name: e.target.value })}
              className="text-xl font-semibold bg-transparent text-text-primary focus:outline-none border-b border-transparent focus:border-hook w-full"
            />
            <CopyMarkdown
              label="Copy JSON"
              getContent={() => JSON.stringify({ event: hook.event, matcher: hook.matcher, action: hook.action }, null, 2)}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => toggleHook(hookId)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                hook.enabled
                  ? "bg-green-500/10 text-green-400"
                  : "bg-bg-tertiary text-text-muted"
              }`}
            >
              {hook.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {/* Config */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 space-y-3">
          <h3 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Event</label>
              <input
                value={hook.event}
                onChange={(e) => updateHook(hookId, { event: e.target.value })}
                placeholder="e.g. post-commit, pre-push..."
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Matcher</label>
              <input
                value={hook.matcher}
                onChange={(e) => updateHook(hookId, { matcher: e.target.value })}
                placeholder="e.g. **/*.ts"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Action Type</label>
              <select
                value={hook.action.type}
                onChange={(e) =>
                  updateHook(hookId, {
                    action: { ...hook.action, type: e.target.value as "bash" | "mcp_call" | "agent" },
                  })
                }
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-border-focus"
              >
                <option value="bash">bash</option>
                <option value="mcp_call">mcp_call</option>
                <option value="agent">agent</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
