"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { waitingAlerts } from "@/lib/alerts";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function TherapistFrame({
  children,
  requireEntry = true,
}: {
  children: React.ReactNode;
  requireEntry?: boolean;
}) {
  const { ready, state } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const waiting = waitingAlerts(state);
  const onAlert = pathname.startsWith("/therapist/alert/");

  useEffect(() => {
    if (!ready || !requireEntry) return;
    if (!state.therapist.entered) router.replace("/therapist");
  }, [ready, requireEntry, router, state.therapist.entered]);

  if (!ready || (requireEntry && !state.therapist.entered)) {
    return <div className="min-h-dvh bg-clinic" aria-hidden="true" />;
  }

  return (
    <div className="min-h-dvh bg-clinic text-ink">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3 rounded-[1.5rem] bg-card px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-sage">{t("Demo data", "ডেমো তথ্য")}</p>
            <p className="mt-1 max-w-xl text-sm">
              {t(
                "Clinical judgment takes precedence over any summary.",
                "যেকোনো সারাংশের চেয়ে ক্লিনিকাল বিচার আগে।",
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/therapist" className="font-serif text-xl">
              Between
            </Link>
            <Link href="/" className="text-muted">
              {t("Patient site", "রোগীর সাইট")}
            </Link>
          </div>
        </header>
        {waiting.length > 0 && !onAlert ? (
          <div className="mt-4 border border-ink bg-white px-4 py-3 text-sm">
            <p>
              {t(
                "An alert has been waiting at least two hours. Open it to continue. This notice has no dismiss control.",
                "একটা সতর্কতা অন্তত দুই ঘণ্টা ধরে অপেক্ষায়। এগোতে সেটা খুলুন। এই নোটিশ সরিয়ে ফেলার কোনো নিয়ন্ত্রণ নেই।",
              )}
            </p>
            <Link href={`/therapist/alert/${waiting[0].id}`} className="mt-2 inline-block underline">
              {t("Open the alert", "সতর্কতা খুলুন")}
            </Link>
          </div>
        ) : null}
        <div className="py-6">{children}</div>
      </div>
    </div>
  );
}
