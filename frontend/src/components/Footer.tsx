"use client";

import { Shield } from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-slate-200 text-slate-500 text-sm py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <Shield className="w-5 h-5 text-indigo-600" />
          <span className="font-extrabold text-slate-900">{t("footer.platformName", "CIVIORA Platform")}</span>
        </div>
        <p className="text-xs text-slate-500 font-medium text-center ltr:md:text-right rtl:md:text-left max-w-xl">
          {t("footer.description", "Connecting citizens, academic institutions, industry partners, and government administration to solve societal challenges.")}
        </p>
      </div>
    </footer>
  );
}
