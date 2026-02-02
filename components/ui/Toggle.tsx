"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: "sm" | "md";
}

export default function Toggle({
  checked,
  onChange,
  label,
  size = "md",
}: ToggleProps) {
  const dims = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const dot = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`${dims} relative rounded-full border border-border-default transition-colors cursor-pointer ${
          checked ? "bg-accent-orange" : "bg-bg-tertiary"
        }`}
      >
        <span
          className={`${dot} absolute top-0.5 left-0.5 bg-white rounded-full transition-transform ${
            checked ? translate : "translate-x-0"
          }`}
        />
      </button>
      {label && (
        <span className="text-text-secondary text-xs">{label}</span>
      )}
    </label>
  );
}
