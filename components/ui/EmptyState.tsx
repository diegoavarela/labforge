import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-border-default rounded-xl">
      <h3 className="font-semibold text-text-secondary text-xs mb-1">
        {title}
      </h3>
      <p className="text-text-muted text-[11px] max-w-xs mb-3">
        {description}
      </p>
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
