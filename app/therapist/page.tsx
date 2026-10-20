"use client";

import Link from "next/link";
import { useState } from "react";
import { TherapistFrame } from "@/components/therapist-frame";
import { daysBetween, todayISO } from "@/lib/dates";
import { ago, flagShown, moodWord, stageShown, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { THERAPIST_NAME, type AppState, type FixturePatient } from "@/lib/types";

export default function TherapistHome() {
  const { ready, state, dispatch } = useStore();
  const { t } = useI18n();
  const [password, setPassword] = useState("");

  if (!ready) return <div className="min-h-dvh bg-clinic" aria-hidden="true" />;

  if (!state.therapist.entered) {
    return (
      <main className="min-h-dvh bg-clinic text-ink">
        <div className="mx-auto max-w-md px-5 py-16">
          <p className="text-[11px] uppercase tracking-[0.16em] text-sage">{t("Demo data", "ডেমো তথ্য")}</p>
          <h1 className="mt-3 font-serif text-4xl">{t("Therapist demo", "থেরাপিস্ট ডেমো")}</h1>
          <p className="mt-3 text-sm leading-relaxed">
            {t(
              "Clinical judgment takes precedence over any summary. The password is decorative.",
              "যেকোনো সারাংশের চেয়ে ক্লিনিকাল বিচার আগে। পাসওয়ার্ড শুধু সাজানো।",
            )}
          </p>
          <label className="mt-6 block text-sm" htmlFor="demo-password">
            {t("Password", "পাসওয়ার্ড")}
            <input
              id="demo-password"
              type="password"
              value={password}
              autoComplete="off"
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full border-b border-ink/30 bg-transparent py-2"
            />
          </label>
          <button
            type="button"
            className="round-next mt-6"
            onClick={() => dispatch({ type: "therapist-enter" })}
          >
            {t("Enter demo", "ডেমোতে ঢুকুন")}
          </button>
          <Link href="/therapist/start" className="mt-6 block text-sm underline">
            {t("Setup checklist", "সেটআপের তালিকা")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <TherapistFrame>
      <Dashboard />
    </TherapistFrame>
  );
}

function Dashboard() {
  const { state } = useStore();
  const { t } = useI18n();
  const pending = state.connection === "pending";
  const selfAlert = state.alerts.some(
    (item) => item.patientId === "self" && item.state !== "resolved" && item.state !== "closed" && !item.reviewedAt,
  );
  const inactiveSelf =
    state.connection === "confirmed" &&
    !selfAlert &&
    inactiveSince(
      [...state.moods.map((entry) => entry.date), ...state.tasks.map((entry) => entry.date)].sort().at(-1) ?? null,
    );
  const groups = [
    ["attention", t("Needs attention", "নজর দরকার")],
    ["checkin", t("Check in when you can", "পারলে চেক-ইন")],
    ["progressing", t("Progressing", "এগোচ্ছে")],
    ["quiet", t("No recent activity", "সাম্প্রতিক কিছু নেই")],
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl">{t("Caseload", "রোগীর তালিকা")}</h1>
        <p className="text-sm">
          {t("Therapist code", "থেরাপিস্টের কোড")} <strong>DEMO</strong>
        </p>
      </div>
      <p className="mt-2 text-sm text-muted">
        <Link href="/therapist/start" className="underline">
          {t("Setup checklist", "সেটআপের তালিকা")}
        </Link>
        {state.therapist.responseTime
          ? ` · ${t("Response time", "উত্তরের সময়")}: ${
              state.therapist.responseTime === "a few hours"
                ? t("a few hours", "কয়েক ঘণ্টা")
                : state.therapist.responseTime === "a day"
                  ? t("a day", "এক দিন")
                  : state.therapist.responseTime === "2 days"
                    ? t("2 days", "২ দিন")
                    : state.therapist.responseTime
            }`
          : ""}
      </p>
      {pending ? (
        <article className="mt-6 border border-ink/20 bg-white px-4 py-3">
          <h2 className="text-sm font-medium">{t("Invite", "আমন্ত্রণ")}</h2>
          <p className="mt-1 text-xs">
            DEMO · {t("waiting for the patient to confirm", "রোগী নিশ্চিত করার অপেক্ষায়")} {THERAPIST_NAME}.
          </p>
          <p className="mt-1 text-xs">
            {t("No journal or check-in is visible until they confirm.", "তাঁরা নিশ্চিত না করা পর্যন্ত কোনো জার্নাল বা চেক-ইন দেখা যায় না।")}
          </p>
        </article>
      ) : null}
      {state.connection === "confirmed" && !inactiveSelf ? (
        <div className="mt-6">
          <SelfCard />
        </div>
      ) : null}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {groups.map(([id, label]) => (
          <section key={id}>
            <h2 className="text-xs uppercase tracking-[0.14em]">{label}</h2>
            <div className="mt-3 space-y-3">
              {id === "quiet" && inactiveSelf ? <SelfCard /> : null}
              {state.fixtures
                .filter((patient) => displayGroup(patient, state) === id)
                .map((patient) => (
                  <FixtureCard key={patient.id} patient={patient} />
                ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted">
        {t("Demo therapist on file", "ফাইলে ডেমো থেরাপিস্ট")}: {THERAPIST_NAME}.
      </p>
    </div>
  );
}

function SelfCard() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const alert = state.alerts.find(
    (item) => item.patientId === "self" && item.state !== "resolved" && !item.reviewedAt,
  );
  const flag = state.softFlags.find((item) => item.patientId === "self");
  const moods = [...state.moods].sort((a, b) => a.date.localeCompare(b.date));
  const words = moods.slice(-3).map((entry) => moodWord(entry.mood, lang)).join(", ");
  const done = state.tasks.filter((item) => item.helped).length;

  return (
    <article className="border border-ink/20 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {alert ? <span className="inline-block h-2 w-2 rounded-full bg-[#9b2c2c]" aria-label={t("Needs attention", "নজর দরকার")} /> : null}
        <h2 className="text-sm font-medium">{t("You (this browser)", "আপনি (এই ব্রাউজার)")}</h2>
      </div>
      <p className="mt-1 text-xs">
        {t("This week", "এ সপ্তাহ")}: {weekCount(state)} {t("check-ins", "চেক-ইন")} · {done}{" "}
        {t("practices finished", "চর্চা শেষ")}
        {words ? ` · ${t("mood words", "মেজাজের শব্দ")} ${words}` : ""}
      </p>
      <p className="mt-1 text-xs">
        {t("Clinical judgment takes precedence over any summary.", "যেকোনো সারাংশের চেয়ে ক্লিনিকাল বিচার আগে।")}
      </p>
      {state.wrongPerson ? <p className="mt-1 text-xs">{t("Internal flag.", "ভিতরের চিহ্ন।")}</p> : null}
      {alert ? (
        <p className="mt-1 text-xs">
          {t("Unreviewed", "এখনও দেখা হয়নি")} · {ago(alert.createdAt, lang)} ·{" "}
          <Link href={`/therapist/alert/${alert.id}`} className="underline">
            {t("Open alert", "সতর্কতা খুলুন")}
          </Link>
        </p>
      ) : null}
      {flag && !alert ? <p className="mt-1 text-xs">{flagShown(flag.note, lang)}</p> : null}
      <Link href="/therapist/patient/self" className="mt-2 inline-block text-xs underline">
        {t("Open summary", "সারাংশ খুলুন")}
      </Link>
    </article>
  );
}

function FixtureCard({ patient }: { patient: FixturePatient }) {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const alert = state.alerts.find(
    (item) => item.patientId === patient.id && item.state !== "resolved" && !item.reviewedAt,
  );
  const words = patient.moods.slice(-3).map((entry) => moodWord(entry.mood, lang)).join(", ");

  return (
    <article className="border border-ink/20 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {alert ? <span className="inline-block h-2 w-2 rounded-full bg-[#9b2c2c]" aria-label={t("Needs attention", "নজর দরকার")} /> : null}
        <h3 className="text-sm font-medium">{patient.name}</h3>
      </div>
      <p className="mt-1 text-xs">
        {stageShown(patient.stage, lang)} · {patient.tasksCompleted} /{" "}
        {patient.tasksOffered} {t("practices", "চর্চা")} · {words || t("No mood words", "মেজাজের শব্দ নেই")}
      </p>
      {alert ? (
        <p className="mt-1 text-xs">
          {t("Unreviewed", "এখনও দেখা হয়নি")} · {ago(alert.createdAt, lang)}
        </p>
      ) : null}
      <Link href={`/therapist/patient/${patient.id}`} className="mt-2 inline-block text-xs underline">
        {t("Open summary", "সারাংশ খুলুন")}
      </Link>
    </article>
  );
}

function inactiveSince(iso: string | null) {
  if (!iso) return false;
  return daysBetween(iso, todayISO()) >= 3;
}

function displayGroup(patient: FixturePatient, state: AppState) {
  const alert = state.alerts.find(
    (item) => item.patientId === patient.id && item.state !== "resolved" && item.state !== "closed" && !item.reviewedAt,
  );
  if (alert) return "attention" as const;
  if (inactiveSince(patient.lastActive)) return "quiet" as const;
  return patient.group;
}

function weekCount(state: AppState) {
  const start = todayISO();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const cutoff = todayISO(from);
  return state.moods.filter((entry) => entry.date >= cutoff && entry.date <= start).length;
}
