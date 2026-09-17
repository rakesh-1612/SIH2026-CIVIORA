import React from "react";
import { useTranslation } from "@/lib/LanguageContext";

interface PriorityBadgeProps {
  level: string;
  score?: number;
  showScore?: boolean;
}

export function PriorityBadge({ level, score, showScore = true }: PriorityBadgeProps) {
  const { t } = useTranslation();
  const normalized = (level || "MEDIUM").toUpperCase();

  const colorMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    CRITICAL: {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      dot: "bg-red-500 animate-ping"
    },
    HIGH: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      dot: "bg-amber-500"
    },
    MEDIUM: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      dot: "bg-emerald-500"
    },
    LOW: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      dot: "bg-blue-500"
    }
  };

  const style = colorMap[normalized] || colorMap.MEDIUM;
  const translatedLabel = t(`challenge.${normalized.toLowerCase()}`, normalized);

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
      <span>{translatedLabel}</span>
      {showScore && score !== undefined && <span className="font-mono text-[11px] opacity-80">({score.toFixed(0)}/100)</span>}
    </span>
  );
}
