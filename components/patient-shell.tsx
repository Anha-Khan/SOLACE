"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { effectiveLevel } from "@/lib/select";
import { useStore } from "@/lib/store";

const LINKS = [
  { href: "/home", label: "Today" },
  { href: "/journal", label: "Journal" },
  { href: "/safety-plan", label: "Plan" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function PatientShell({
  children,
  crisis = true,
}: {
  children: React.ReactNode;
  crisis?: boolean;
}) {
  const pathname = usePathname();
  const { state } = useStore();
  const { t } = useI18n();
  const level = effectiveLevel(state);
  const labels: Record<string, string> = {
    "/home": t("Today", "আজ"),
    "/journal": t("Journal", "জার্নাল"),
    "/safety-plan": t("Plan", "পরিকল্পনা"),
    "/history": t("History", "ইতিহাস"),
    "/settings": t("Settings", "সেটিংস"),
  };
  const links =
    level === 3
      ? LINKS.filter((link) => link.href === "/home" || link.href === "/settings")
      : LINKS;

  return (
    <div className="patient-root min-h-dvh text-ink">
      <div className="patient-frame mx-auto flex min-h-dvh w-full flex-col px-5">
        <header className="flex items-center justify-between py-5">
          <Link href="/home" className="font-serif text-2xl tracking-tight">
            Between
          </Link>
          <Link href="/exit" className="soft-chip">
            {t("Exit", "বেরিয়ে যান")}
          </Link>
        </header>
        <main className="patient-main flex-1 pb-36">{children}</main>
      </div>
      <div className="fixed inset-x-0 bottom-3 z-20 px-3">
        <div className="patient-nav mx-auto w-full rounded-[1.7rem] bg-card/95 px-4 py-3 shadow-[0_12px_30px_rgba(63,92,74,0.12)]">
          {crisis ? (
            <div className="mb-1 flex justify-end">
              <Link href="/crisis" className="text-xs text-clay">
                {t("Help now", "এখনই সাহায্য")}
              </Link>
            </div>
          ) : null}
          <nav aria-label="App" className="flex justify-between gap-1 text-[13px]">
            {links.map((link) => {
              const current = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-full px-2 py-2 ${current ? "bg-sage/25 text-ink" : "text-muted"}`}
                >
                  {labels[link.href] ?? link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export function RequireProfile({ children }: { children: React.ReactNode }) {
  const { ready, state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!state.profile.onboardingComplete) router.replace("/onboarding");
  }, [ready, router, state.profile.onboardingComplete]);

  if (!ready || !state.profile.onboardingComplete) {
    return <div className="min-h-dvh bg-paper" aria-hidden="true" />;
  }

  return <PatientShell>{children}</PatientShell>;
}

export function PaperScreen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
