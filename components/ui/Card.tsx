interface CardProps {
  variant?: "skill" | "agent" | "command" | "hook" | "mcp" | "default";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const borderColors: Record<string, string> = {
  skill: "border-l-skill",
  agent: "border-l-agent",
  command: "border-l-command",
  hook: "border-l-hook",
  mcp: "border-l-mcp",
  default: "border-l-border-default",
};

export default function Card({
  variant = "default",
  children,
  className = "",
  onClick,
  hover = false,
}: CardProps) {
  return (
    <div
      className={`bg-bg-secondary border border-border-default border-l-2 ${borderColors[variant]} rounded-xl transition-colors ${hover || onClick ? "cursor-pointer hover:bg-bg-hover" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
