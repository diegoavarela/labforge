"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  color?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent-orange text-white hover:opacity-90 active:scale-[0.98]",
  secondary:
    "bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-hover active:scale-[0.98]",
  ghost:
    "bg-transparent text-text-primary hover:bg-bg-hover",
  danger:
    "bg-red-500 text-white hover:opacity-90 active:scale-[0.98]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  color,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      disabled={disabled}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
