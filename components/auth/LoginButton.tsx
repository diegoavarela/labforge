"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Github, LogOut, ChevronDown, Check, Lock, Plus, Loader2 } from "lucide-react";
import { usePluginStore } from "@/stores/plugin";

interface GitHubRepo {
  full_name: string;
  private: boolean;
  html_url: string;
}

export default function LoginButton() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const githubRepo = usePluginStore((s) => s.githubRepo);
  const setGithubRepo = usePluginStore((s) => s.setGithubRepo);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposLoaded, setReposLoaded] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (menuOpen && session && !reposLoaded) {
      setLoadingRepos(true);
      fetch("/api/github/repos")
        .then((r) => r.json())
        .then((data) => {
          if (data.repos) setRepos(data.repos);
          setReposLoaded(true);
        })
        .catch(() => {})
        .finally(() => setLoadingRepos(false));
    }
  }, [menuOpen, session, reposLoaded]);

  if (status === "loading") {
    return (
      <div className="h-8 w-24 bg-bg-tertiary animate-pulse border border-border-default" />
    );
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono text-text-secondary border border-border-default rounded hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        title="Login with GitHub"
      >
        <Github size={12} />
        <span>GitHub</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-border-default bg-bg-tertiary hover:bg-bg-secondary text-text-primary text-xs font-mono transition-colors"
      >
        {session.user?.image && (
          <img
            src={session.user.image}
            alt=""
            className="w-5 h-5 rounded-sm border border-border-default"
          />
        )}
        <span className="max-w-[120px] truncate">
          {githubRepo ? githubRepo.split("/")[1] : session.user?.name || "User"}
        </span>
        <ChevronDown size={12} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 bg-bg-tertiary border border-border-default shadow-[4px_4px_0_0_#000] z-50 min-w-[240px]">
          <div className="px-3 py-2 border-b border-border-default">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Target Repository
            </span>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            {loadingRepos ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin text-text-muted" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setGithubRepo(null);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono text-accent-blue hover:bg-bg-secondary transition-colors"
                >
                  <Plus size={12} />
                  Create new repo
                </button>
                {repos.map((repo) => (
                  <button
                    key={repo.full_name}
                    onClick={() => {
                      setGithubRepo(repo.full_name);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-mono text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                  >
                    {githubRepo === repo.full_name ? (
                      <Check size={12} className="text-accent-blue shrink-0" />
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}
                    <span className="truncate">{repo.full_name}</span>
                    {repo.private && <Lock size={10} className="text-text-muted shrink-0" />}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="border-t border-border-default">
            <button
              onClick={() => {
                setMenuOpen(false);
                setGithubRepo(null);
                setReposLoaded(false);
                signOut();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
