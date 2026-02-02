"use client";

import { Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  scope?: { value: string; label: string }[];
  className?: string;
}

export default function SearchInput({
  placeholder = "Search...",
  value: controlledValue,
  onChange,
  onSearch,
  scope,
  className = "",
}: SearchInputProps) {
  const [internal, setInternal] = useState(controlledValue ?? "");
  const [selectedScope, setSelectedScope] = useState(scope?.[0]?.value ?? "");
  const [hasTyped, setHasTyped] = useState(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const val = controlledValue ?? internal;

  useEffect(() => {
    if (!hasTyped) return;
    const timer = setTimeout(() => onSearchRef.current?.(val), 400);
    return () => clearTimeout(timer);
  }, [val, hasTyped]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      setHasTyped(true);
      onSearchRef.current?.(val);
    }
  }

  return (
    <div className={`flex items-center border border-border-default bg-bg-tertiary rounded-lg ${className}`}>
      <Search size={14} className="ml-3 text-text-muted shrink-0" />
      <input
        type="text"
        className="flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none"
        placeholder={placeholder}
        value={val}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          if (!hasTyped) setHasTyped(true);
          setInternal(e.target.value);
          onChange?.(e.target.value);
        }}
      />
      {scope && scope.length > 0 && (
        <select
          value={selectedScope}
          onChange={(e) => setSelectedScope(e.target.value)}
          className="bg-bg-secondary border-l border-border-default rounded-r-lg px-2 py-2 text-xs text-text-secondary outline-none cursor-pointer"
        >
          {scope.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
