"use client";

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 w-24 bg-slate-700/60 rounded"></div>
        <div className="h-5 w-16 bg-slate-700/60 rounded-md"></div>
      </div>
      <div className="h-6 w-3/4 bg-slate-700/60 rounded"></div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-700/40 rounded"></div>
        <div className="h-3 w-5/6 bg-slate-700/40 rounded"></div>
      </div>
      <div className="pt-4 border-t border-slate-700/40 flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-700/60 rounded"></div>
        <div className="h-4 w-20 bg-indigo-500/20 rounded"></div>
      </div>
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center space-y-2 animate-pulse">
      <div className="h-3 w-20 bg-slate-700/60 rounded mx-auto"></div>
      <div className="h-8 w-12 bg-slate-700/80 rounded mx-auto"></div>
    </div>
  );
}
