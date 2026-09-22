"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { WelcomeLoginView } from "@/components/WelcomeLoginView";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "UNIVERSITY") {
        router.push("/institution");
      } else if (user.role === "GOVERNMENT_ADMIN") {
        router.push("/admin");
      } else if (user.role === "INDUSTRY_PARTNER") {
        router.push("/industry");
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-sm font-semibold">Verifying Security Session & Permissions...</span>
      </div>
    );
  }

  return <WelcomeLoginView />;
}
