"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";

type TimeTheme = "day" | "night";

const STORAGE_KEY = "between.time-theme";
const THEME_EVENT = "between:time-theme";

function getTheme(): TimeTheme {
  return document.documentElement.dataset.time === "night" ? "night" : "day";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

function setTheme(theme: TimeTheme) {
  document.documentElement.dataset.time = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M15.9 12.8A6.8 6.8 0 0 1 7.2 4.1a6.9 6.9 0 1 0 8.7 8.7Z" />
      <path className="time-toggle__star" d="m14.8 3.1.45 1.05 1.05.45-1.05.45-.45 1.05-.45-1.05-1.05-.45 1.05-.45.45-1.05Z" />
    </svg>
  );
}

export function TimeThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribe, getTheme, () => "day");
  const isNight = theme === "night";
  const nextLabel = isNight ? t("Switch to daytime", "দিনের আলোতে যান") : t("Switch to nighttime", "রাতের আলোতে যান");

  return (
    <button
      type="button"
      className="time-toggle"
      data-mode={theme}
      data-compact={compact ? "true" : undefined}
      role="switch"
      aria-checked={isNight}
      aria-label={nextLabel}
      title={nextLabel}
      onClick={() => setTheme(isNight ? "day" : "night")}
    >
      <span className="time-toggle__thumb" aria-hidden="true" />
      <span className="time-toggle__option" data-active={!isNight} aria-hidden="true">
        <SunIcon />
        <span>{t("Day", "দিন")}</span>
      </span>
      <span className="time-toggle__option" data-active={isNight} aria-hidden="true">
        <MoonIcon />
        <span>{t("Night", "রাত")}</span>
      </span>
    </button>
  );
}
