"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check, ToggleLeft, ToggleRight } from "lucide-react";
import { useTranslation, SUPPORTED_LANGUAGES, LanguageOption } from "@/lib/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

export function LanguageSelector() {
  const { language, setLanguage, isTranslateActive, toggleTranslate, currentLangObj } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setLanguage(code);
    setIsOpen(false);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTranslate(!isTranslateActive);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Main Translate Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs focus:outline-none focus:ring-2 ${
          isTranslateActive
            ? "bg-[#EFE9DC] border-[#DDD6C8] text-[#0B1F3A] focus:ring-[#0B1F3A]/40"
            : "bg-[#EFE9DC] hover:bg-[#DDD6C8] border-[#DDD6C8] text-[#0B1F3A] focus:ring-[#0B1F3A]/40"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Toggle or Select Language"
      >
        <Globe className={`w-3.5 h-3.5 shrink-0 ${isTranslateActive ? "text-[#C89B3C] animate-pulse" : "text-[#536174]"}`} />
        
        <span className="font-extrabold tracking-tight">
          {isTranslateActive ? (
            <span className="flex items-center gap-1.5">
              <span>Translate:</span>
              <span className="text-[#0B1F3A] font-extrabold">{currentLangObj.nativeName}</span>
            </span>
          ) : (
            <span>Translate</span>
          )}
        </span>

        <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${
          isTranslateActive ? "bg-[#F0F4F1] text-[#3F7D5A] border border-[#C6DFD0]" : "bg-[#DDD6C8] text-[#536174]"
        }`}>
          {isTranslateActive ? "ON" : "OFF"}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-[#536174] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 ltr:right-0 rtl:left-0 mt-2 w-64 rounded-2xl bg-[#FFFDF7] border border-[#DDD6C8] shadow-2xl z-50 overflow-hidden"
          >
            {/* Header with Switch */}
            <div className="p-3 border-b border-[#DDD6C8] bg-[#EFE9DC] flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[11px] font-extrabold text-[#0B1F3A]">
                  Google Translate
                </p>
                <p className="text-[10px] text-[#536174] font-medium">
                  {isTranslateActive ? "Active — Page Translated" : "Disabled — Normal English"}
                </p>
              </div>

              <button
                onClick={handleToggleClick}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFFDF7] border border-[#DDD6C8] shadow-2xs hover:bg-[#EFE9DC] text-xs font-bold transition-all cursor-pointer"
                title={isTranslateActive ? "Turn Off Google Translate" : "Turn On Google Translate"}
              >
                {isTranslateActive ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-[#0B1F3A]" />
                    <span className="text-[#0B1F3A] font-extrabold">ON</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-[#536174]" />
                    <span className="text-[#536174] font-bold">OFF</span>
                  </>
                )}
              </button>
            </div>

            {/* Language Selection List */}
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#536174] px-2 py-1">
                Select Target Language:
              </div>
              {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => {
                const isSelected = isTranslateActive && lang.code === language;
                const isEnglishDefault = !isTranslateActive && lang.code === "en";
                const active = isSelected || isEnglishDefault;

                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-xl transition-colors cursor-pointer ${
                      active
                        ? "bg-[#EFE9DC] text-[#0B1F3A] font-extrabold border border-[#DDD6C8]"
                        : "text-[#0B1F3A] hover:bg-[#EFE9DC] font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#0B1F3A] font-bold">{lang.label}</span>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-[#0B1F3A] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
