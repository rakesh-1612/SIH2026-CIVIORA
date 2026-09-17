"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Lock, ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("CITIZEN" | "UNIVERSITY" | "GOVERNMENT_ADMIN" | "INDUSTRY_PARTNER" | "EXPERT")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400 gap-3">
        <Lock className="w-5 h-5 animate-pulse text-indigo-400" />
        <span className="text-sm font-semibold">Verifying Security Session & Permissions...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
            Restricted Area • 403 Forbidden
          </div>
          <h1 className="text-3xl font-extrabold text-white">Access Restricted Workspace</h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Your authenticated role (<strong className="text-amber-400">{user.role}</strong>) does not have permission to access this specific module.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push(user.role === "CITIZEN" ? "/" : user.role === "UNIVERSITY" ? "/institution" : user.role === "INDUSTRY_PARTNER" ? "/industry" : "/admin")}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30"
          >
            Return to My {user.role.replace("_", " ")} Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
