import React from "react";
import { useTranslation } from "@/lib/LanguageContext";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = (status || "SUBMITTED").toUpperCase();

  const statusMap: Record<string, { labelKey: string; defaultLabel: string; bg: string; text: string; border: string }> = {
    SUBMITTED: { labelKey: "status.submitted", defaultLabel: "Submitted", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    AI_ANALYZED: { labelKey: "status.aiAnalyzed", defaultLabel: "AI Analyzed", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    UNDER_REVIEW: { labelKey: "status.underReview", defaultLabel: "Under Review", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    MATCHED: { labelKey: "status.matched", defaultLabel: "Matched", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    ACCEPTED: { labelKey: "status.accepted", defaultLabel: "Accepted", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    IN_PROGRESS: { labelKey: "status.inProgress", defaultLabel: "In Progress", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    PROTOTYPE: { labelKey: "status.prototype", defaultLabel: "Prototype Ready", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    PILOT_TESTING: { labelKey: "status.pilotTesting", defaultLabel: "Pilot Testing", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    DEPLOYED: { labelKey: "status.deployed", defaultLabel: "Deployed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    RESOLVED: { labelKey: "status.resolved", defaultLabel: "Resolved", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    DECLINED: { labelKey: "status.declined", defaultLabel: "Declined", bg: "bg-red-50", text: "text-red-600", border: "border-red-200" }
  };

  const style = statusMap[normalized] || statusMap.SUBMITTED;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide border transition-all ${style.bg} ${style.text} ${style.border}`}>
      {t(style.labelKey, style.defaultLabel)}
    </span>
  );
}
