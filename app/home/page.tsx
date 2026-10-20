"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertNotice } from "@/components/alert-notice";
import { Companion } from "@/components/companion";
import { Diary } from "@/components/diary";
import { lookForMood, MoodFace } from "@/components/mood-faces";
import { PinGate } from "@/components/pin-gate";
import { RequireProfile } from "@/components/patient-shell";
import { WeekChart } from "@/components/week-chart";
import { WeekStrip } from "@/components/week-strip";
import { EmotionCompanion } from "@/components/emotion-companion";
import { CrisisLines } from "@/components/crisis-lines";
import { addDays, todayISO } from "@/lib/dates";
import {
  bodyWord,
  categoryWord,
  explainReason,
  greet,
  localizeTask,
  minutesLabel,
  moodWord,
  useI18n,
} from "@/lib/i18n";
import { effectiveLevel, isOutside, safetyProgress, selectTask, shorterTask, showFriday } from "@/lib/select";
import { pendingJournalRequest, useStore } from "@/lib/store";
import {
  BODY_SIGNALS,
  COMPANION_LINE,
  DEMO_CODE,
  THERAPIST_NAME,
  type BodySignal,
} from "@/lib/types";

export default function HomePage() {
  return (
    <RequireProfile>
      <PinGate>
        <Home />
      </PinGate>
    </RequireProfile>
  );
}

function Home() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const level = effectiveLevel(state);
  const choice = selectTask(state);
  const task = localizeTask(choice.task, lang);
  const shorterRaw = shorterTask(state, choice.task.id);
  const shorter = shorterRaw ? localizeTask(shorterRaw, lang) : null;
  const outside = isOutside(state, choice.task);
  const friday = showFriday(state);
  const [why, setWhy] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [confirmCode, setConfirmCode] = useState(false);
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(addDays(today, -3));
  const record = state.tasks.find((item) => item.date === today);
  const plan = safetyProgress(state);
  const request = pendingJournalRequest(state);
  const name = state.profile.firstName;

  function connect() {
    if (code.trim().toUpperCase() !== DEMO_CODE) {
      setCodeError(t("That code isn't recognized in this demo.", "এই ডেমোতে এই কোড চেনা যায় না।"));
      setConfirmCode(false);
      return;
    }
    setCodeError("");
    dispatch({ type: "invite-demo" });
    setConfirmCode(true);
  }

  function confirmConnect() {
    dispatch({ type: "connect-demo" });
    setConfirmCode(false);
  }

  return (
    <div className="home-dashboard">
      <header className="dashboard-greeting">
        <div>
          <p className="kicker">{t("A small pause for you", "আপনার জন্য একটু বিরতি")}</p>
          <h1>{greet(name, lang)}</h1>
          <p>{t("However today arrived, you can meet it here without fixing it.", "আজ যেমনই এসে থাকুক, কিছু ঠিক না করেই এখানে তাকে দেখা যায়।")}</p>
        </div>
        <EmotionCompanion mood={state.moods.find((entry) => entry.date === selectedDate)?.mood ?? null} />
      </header>
      <WeekStrip selected={selectedDate} onSelect={setSelectedDate} moods={state.moods} weekStart={weekStart} onWeekStart={setWeekStart} />
      {state.restrictionPreview ? (
        <p className="mt-2 text-xs text-clay">
          {t("Demo preview", "ডেমো প্রিভিউ")} · {t("level", "লেভেল")} {state.restrictionPreview}
        </p>
      ) : null}

      {level === 3 ? (
        <LevelThree
          code={code}
          codeError={codeError}
          onCode={setCode}
          onConnect={connect}
          connected={state.profile.therapistConnected}
          pending={state.connection === "pending"}
          confirmCode={confirmCode}
          confirmConnect={confirmConnect}
          setConfirmCode={setConfirmCode}
        />
      ) : (
        <>
          <MoodBlock key={selectedDate} date={selectedDate} />
          {level === 1 ? (
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {t(
                "Processing tasks stay locked until your therapist is connected.",
                "থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজগুলো বন্ধ থাকে।",
              )}
            </p>
          ) : null}
          {level === 2 ? (
            <p className="mt-4 text-sm leading-relaxed">
              {t(
                "Some tools are limited for now. This is protection, not a punishment. Cost and access are real barriers to finding a therapist.",
                "কিছু হাতিয়ার এখন সীমিত। এটা সুরক্ষা, শাস্তি নয়। থেরাপিস্ট খুঁজতে খরচ আর সুযোগ সত্যিই বাধা।",
              )}{" "}
              <a className="underline" href="tel:+8809612119911">
                {t("Kaan Pete Roi", "কান পেতে রই")}
              </a>{" "}
              {t(
                "can talk with you. Between does not match you with a provider.",
                "আপনার সঙ্গে কথা বলতে পারেন। Between আপনাকে কোনো সেবাদাতার সঙ্গে মিলিয়ে দেয় না।",
              )}
            </p>
          ) : null}

          <section className="practice-card mt-6">
            <p className="kicker">{t("Today's practice", "আজকের চর্চা")}</p>
            <h1 className="mt-2 font-serif text-[2.4rem] leading-[1.05]">{task.name}</h1>
            <p className="mt-3 text-lg leading-snug">{task.summary}</p>
            <p className="mt-3 text-sm text-muted">
              {minutesLabel(choice.task.minutes, lang)} · {categoryWord(choice.task.categories[0], lang)}
              {friday ? ` · ${t("Optional", "ঐচ্ছিক")}` : ""}
            </p>
            {record?.helped ? <p className="mt-3 text-sm">{t("Finished for today.", "আজকের জন্য শেষ।")}</p> : null}
            {record?.skipped ? (
              <p className="mt-3 text-sm">
                {t("Set aside for today. You can leave it, or start if you want.", "আজকের জন্য সরিয়ে রাখা। রেখে দিতে পারেন, বা চাইলে শুরু করতে পারেন।")}
              </p>
            ) : null}
            {record?.tooHard ? <p className="mt-3 text-sm">{t("You stopped. That is allowed.", "আপনি থেমেছেন। সেটা চলবে।")}</p> : null}
            {outside ? (
              <div className="mt-6">
                <p className="text-sm leading-relaxed">
                  {t(
                    `This one is ${choice.task.categories[0]}, which you did not choose. Try it, or stay with what is working.`,
                    `এটা ${categoryWord(choice.task.categories[0], lang)}, যা আপনি বেছে নেননি। চেষ্টা করুন, অথবা যা চলছে সেটাতেই থাকুন।`,
                  )}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-12 border border-ink px-2 text-sm"
                    onClick={() => dispatch({ type: "try-category", category: choice.task.categories[0] })}
                  >
                    {t("Try it", "চেষ্টা করুন")}
                  </button>
                  <button
                    type="button"
                    className="min-h-12 border border-ink px-2 text-sm"
                    onClick={() => dispatch({ type: "decline-category" })}
                  >
                    {t("Not yet", "এখন নয়")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link href="/task" className="round-next">
                  {t("Start", "শুরু")}
                </Link>
                <button type="button" className="text-sm underline" onClick={() => setWhy((value) => !value)}>
                  {t("Why this task?", "এই কাজ কেন?")}
                </button>
              </div>
            )}
            {shorter && !outside ? (
              <p className="mt-4 text-sm">
                <Link href="/task?extra=1" className="underline">
                  {t("A shorter option", "আরও ছোট একটা")} : {shorter.name}
                </Link>
                <span className="text-muted"> · {minutesLabel(shorter.minutes, lang)}, {t("if you want it", "চাইলে")}</span>
              </p>
            ) : null}
            <p className="mt-4 text-sm">
              <Link href="/roadmap" className="underline">
                {t("Upcoming practices", "সামনের চর্চা")}
              </Link>
            </p>
            {why ? (
              <p className="mt-4 max-w-sm text-sm leading-relaxed" data-reason={choice.reasonCode}>
                {explainReason(choice.reasonCode, choice.reasonText, lang)}
              </p>
            ) : null}
            {friday ? (
              <p className="mt-4 text-sm">
                <Link href="/task#reflection" className="underline">
                  {t("Weekly reflection, if you want it", "সাপ্তাহিক ভাবনা, চাইলে")}
                </Link>
              </p>
            ) : null}
          </section>

          <Diary />

          <AlertNotice />

          {request ? (
            <section className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="font-serif text-2xl">
                {t("A request from", "একটা অনুরোধ,")} {THERAPIST_NAME}
              </h2>
              <p className="mt-3 text-sm leading-relaxed">
                {THERAPIST_NAME}{" "}
                {t(
                  "asked to read your recovery journal entries. You can allow that, or keep your current setting. Both choices are equal.",
                  "আপনার রিকভারি জার্নাল পড়তে চেয়েছেন। আপনি সেটা দিতে পারেন, অথবা এখনকার সেটিং রাখতে পারেন। দুটো পছন্দই সমান।",
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="min-h-12 border border-ink px-2 text-sm"
                  onClick={() => dispatch({ type: "journal-answer", accept: false })}
                >
                  {t("Keep current settings", "এখনকার সেটিং রাখুন")}
                </button>
                <button
                  type="button"
                  className="min-h-12 border border-ink px-2 text-sm"
                  onClick={() => dispatch({ type: "journal-answer", accept: true })}
                >
                  {t("Allow full access", "পুরো পড়া দিন")}
                </button>
              </div>
            </section>
          ) : null}

          <div className="mt-12 border-t border-ink/10 pt-8">
            <WeekChart moods={state.moods} tasks={state.tasks} />
          </div>

          <TherapistPanel
            connected={state.profile.therapistConnected}
            pending={state.connection === "pending"}
            code={code}
            codeError={codeError}
            confirm={confirmCode}
            onCode={(value) => {
              setConfirmCode(false);
              setCode(value);
            }}
            onConnect={connect}
            onConfirm={confirmConnect}
            onBack={() => setConfirmCode(false)}
          />

          {plan.done < 5 ? (
            <Link href="/safety-plan" className="soft-card mt-8 block px-5 py-5">
              <span className="block font-serif text-2xl">{t("One thing worth doing today", "আজ করার মতো একটা কাজ")}</span>
              <span className="mt-2 block text-sm text-muted">
                {plan.done > 0
                  ? t("Draft — tap to continue", "খসড়া — এগিয়ে যেতে চাপুন")
                  : t(
                      "A few notes for a hard moment. Crisis help is never locked behind this.",
                      "কঠিন মুহূর্তের জন্য কয়েকটা নোট। সংকটের সাহায্য কখনও এর আড়ালে বন্ধ থাকে না।",
                    )}
              </span>
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

function MoodBlock({ date = todayISO() }: { date?: string }) {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const entry = state.moods.find((item) => item.date === date);
  const isToday = date === todayISO();
  const [open, setOpen] = useState(isToday && !entry);
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [body, setBody] = useState<BodySignal | "">(entry?.body ?? "");

  const shownMood = entry?.mood ?? mood;

  if (!isToday) {
    return (
      <section className="checkin-card checkin-past" aria-live="polite">
        <EmotionCompanion mood={entry?.mood ?? null} />
        <div>
          <p className="kicker">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h2>{entry ? t("This is what you left here.", "এখানে আপনি যা রেখে গিয়েছিলেন।") : t("Nothing recorded here yet. That’s completely okay.", "এখানে এখনও কিছু রাখা হয়নি। সেটাও একদম ঠিক আছে।")}</h2>
          {entry ? <p>{moodWord(entry.mood, lang)} · {bodyWord(entry.body, lang)}</p> : <p>{t("Choose today to add a check-in, or simply keep looking back.", "চেক-ইন যোগ করতে আজকে বেছে নিন, অথবা শুধু পেছনে তাকান।")}</p>}
        </div>
      </section>
    );
  }

  if (!open && entry) {
    return (
      <section className="checkin-card checkin-saved">
        <EmotionCompanion mood={entry.mood} />
        <div><p className="kicker">{t("Today’s check-in", "আজকের চেক-ইন")}</p><h2>{moodWord(entry.mood, lang)} · {bodyWord(entry.body, lang)}</h2><p>{t("Thanks for noticing. That is enough for now.", "খেয়াল করার জন্য ধন্যবাদ। আপাতত এটুকুই যথেষ্ট।")}</p><button type="button" className="text-link" onClick={() => setOpen(true)}>{t("Change check-in", "চেক-ইন বদলান")}</button></div>
      </section>
    );
  }

  return (
    <section className="checkin-card checkin-open">
      <div className="checkin-intro"><EmotionCompanion mood={shownMood} /><div><p className="kicker">{t("Today’s check-in", "আজকের চেক-ইন")}</p><h2>{t("How is today sitting with you?", "আজ আপনার সঙ্গে কেমন করে আছে?")}</h2><p>{t("No need to name it perfectly.", "একদম ঠিক নাম দেওয়ার দরকার নেই।")}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-3" role="radiogroup" aria-label={t("Mood from 1 to 10", "১ থেকে ১০ মেজাজ")}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <MoodFace
            key={value}
            value={value}
            selected={mood === value}
            label={moodWord(value, lang)}
            onPick={() => setMood(value)}
          />
        ))}
      </div>
      <p className="mt-4 font-serif text-2xl">{mood ? moodWord(mood, lang) : t("Choose a feeling", "একটা অনুভূতি নিন")}</p>
      <p className="mt-5 text-sm" id="body-label">
        {t("Body", "শরীর")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="body-label">
        {BODY_SIGNALS.map((signal) => (
          <button
            key={signal}
            type="button"
            role="radio"
            aria-checked={body === signal}
            onClick={() => setBody(signal)}
            className={`soft-choice w-auto ${body === signal ? "is-on" : ""}`}
          >
            {bodyWord(signal, lang)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="round-next mt-5"
        disabled={!body || !mood}
        onClick={() => {
          if (!body || !mood) return;
          dispatch({ type: "mood", mood, body });
          setOpen(false);
        }}
      >
        {t("Save check-in", "চেক-ইন রাখুন")}
      </button>
    </section>
  );
}

function TherapistPanel({
  connected,
  pending,
  code,
  codeError,
  confirm,
  onCode,
  onConnect,
  onConfirm,
  onBack,
}: {
  connected: boolean;
  pending: boolean;
  code: string;
  codeError: string;
  confirm: boolean;
  onCode: (value: string) => void;
  onConnect: () => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const licence = t("Demo licence · Bangladesh", "ডেমো লাইসেন্স · বাংলাদেশ");
  if (connected) {
    return (
      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Therapist", "থেরাপিস্ট")}</h2>
        <p className="mt-2">{THERAPIST_NAME}</p>
        <p className="text-sm text-muted">{licence}</p>
        <Link href="/messages" className="mt-3 inline-block text-sm underline">
          {t("Messages", "বার্তা")}
        </Link>
      </section>
    );
  }

  if (confirm || pending) {
    return (
      <section className="mt-10">
        <p className="kicker">{t("Confirm", "নিশ্চিত করুন")}</p>
        <h2 className="mt-2 font-serif text-3xl">{THERAPIST_NAME}</h2>
        <p className="mt-2 text-sm">{licence}</p>
        <p className="mt-4 text-sm leading-relaxed">
          {t("Connecting adds", "যুক্ত করলে")} {THERAPIST_NAME}{" "}
          {t(
            "to your safety plan as a contact you can see.",
            "আপনার নিরাপত্তা পরিকল্পনায় একজন পরিচিত হিসেবে যোগ হয়, যা আপনি দেখতে পান।",
          )}
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm">
            {t("Back", "পিছনে")}
          </button>
          <button type="button" onClick={onConfirm} className="round-next">
            {t("Connect and continue", "যুক্ত করে এগিয়ে যান")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{t("Therapist", "থেরাপিস্ট")}</h2>
      <p className="mt-2 text-sm leading-relaxed">
        {t(
          "Processing tasks stay locked until your therapist is connected. You can add a code when you have one.",
          "থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজগুলো বন্ধ থাকে। কোড পেলে পরে যোগ করতে পারেন।",
        )}
      </p>
      <label className="mt-4 block text-sm" htmlFor="home-code">
        {t("Therapist code", "থেরাপিস্টের কোড")}
        <input
          id="home-code"
          value={code}
          onChange={(event) => onCode(event.target.value)}
          className="mt-1 w-full border-b border-ink/30 py-2 uppercase outline-none"
        />
      </label>
      {codeError ? <p className="mt-2 text-sm">{codeError}</p> : null}
      <button type="button" onClick={onConnect} className="mt-4 min-h-11 border border-ink px-4 text-sm">
        {t("Connect", "যুক্ত করুন")}
      </button>
    </section>
  );
}

function LevelThree({
  code,
  codeError,
  onCode,
  onConnect,
  connected,
  pending,
  confirmCode,
  confirmConnect,
  setConfirmCode,
}: {
  code: string;
  codeError: string;
  onCode: (value: string) => void;
  onConnect: () => void;
  connected: boolean;
  pending: boolean;
  confirmCode: boolean;
  confirmConnect: () => void;
  setConfirmCode: (value: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-8">
      <h1 className="font-serif text-4xl leading-tight">
        {t(
          "We work best alongside a therapist. Here are organizations that can help you find support.",
          "আমরা সবচেয়ে ভালো কাজ করি একজন থেরাপিস্টের পাশে থেকে। সাপোর্ট খুঁজতে যেসব সংস্থা সাহায্য করতে পারে, সেগুলো এখানে।",
        )}
      </h1>
      <p className="mt-4 leading-relaxed">
        {t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}
      </p>
      <Diary />
      <div className="mt-8">
        <CrisisLines />
      </div>
      <AlertNotice />
      <MoodBlock />
      <Link href="/ground" className="mt-8 inline-block text-sm underline">
        {t("Grounding", "গ্রাউন্ডিং")}
      </Link>
      <Link href="/roadmap" className="mt-3 block text-sm underline">
        {t("Upcoming practices", "সামনের চর্চা")}
      </Link>
      <TherapistPanel
        connected={connected}
        pending={pending}
        code={code}
        codeError={codeError}
        confirm={confirmCode}
        onCode={(value) => {
          setConfirmCode(false);
          onCode(value);
        }}
        onConnect={onConnect}
        onConfirm={confirmConnect}
        onBack={() => setConfirmCode(false)}
      />
    </div>
  );
}
