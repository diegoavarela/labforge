"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  onChange?: (value: string) => void;
}

export default function Input({
  label,
  className = "",
  onChange,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-text-secondary text-xs font-medium">
          {label}
        </label>
      )}
      <input
        className={`bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus transition-colors ${className}`}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
    </div>
  );
}
