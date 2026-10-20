"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TherapistFrame } from "@/components/therapist-frame";
import { moodWord, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function PatientSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useStore();
  const { t, lang } = useI18n();
  const fixture = state.fixtures.find((item) => item.id === id);
  const self = id === "self";

  if (!self && !fixture) return <TherapistFrame><p>{t("That summary is not available.", "সারাংশটি পাওয়া যাচ্ছে না।")}</p><Link href="/therapist" className="mt-4 inline-block underline">{t("Back to caseload", "রোগীর তালিকায় ফিরুন")}</Link></TherapistFrame>;

  const name = self ? t("You (this browser)", "আপনি (এই ব্রাউজার)") : fixture!.name;
  const moods = self ? state.moods : fixture!.moods;
  const completed = self ? state.tasks.filter((item) => item.helped).length : fixture!.tasksCompleted;
  const offered = self ? state.tasks.length : fixture!.tasksOffered;
  const privacy = self ? state.privacy : fixture!.journal;
  const planShared = self ? state.safety.shareWithTherapist : fixture!.planShared;
  const plan = self ? state.safety : fixture!.plan;

  return (
    <TherapistFrame>
      <main>
        <Link href="/therapist" className="text-sm underline">← {t("Caseload", "রোগীর তালিকা")}</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="kicker">{t("Patient summary", "রোগীর সারাংশ")}</p><h1 className="mt-2 font-serif text-4xl">{name}</h1></div><p className="text-sm text-muted">{completed} / {offered || 0} {t("practices finished", "চর্চা শেষ")}</p></div>
        <section className="mt-8 border-t border-ink/10 pt-6"><h2 className="font-serif text-2xl">{t("Recent check-ins", "সাম্প্রতিক চেক-ইন")}</h2>{moods.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{moods.slice(-8).reverse().map((entry) => <li key={entry.date} className="border border-ink/10 bg-card p-3 text-sm"><span className="text-muted">{entry.date}</span><span className="mt-1 block">{moodWord(entry.mood, lang)}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted">{t("No check-ins are visible yet.", "এখনও কোনো চেক-ইন দেখা যাচ্ছে না।")}</p>}</section>
        <section className="mt-8 border-t border-ink/10 pt-6"><h2 className="font-serif text-2xl">{t("Journal visibility", "জার্নাল দেখা")}</h2><p className="mt-3 text-sm">{privacy === "hidden" ? t("Hidden by the patient.", "রোগী আড়াল করেছেন।") : privacy === "progress" ? t("Progress only; entry text is hidden.", "শুধু অগ্রগতি; লেখার অংশ আড়াল।") : t("Recovery entries may be read. Personal diary pages remain private.", "রিকভারি লেখা পড়া যেতে পারে। ব্যক্তিগত ডায়েরি গোপন থাকে।")}</p></section>
        <section className="mt-8 border-t border-ink/10 pt-6"><h2 className="font-serif text-2xl">{t("Shared safety plan", "শেয়ার করা নিরাপত্তা পরিকল্পনা")}</h2>{planShared && plan ? <dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-muted">{t("What helps", "যা সাহায্য করে")}</dt><dd>{plan.helps || "—"}</dd></div><div><dt className="text-muted">{t("People", "মানুষ")}</dt><dd>{[plan.person1, plan.person2].filter(Boolean).join(", ") || "—"}</dd></div><div><dt className="text-muted">{t("Safer place", "নিরাপদ জায়গা")}</dt><dd>{plan.saferPlace || "—"}</dd></div></dl> : <p className="mt-3 text-sm text-muted">{t("No safety plan has been shared.", "কোনো নিরাপত্তা পরিকল্পনা শেয়ার করা হয়নি।")}</p>}</section>
      </main>
    </TherapistFrame>
  );
}
