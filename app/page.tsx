"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import InventoryPanel from "@/components/layout/InventoryPanel";
import LibraryPanel from "@/components/library/LibraryPanel";
import CanvasRouter from "@/components/canvas/CanvasRouter";
import ChatPanel from "@/components/layout/ChatPanel";
import { usePluginStore } from "@/stores/plugin";
import { useLibraryStore } from "@/stores/library";
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [leftTab, setLeftTab] = useState<"inventory" | "library">("inventory");

  useEffect(() => {
    setMounted(true);

    // Hydrate from DB, then handle localStorage migration
    const lib = useLibraryStore.getState();
    lib.hydrate().then(() => {
      const libState = useLibraryStore.getState();

      // One-time migration: if DB is empty but localStorage has data, migrate it
      if (libState.plugins.length === 0) {
        try {
          const lsLibrary = localStorage.getItem("plugin-forge-library");
          const lsPlugin = localStorage.getItem("plugin-forge-state");
          if (lsLibrary) {
            const parsed = JSON.parse(lsLibrary);
            const lsPlugins = parsed?.state?.plugins || [];
            const lsActiveId = parsed?.state?.activePluginId;
            if (lsPlugins.length > 0) {
              // Migrate each plugin to DB
              Promise.all(
                lsPlugins.map((p: { pluginName: string; data: Record<string, unknown> }, i: number) =>
                  fetch("/api/plugins", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      pluginName: p.pluginName || "Untitled",
                      data: p.data,
                      isActive: lsActiveId ? p.pluginName === lsPlugins.find((lp: { id: string }) => lp.id === lsActiveId)?.pluginName : i === 0,
                    }),
                  })
                )
              ).then(() => {
                lib.hydrate().then(() => {
                  const afterMigrate = useLibraryStore.getState();
                  if (afterMigrate.activePluginId) {
                    const active = afterMigrate.plugins.find((p) => p.id === afterMigrate.activePluginId);
                    if (active) usePluginStore.getState().hydrate(active.data);
                  }
                  // Clean up localStorage
                  localStorage.removeItem("plugin-forge-library");
                  localStorage.removeItem("plugin-forge-state");
                });
              });
              return;
            }
          }
          // Also try migrating standalone plugin state
          if (lsPlugin) {
            const parsed = JSON.parse(lsPlugin);
            const data = parsed?.state;
            if (data && (data.skills?.length || data.agents?.length || data.commands?.length)) {
              fetch("/api/plugins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pluginName: data.pluginName || "Untitled",
                  data: {
                    pluginName: data.pluginName || "",
                    version: data.version || "0.1.0",
                    skills: data.skills || [],
                    agents: data.agents || [],
                    commands: data.commands || [],
                    hooks: data.hooks || [],
                    mcps: data.mcps || [],
                    changelog: data.changelog || [],
                    dependencies: data.dependencies || [],
                  },
                  isActive: true,
                }),
              }).then(() => {
                lib.hydrate().then(() => {
                  const afterMigrate = useLibraryStore.getState();
                  if (afterMigrate.activePluginId) {
                    const active = afterMigrate.plugins.find((p) => p.id === afterMigrate.activePluginId);
                    if (active) usePluginStore.getState().hydrate(active.data);
                  }
                  localStorage.removeItem("plugin-forge-state");
                });
              });
              return;
            }
          }
        } catch {
          // localStorage migration failed silently
        }
      }

      // Normal hydration: load active plugin data into plugin store
      if (libState.activePluginId) {
        const active = libState.plugins.find((p) => p.id === libState.activePluginId);
        if (active) usePluginStore.getState().hydrate(active.data);
      }

      // If library has plugins but none active, show library tab
      if (libState.plugins.length > 0 && !libState.activePluginId) {
        setLeftTab("library");
      }
    });
  }, []);

  const inventoryCollapsed = usePluginStore((s) => s.inventoryCollapsed);
  const rightPanelCollapsed = usePluginStore((s) => s.rightPanelCollapsed);
  const toggleInventory = usePluginStore((s) => s.toggleInventory);
  const toggleRightPanel = usePluginStore((s) => s.toggleRightPanel);

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
        {/* Left: Inventory */}
        {!inventoryCollapsed ? (
          <div className="w-[260px] shrink-0 border-r border-border-default flex flex-col bg-bg-secondary">
            <div className="flex items-center justify-between px-3 py-0 border-b border-border-default">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLeftTab("inventory")}
                  className={`text-[11px] font-semibold tracking-wide uppercase py-2 border-b-2 transition-colors cursor-pointer ${
                    leftTab === "inventory"
                      ? "text-text-primary border-accent-orange"
                      : "text-text-muted border-transparent hover:text-text-secondary"
                  }`}
                >
                  Inventory
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
            {leftTab === "inventory" ? <InventoryPanel /> : <LibraryPanel />}
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

        {/* Right: Chat + Properties */}
        {!rightPanelCollapsed ? (
          <div
            className="shrink-0 border-l border-border-default flex flex-col bg-bg-secondary relative"
            style={{ width: chatWidth }}
          >
            {/* Resize handle */}
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
                  onClick={() => usePluginStore.getState().clearChatMessages()}
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
