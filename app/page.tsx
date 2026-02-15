"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import InventoryPanel from "@/components/layout/InventoryPanel";
import LibraryPanel from "@/components/library/LibraryPanel";
import CanvasRouter from "@/components/canvas/CanvasRouter";
import ChatPanel from "@/components/layout/ChatPanel";
import { useSkillStore } from "@/stores/skill";
import { useLibraryStore } from "@/stores/library";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [leftTab, setLeftTab] = useState<"skills" | "library">("skills");

  useEffect(() => {
    setMounted(true);

    const lib = useLibraryStore.getState();
    lib.hydrate().then(() => {
      const libState = useLibraryStore.getState();

      // Normal hydration: load active project data into skill store
      if (libState.activeProjectId) {
        const active = libState.projects.find((p) => p.id === libState.activeProjectId);
        if (active) useSkillStore.getState().hydrate(active.data);
      }

      // If library has projects but none active, show library tab
      if (libState.projects.length > 0 && !libState.activeProjectId) {
        setLeftTab("library");
      }
    });
  }, []);

  const inventoryCollapsed = useSkillStore((s) => s.inventoryCollapsed);
  const rightPanelCollapsed = useSkillStore((s) => s.rightPanelCollapsed);
  const toggleInventory = useSkillStore((s) => s.toggleInventory);
  const toggleRightPanel = useSkillStore((s) => s.toggleRightPanel);

  const [chatWidth, setChatWidth] = useState(340);
  const isResizing = useRef(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = chatWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 280), 700);
      setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [chatWidth]);

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Skills / Library */}
        {!inventoryCollapsed ? (
          <div className="w-[260px] shrink-0 border-r border-border-default flex flex-col bg-bg-secondary">
            <div className="flex items-center justify-between px-3 py-0 border-b border-border-default">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLeftTab("skills")}
                  className={`text-[11px] font-semibold tracking-wide uppercase py-2 border-b-2 transition-colors cursor-pointer ${
                    leftTab === "skills"
                      ? "text-text-primary border-accent-orange"
                      : "text-text-muted border-transparent hover:text-text-secondary"
                  }`}
                >
                  Skills
                </button>
                <button
                  onClick={() => setLeftTab("library")}
                  className={`text-[11px] font-semibold tracking-wide uppercase py-2 border-b-2 transition-colors cursor-pointer ${
                    leftTab === "library"
                      ? "text-text-primary border-accent-orange"
                      : "text-text-muted border-transparent hover:text-text-secondary"
                  }`}
                >
                  Library
                </button>
              </div>
              <button
                onClick={toggleInventory}
                className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
            {leftTab === "skills" ? <InventoryPanel /> : <LibraryPanel />}
          </div>
        ) : (
          <div className="w-10 shrink-0 border-r border-border-default flex flex-col items-center pt-2 bg-bg-secondary">
            <button
              onClick={toggleInventory}
              className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer p-1"
            >
              <PanelLeftOpen size={14} />
            </button>
          </div>
        )}

        {/* Center: Canvas */}
        <main className="flex-1 overflow-hidden min-w-0">
          <CanvasRouter />
        </main>

        {/* Right: Chat */}
        {!rightPanelCollapsed ? (
          <div
            className="shrink-0 border-l border-border-default flex flex-col bg-bg-secondary relative"
            style={{ width: chatWidth }}
          >
            <div
              onMouseDown={handleResizeStart}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border-focus/50 active:bg-border-focus transition-colors z-10"
            />
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
              <span className="text-[11px] font-semibold text-text-secondary tracking-wide uppercase">
                Assistant
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => useSkillStore.getState().clearChatMessages()}
                  className="text-text-muted hover:text-red-400 transition-colors cursor-pointer p-0.5 rounded hover:bg-red-500/10"
                  title="Clear chat"
                >
                  <Trash2 size={12} />
                </button>
                <button
                  onClick={toggleRightPanel}
                  className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                >
                  <PanelRightClose size={14} />
                </button>
              </div>
            </div>
            <ChatPanel />
          </div>
        ) : (
          <div className="w-10 shrink-0 border-l border-border-default flex flex-col items-center pt-2 bg-bg-secondary">
            <button
              onClick={toggleRightPanel}
              className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer p-1"
            >
              <PanelRightOpen size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
