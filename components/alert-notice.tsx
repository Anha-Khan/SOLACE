"use client";

import { useEffect } from "react";
import { alertMinutes, alertPhase, selfOpenAlert } from "@/lib/alerts";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { CrisisLines } from "./crisis-lines";
import { EMERGENCY_TEL } from "@/lib/types";

export function AlertNotice({ demo = false }: { demo?: boolean }) {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const alert = selfOpenAlert(state);
  const minutes = alert ? alertMinutes(alert) : 0;
  const phase = alertPhase(minutes);
  const connected = state.profile.therapistConnected;

  useEffect(() => {
    if (!alert || phase !== "organisation" || connected) return;
    if (alert.state === "patient-contacted" || alert.state === "closed" || alert.state === "resolved") return;
    dispatch({ type: "alert", id: alert.id, patch: { state: "patient-contacted" } });
  }, [alert, connected, dispatch, phase]);

  if (!alert || phase === "none") return null;

  return (
    <section className="mt-8 border-t border-ink/10 pt-6">
      {phase === "remind" ? (
        <>
          <p className="font-serif text-2xl leading-tight">{t("You can call the line.", "আপনি লাইনে কল করতে পারেন।")}</p>
          <div className="mt-4">
            <CrisisLines />
          </div>
        </>
      ) : null}
      {phase === "emergency" ? (
        <>
          <p className="font-serif text-2xl leading-tight">
            {t("Please call emergency services now.", "এখনই জরুরি সেবায় কল করুন।")}
          </p>
          <a href={EMERGENCY_TEL} className="mt-4 inline-flex min-h-11 items-center border border-ink px-4 text-sm">
            {t("Call", "কল")} 999
          </a>
          <p className="mt-2 text-sm text-muted">
            {t(
              "For immediate danger. Separate from the emotional-support line.",
              "তাৎক্ষণিক বিপদের জন্য। আবেগের সাপোর্ট লাইন থেকে আলাদা।",
            )}
          </p>
          <div className="mt-6">
            <CrisisLines />
          </div>
        </>
      ) : null}
      {phase === "organisation" ? (
        <>
          <p className="font-serif text-2xl leading-tight">
            {t(
              "The wait has moved on from your therapist to an organisation. Here is the number to call.",
              "অপেক্ষা এখন থেরাপিস্টের কাছ থেকে একটি সংস্থার দিকে সরে গেছে। কল করার নম্বর এখানে।",
            )}
          </p>
          <div className="mt-4">
            <CrisisLines />
          </div>
          {!connected ? (
            <div className="mt-6">
              <p className="text-sm leading-relaxed">
                {t(
                  "Time-based closure. Not a confirmed conversation. No one has been called.",
                  "সময়ভিত্তিক বন্ধ। এটা নিশ্চিত কোনো কথোপকথন নয়। কাউকে ফোন করা হয়নি।",
                )}
              </p>
              <button
                type="button"
                className="mt-3 min-h-11 border border-ink px-4 text-sm"
                onClick={() =>
                  dispatch({
                    type: "alert",
                    id: alert.id,
                    patch: { state: "closed", closure: "time-based" },
                  })
                }
              >
                {t("Close this alert", "এই সতর্কতা বন্ধ করুন")}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {demo && !connected ? <DemoClock id={alert.id} current={alert.demoMinutes} /> : null}
    </section>
  );
}

export function DemoClock({ id, current }: { id: string; current: number | null }) {
  const { dispatch } = useStore();
  const { t } = useI18n();
  const jumps = [
    [30, t("30 minutes", "৩০ মিনিট")],
    [120, t("2 hours", "২ ঘণ্টা")],
    [360, t("6 hours", "৬ ঘণ্টা")],
  ] as const;
  return (
    <div className="mt-6 border-t border-dashed border-clay/50 pt-4">
      <p className="text-xs uppercase tracking-[0.16em] text-clay">{t("Demo", "ডেমো")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {jumps.map(([minutes, label]) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={current === minutes}
            onClick={() => dispatch({ type: "alert", id, patch: { demoMinutes: minutes } })}
            className={`min-h-10 border px-3 text-sm ${current === minutes ? "border-clay text-clay" : "border-ink/20"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
