"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrapper";

export default function UnauthorizedPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
      <FadeIn direction="down">
        <div className="w-16 h-16 rounded-3xl bg-red-500/15 border border-red-500/30 text-red-500 mx-auto flex items-center justify-center font-bold shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <h1 className="text-3xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight">
          403 — Unauthorized Workspace Access
        </h1>
        <p className="text-sm text-slate-300 dark:text-slate-300 light:text-slate-600 max-w-md mx-auto leading-relaxed pt-2 font-medium">
          Your current account role does not have permission to view this restricted page or endpoint. Please switch to an authorized role account to proceed.
        </p>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <Lock className="w-4 h-4 text-white" /> Switch Role Account
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl bg-slate-900 dark:bg-slate-900 light:bg-white text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-700 dark:border-slate-700 light:border-slate-300 font-bold text-xs flex items-center gap-2 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
