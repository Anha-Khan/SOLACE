"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TherapistFrame } from "@/components/therapist-frame";
import { ago, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function AlertReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const alert = state.alerts.find((item) => item.id === id);
  if (!alert) return <TherapistFrame><p>{t("That alert is not available.", "সতর্কতাটি পাওয়া যাচ্ছে না।")}</p><Link href="/therapist" className="mt-4 inline-block underline">{t("Back to caseload", "রোগীর তালিকায় ফিরুন")}</Link></TherapistFrame>;
  const patient = alert.patientId === "self" ? t("You (this browser)", "আপনি (এই ব্রাউজার)") : state.fixtures.find((item) => item.id === alert.patientId)?.name ?? alert.patientId;
  return <TherapistFrame><main className="mx-auto max-w-2xl"><Link href="/therapist" className="text-sm underline">← {t("Caseload", "রোগীর তালিকা")}</Link><p className="kicker mt-8">{t("Safety alert", "নিরাপত্তা সতর্কতা")}</p><h1 className="mt-2 font-serif text-4xl">{patient}</h1><p className="mt-3 text-sm text-muted">{ago(alert.createdAt, lang)} · {alert.state}</p><section className="mt-8 border border-ink/15 bg-card p-5"><h2 className="font-serif text-2xl">{t("What the system noticed", "সিস্টেম যা খেয়াল করেছে")}</h2><p className="mt-3 text-sm leading-relaxed">{alert.summary}</p><p className="mt-3 text-xs text-muted">{t("This summary is a signal for review, not a clinical conclusion.", "এই সারাংশ পর্যালোচনার সংকেত, ক্লিনিক্যাল সিদ্ধান্ত নয়।")}</p></section><div className="mt-6 flex flex-wrap gap-3">{!alert.reviewedAt ? <button type="button" className="round-next" onClick={() => dispatch({ type: "alert", id: alert.id, patch: { reviewedAt: new Date().toISOString(), stateBeforeReview: alert.state, state: "acknowledged" } })}>{t("Mark reviewed", "দেখা হয়েছে")}</button> : null}<button type="button" className="min-h-11 border border-ink px-4 text-sm" onClick={() => dispatch({ type: "alert", id: alert.id, patch: { state: "resolved", closure: null } })}>{t("Resolve alert", "সতর্কতা শেষ করুন")}</button></div></main></TherapistFrame>;
}
