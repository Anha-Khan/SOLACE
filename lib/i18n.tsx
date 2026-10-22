"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Language } from "./types";

const STORAGE_KEY = "between.language";
const EVENT = "between:language";

function readLang(): Language {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

function getSnapshot(): Language {
  if (typeof window === "undefined") return "en";
  return readLang();
}

function getServerSnapshot(): Language {
  return "en";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function setLang(language: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* storage unavailable — the UI still switches */
  }
  window.dispatchEvent(new Event(EVENT));
  document.documentElement.lang = language === "bn" ? "bn" : "en";
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);
  return {
    lang,
    t: (en: string, bn: string) => (lang === "bn" ? bn : en),
    setLang,
  };
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("Language", "ভাষা")}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      {(
        [
          ["en", "English"],
          ["bn", "বাংলা"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={lang === id}
          onClick={() => setLang(id)}
          className={`min-h-11 px-1 text-sm ${lang === id ? "text-ink underline decoration-clay underline-offset-4" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
