"use client";

import { useSkillStore } from "@/stores/skill";
import WelcomeCanvas from "@/components/canvas/WelcomeCanvas";
import SkillCanvas from "@/components/canvas/SkillCanvas";

export default function CanvasRouter() {
  const selectedItemId = useSkillStore((s) => s.selectedItemId);
  const selectedItemType = useSkillStore((s) => s.selectedItemType);

  if (!selectedItemId || !selectedItemType) {
    return <WelcomeCanvas />;
  }

  if (selectedItemType === "skill") {
    return <SkillCanvas key={selectedItemId} skillId={selectedItemId} />;
  }

  return <WelcomeCanvas />;
}
