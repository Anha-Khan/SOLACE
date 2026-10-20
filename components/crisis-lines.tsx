"use client";

import { useI18n } from "@/lib/i18n";
import { EMERGENCY_TEL, KAAN_NUMBER, KAAN_TEL } from "@/lib/types";

export function CrisisLines({ id = "crisis-lines" }: { id?: string }) {
  const { t } = useI18n();
  return (
    <section id={id} aria-label={t("Crisis numbers", "সংকটের নম্বর")} className="space-y-6">
      <div>
        <p className="font-serif text-2xl leading-tight">{t("Kaan Pete Roi", "কান পেতে রই")}</p>
        <p className="mt-2 text-sm leading-relaxed">
          {t("Every day, 3:00 PM–3:00 AM, no holidays", "প্রতিদিন, দুপুর ৩টা থেকে ভোর ৩টা, ছুটির দিন নেই")}
        </p>
        <p className="mt-1 text-sm">{t("Verified October 2026", "অক্টোবর ২০২৬-এ যাচাই করা")}</p>
        <a
          href={KAAN_TEL}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-ink px-4 py-2 text-sm"
        >
          {t("Call", "কল")} {KAAN_NUMBER}
        </a>
      </div>
      <div className="border-t border-ink/10 pt-5">
        <p className="text-sm">{t("Emergency services", "জরুরি সেবা")}</p>
        <p className="mt-1 text-sm text-muted">
          {t(
            "For immediate danger. Separate from the emotional-support line.",
            "তাৎক্ষণিক বিপদের জন্য। আবেগের সাপোর্ট লাইন থেকে আলাদা।",
          )}
        </p>
        <a
          href={EMERGENCY_TEL}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-ink/30 px-4 py-2 text-sm"
        >
          {t("Call", "কল")} 999
        </a>
      </div>
    </section>
  );
}
