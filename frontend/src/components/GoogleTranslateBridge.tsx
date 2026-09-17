"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/LanguageContext";

declare global {
  interface Window {
    googleTranslateInit?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

export function setGoogleTranslateCookie(langCode: string) {
  if (typeof window === "undefined") return;
  const hostname = window.location.hostname;

  if (langCode === "en" || !langCode) {
    // Clear/expire googtrans cookies
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname}`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    document.cookie = `googtrans=/en/en; path=/; domain=${hostname}`;
    document.cookie = `googtrans=/en/en; path=/`;

    // Trigger reset on google translate combo element if present
    const selectElem = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (selectElem) {
      if (selectElem.value !== "en") {
        selectElem.value = "en";
        selectElem.dispatchEvent(new Event("change"));
      }
    }
    return;
  }

  const target = `/en/${langCode}`;
  document.cookie = `googtrans=${target}; path=/; domain=${hostname}`;
  document.cookie = `googtrans=${target}; path=/`;

  const selectElem = document.querySelector(".goog-te-combo") as HTMLSelectElement;
  if (selectElem) {
    if (selectElem.value !== langCode) {
      selectElem.value = langCode;
    }
    selectElem.dispatchEvent(new Event("change"));
  }
}

export function GoogleTranslateBridge() {
  const pathname = usePathname();
  const { language, isTranslateActive } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Callback initialization
    window.googleTranslateInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi,ta,te,kn,ml,mr,bn,gu,pa,or,as,ur",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          "google_translate_element"
        );
      }
    };

    // Load Google Translate Script if not present
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Re-trigger translation on SPA route change or language change
  useEffect(() => {
    if (!isTranslateActive || language === "en") {
      setGoogleTranslateCookie("en");
      return;
    }
    const timer = setTimeout(() => {
      setGoogleTranslateCookie(language);
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname, language, isTranslateActive]);

  // MutationObserver to automatically translate dynamically loaded content (API fetches, cards, comments, chat)
  useEffect(() => {
    if (typeof window === "undefined" || !isTranslateActive || language === "en") return;

    let debounceTimer: NodeJS.Timeout;
    const observer = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          setGoogleTranslateCookie(language);
        }, 500);
      }
    });

    const targetNode = document.querySelector("main") || document.body;
    if (targetNode) {
      observer.observe(targetNode, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [language, isTranslateActive]);

  return <div id="google_translate_element" className="hidden" aria-hidden="true" />;
}

