"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Github, LogOut, ChevronDown } from "lucide-react";
import Button from "@/components/ui/Button";

export default function LoginButton() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <span>{session.user?.name || "User"}</span>
        <ChevronDown size={12} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 bg-bg-tertiary border border-border-default shadow-[4px_4px_0_0_#000] z-50 min-w-[140px]">
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
