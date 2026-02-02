interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-text-muted/10 text-text-secondary",
  success: "bg-accent-green/10 text-accent-green",
  warning: "bg-accent-orange/10 text-accent-orange",
  error: "bg-red-500/10 text-red-400",
  info: "bg-accent-blue/10 text-accent-blue",
};

export default function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-md ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
