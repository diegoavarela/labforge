"use client";

import { useState, useCallback } from "react";
import { Search, Download, Loader2, Package, RefreshCw, AlertCircle } from "lucide-react";

interface SearchResult {
  slug: string;
  name: string;
  description: string;
}

interface InstalledSkill {
  slug: string;
  info: string;
}

export default function MarketplacePanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [installed, setInstalled] = useState<InstalledSkill[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"search" | "installed">("search");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/clawhub/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleInstall = useCallback(async (slug: string) => {
    setInstalling(slug);
    setStatus(null);
    try {
      const res = await fetch("/api/clawhub/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (data.error) {
        setStatus(`Error: ${data.error}`);
      } else {
        setStatus(`Installed ${slug} → ${data.path}`);
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Install failed"}`);
    } finally {
      setInstalling(null);
    }
  }, []);

  const loadInstalled = useCallback(async () => {
    try {
      const res = await fetch("/api/clawhub/list");
      const data = await res.json();
      setInstalled(data.installed || []);
    } catch {}
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-border-default">
        <button
          onClick={() => setTab("search")}
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "search" ? "text-text-primary border-purple-400" : "text-text-muted border-transparent hover:text-text-secondary"
          }`}
        >
          <Search size={11} className="inline mr-1" />
          Browse ClawHub
        </button>
        <button
          onClick={() => { setTab("installed"); loadInstalled(); }}
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === "installed" ? "text-text-primary border-green-400" : "text-text-muted border-transparent hover:text-text-secondary"
          }`}
        >
          <Package size={11} className="inline mr-1" />
          Installed
        </button>
      </div>

      {tab === "search" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="shrink-0 p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search skills on ClawHub..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-7 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : "Search"}
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400">
                <AlertCircle size={10} />
                {error}
              </div>
            )}
            {status && (
              <div className={`mt-2 text-[10px] px-2 py-1 rounded ${status.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                {status}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {results.map((r) => (
              <div key={r.slug} className="bg-bg-secondary border border-border-default rounded-lg p-3 flex items-start gap-3">
                <Package size={14} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary">{r.name}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">{r.description}</div>
                </div>
                <button
                  onClick={() => handleInstall(r.slug)}
                  disabled={installing === r.slug}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {installing === r.slug ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                  Install
                </button>
              </div>
            ))}
            {results.length === 0 && !searching && (
              <div className="text-center py-8 text-text-muted text-xs">
                Search the ClawHub marketplace for community skills
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "installed" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            onClick={loadInstalled}
            className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-2"
          >
            <RefreshCw size={10} />
            Refresh
          </button>
          {installed.map((s) => (
            <div key={s.slug} className="bg-bg-secondary border border-border-default rounded-lg p-3 flex items-center gap-3">
              <Package size={14} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary">{s.slug}</div>
                <div className="text-[10px] text-text-muted">{s.info}</div>
              </div>
            </div>
          ))}
          {installed.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs">
              No skills installed via ClawHub yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
