"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Download, Trash2 } from "lucide-react";
import type { Skill, RegistrySkill } from "@/types";

interface SkillCardProps {
  skill: Skill | RegistrySkill;
  isLocal: boolean;
  alreadyAdded?: boolean;
  isLoading?: boolean;
  onEdit?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
}

export default function SkillCard({
  skill,
  isLocal,
  alreadyAdded,
  isLoading,
  onEdit,
  onAdd,
  onRemove,
}: SkillCardProps) {
  const source = "source" in skill ? skill.source : "local";

  return (
    <Card variant="skill" hover className="p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono font-bold text-sm text-text-primary truncate">
          {skill.name}
        </h3>
        <Badge variant={isLocal ? "info" : "default"}>{source}</Badge>
      </div>
      <p className="text-text-secondary text-xs font-mono line-clamp-2 flex-1">
        {skill.description || "No description"}
      </p>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {"installs" in skill &&
            skill.installs != null &&
            skill.installs > 0 && (
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <Download size={10} />
                {skill.installs.toLocaleString()}
              </span>
            )}
        </div>
        <div className="flex items-center gap-1">
          {isLocal ? (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Edit
              </Button>
              <button
                onClick={onRemove}
                className="p-1.5 text-text-muted hover:text-red-400 cursor-pointer transition-colors"
                title="Remove skill"
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : alreadyAdded ? (
            <span className="text-[11px] font-mono text-text-muted px-2 py-1">
              Added
            </span>
          ) : isLoading ? (
            <span className="text-[11px] font-mono text-text-muted px-2 py-1 animate-pulse">
              Loading...
            </span>
          ) : (
            <Button variant="primary" size="sm" onClick={onAdd}>
              + Add
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
