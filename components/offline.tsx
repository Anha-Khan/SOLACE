"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { SafetyPlan } from "@/lib/types";

export function useOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancel = false;
    const ping = () => {
      if (!navigator.onLine) {
        setOffline(true);
        return;
      }
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2500);
      fetch("/api/health", { signal: controller.signal })
        .then((response) => {
          if (!cancel) setOffline(!response.ok);
        })
        .catch(() => {
          if (!cancel) setOffline(true);
        })
        .finally(() => window.clearTimeout(timer));
    };
    ping();
    const on = () => setOffline(true);
    window.addEventListener("offline", on);
    window.addEventListener("online", ping);
    return () => {
      cancel = true;
      window.removeEventListener("offline", on);
      window.removeEventListener("online", ping);
    };
  }, []);

  return offline;
}

export const OFFLINE_LINE =
  "You're offline right now. Your safety plan and crisis resources are still available below.";

export function SafetyEcho({ plan }: { plan: SafetyPlan }) {
  const { t, lang } = useI18n();
  const line =
    lang === "bn" && plan.crisisLine.startsWith("Kaan Pete Roi")
      ? `কান পেতে রই — ${plan.crisisLine.split("—").pop()?.trim() ?? plan.crisisLine}`
      : plan.crisisLine;
  const lines = [
    plan.helps ? `${t("What helps a little", "যা অল্প হলেও সাহায্য করে")}: ${plan.helps}` : "",
    plan.person1 || plan.person2
      ? `${t("People", "মানুষ")}: ${[plan.person1, plan.person2].filter(Boolean).join(", ")}`
      : "",
    line ? line : "",
    plan.saferPlace ? `${t("A safer place", "একটু নিরাপদ জায়গা")}: ${plan.saferPlace}` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return (
      <p className="mt-4 text-sm">
        {t("No plan notes yet. That does not block calling.", "এখনও কোনো নোট নেই। এতে কল আটকায় না।")}
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2 text-sm leading-relaxed">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
