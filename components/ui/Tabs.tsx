"use client";

import { useState } from "react";

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export default function Tabs({ tabs, defaultValue, className = "" }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value ?? "");

  const activeTab = tabs.find((t) => t.value === active);

  return (
    <div className={className}>
      <div className="flex border-b border-border-default">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActive(tab.value)}
            className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
              active === tab.value
                ? "text-text-primary border-b-2 border-accent-orange"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  );
}
