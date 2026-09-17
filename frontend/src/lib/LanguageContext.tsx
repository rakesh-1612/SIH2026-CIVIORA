"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setGoogleTranslateCookie } from "@/components/GoogleTranslateBridge";

// Synchronous locale dictionaries
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";
import kn from "@/locales/kn.json";
import ml from "@/locales/ml.json";
import mr from "@/locales/mr.json";
import bn from "@/locales/bn.json";
import gu from "@/locales/gu.json";
import pa from "@/locales/pa.json";
import or from "@/locales/or.json";
import as from "@/locales/as.json";
import ur from "@/locales/ur.json";

export interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
  label: string;
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", englishName: "English", label: "English", dir: "ltr" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", label: "हिन्दी — Hindi", dir: "ltr" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", label: "தமிழ் — Tamil", dir: "ltr" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu", label: "తెలుగు — Telugu", dir: "ltr" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", label: "ಕನ್ನಡ — Kannada", dir: "ltr" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", label: "മലയാളം — Malayalam", dir: "ltr" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi", label: "मराठी — Marathi", dir: "ltr" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", label: "বাংলা — Bengali", dir: "ltr" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", label: "ગુજરાતી — Gujarati", dir: "ltr" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", label: "ਪੰਜਾਬੀ — Punjabi", dir: "ltr" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia", label: "ଓଡ଼ିଆ — Odia", dir: "ltr" },
  { code: "as", nativeName: "অসমীয়া", englishName: "Assamese", label: "অসমীয়া — Assamese", dir: "ltr" },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", label: "اردو — Urdu", dir: "rtl" },
];

const dictionaries: Record<string, Record<string, any>> = {
  en, hi, ta, te, kn, ml, mr, bn, gu, pa, or, as, ur
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isTranslateActive: boolean;
  toggleTranslate: (enable?: boolean) => void;
  dir: "ltr" | "rtl";
  t: (key: string, defaultText?: string) => string;
  currentLangObj: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  isTranslateActive: false,
  toggleTranslate: () => {},
  dir: "ltr",
  t: (key: string, defaultText?: string) => defaultText || key,
  currentLangObj: SUPPORTED_LANGUAGES[0],
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<string>("en");
  const [isTranslateActive, setIsTranslateActive] = useState<boolean>(false);

  useEffect(() => {
    const savedActive = localStorage.getItem("civiora_translate_active") === "true";
    const savedLang = localStorage.getItem("civiora_lang");
    
    if (savedActive && savedLang && dictionaries[savedLang] && savedLang !== "en") {
      setIsTranslateActive(true);
      setLanguageState(savedLang);
    } else {
      setIsTranslateActive(false);
      setLanguageState("en");
    }
  }, []);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const dir = currentLangObj.dir;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
      if (isTranslateActive && language !== "en") {
        setGoogleTranslateCookie(language);
      } else {
        setGoogleTranslateCookie("en");
      }
    }
  }, [language, dir, isTranslateActive]);

  const toggleTranslate = (enable?: boolean) => {
    const nextState = enable !== undefined ? enable : !isTranslateActive;
    setIsTranslateActive(nextState);
    localStorage.setItem("civiora_translate_active", String(nextState));

    if (!nextState) {
      setLanguageState("en");
      localStorage.setItem("civiora_lang", "en");
      setGoogleTranslateCookie("en");
    } else {
      const targetLang = language !== "en" ? language : "hi";
      setLanguageState(targetLang);
      localStorage.setItem("civiora_lang", targetLang);
      setGoogleTranslateCookie(targetLang);
    }
  };

  const setLanguage = (lang: string) => {
    if (dictionaries[lang]) {
      if (lang === "en") {
        setIsTranslateActive(false);
        localStorage.setItem("civiora_translate_active", "false");
        setLanguageState("en");
        localStorage.setItem("civiora_lang", "en");
        setGoogleTranslateCookie("en");
      } else {
        setIsTranslateActive(true);
        localStorage.setItem("civiora_translate_active", "true");
        setLanguageState(lang);
        localStorage.setItem("civiora_lang", lang);
        setGoogleTranslateCookie(lang);
      }
    }
  };

  const t = (key: string, defaultText?: string): string => {
    if (!key) return defaultText || "";
    
    const parts = key.split(".");
    
    const getNested = (obj: any, keys: string[]): string | null => {
      let current = obj;
      for (const k of keys) {
        if (!current || typeof current !== "object") return null;
        current = current[k];
      }
      return typeof current === "string" ? current : null;
    };

    // 1. Try current language
    let result = getNested(dictionaries[language], parts);
    if (result) return result;

    // 2. Fallback to English
    result = getNested(dictionaries["en"], parts);
    if (result) return result;

    // 3. Fallback to provided default text or capitalized key basename
    if (defaultText) return defaultText;
    
    const lastKey = parts[parts.length - 1];
    return lastKey.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isTranslateActive, toggleTranslate, dir, t, currentLangObj }}>
      <div dir={dir}>{children}</div>
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
