"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BreathCircle } from "@/components/breath";
import { Companion } from "@/components/companion";
import { lookForFeeling } from "@/components/mood-faces";
import { CrisisLines } from "@/components/crisis-lines";
import { RequireProfile } from "@/components/patient-shell";
import { todayISO } from "@/lib/dates";
import { hasCrisisPhrase } from "@/lib/scoring";
import {
  categoryWord,
  equippedWord,
  explainReason,
  feelingChoice,
  feelingNowWord,
  kindWord,
  localizeTask,
  minutesLabel,
  swapWord,
  useI18n,
  valueChoice,
} from "@/lib/i18n";
import { alternativeFor, libraryMode, selectTask, shorterTask, showFriday, swapReason } from "@/lib/select";
import { useStore } from "@/lib/store";
import { FEELING_CHOICES, VALUE_CHOICES, type TaskStep } from "@/lib/tasks";
import {
  COMPANION_LINE,
  EQUIPPED_WORDS,
  FEELING_NOW,
  type Helped,
  type SkipReason,
  type SwapFeeling,
} from "@/lib/types";

const SWAP_FEELINGS: SwapFeeling[] = ["Anxious", "Overwhelmed", "Numb", "Restless", "Just not this"];
const SKIP: { id: SkipReason; en: string; bn: string }[] = [
  { id: "busy", en: "I was busy", bn: "আমি ব্যস্ত ছিলাম" },
  { id: "didnt-feel", en: "I didn't feel like it", bn: "ইচ্ছে করছিল না" },
  { id: "wasnt-well", en: "I wasn't doing well", bn: "আমার অবস্থা ভালো ছিল না" },
];

export default function TaskPage() {
  return (
    <RequireProfile>
      <Suspense fallback={<div className="min-h-40" aria-hidden="true" />}>
        <TaskFlow />
      </Suspense>
    </RequireProfile>
  );
}

function TaskFlow() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const mode = libraryMode(state);
  const params = useSearchParams();
  const extra = params.get("extra") === "1";
  const choice = selectTask(state);
  const optional = extra ? shorterTask(state, choice.task.id) : null;
  const task = optional ?? choice.task;
  const shown = localizeTask(task, lang);
  const date = todayISO();
  const record = state.tasks.find((item) => item.date === date);
  const friday = showFriday(state);
  const swapped = state.swapDate === date;
  const [phase, setPhase] = useState<"intro" | "steps" | "feel" | "help" | "hard" | "swap" | "skip">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [note, setNote] = useState(record?.note ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [keepJournal, setKeepJournal] = useState(false);
  const [why, setWhy] = useState(false);
  const [feelLook, setFeelLook] = useState<"rest" | "low" | "bright" | "notice">("rest");
  const [feelPick, setFeelPick] = useState<string>("");

  if (mode === "none") {
    return (
      <div>
        <h1 className="font-serif text-3xl leading-tight">{t("Grounding is available.", "গ্রাউন্ডিং আছে।")}</h1>
        <p className="mt-3 text-sm leading-relaxed">{t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}</p>
        <Link href="/ground" className="mt-6 inline-flex min-h-11 items-center border border-ink px-4 text-sm">
          {t("Open grounding", "গ্রাউন্ডিং খুলুন")}
        </Link>
      </div>
    );
  }

  const step = shown.steps[stepIndex];
  const last = stepIndex >= task.steps.length - 1;
  const processing = task.kind !== "daily";

  function begin() {
    if (state.paused) return;
    if (!optional) {
      dispatch({
        type: "lock",
        taskId: task.id,
        reasonCode: choice.reasonCode,
        reasonText: choice.reasonText,
      });
    }
    setPhase("steps");
  }

  function finish(helped: Helped) {
    const text = [picked.join(", "), note].filter(Boolean).join("\n");
    if (optional) {
      dispatch({ type: "shorter-done" });
    } else {
      dispatch({
        type: "task",
        patch: {
          taskId: task.id,
          helped,
          skipped: false,
          tooHard: false,
          note: text || null,
          feelingNow: record?.feelingNow ?? null,
        },
      });
    }
    if (keepJournal && text && state.profile.consents.journalStorage) {
      dispatch({
        type: "journal",
        entry: { kind: "recovery", prompt: task.name, text },
        scan: true,
      });
      if (state.crisisMonitoring && hasCrisisPhrase(text)) router.push("/crisis");
    }
    setPhase("intro");
  }

  return (
    <div>
      <p className="kicker">{kindWord(task.kind, lang)}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">{shown.name}</h1>
      <p className="mt-3 text-sm text-muted">
        {minutesLabel(task.minutes, lang)} · {task.categories.map((item) => categoryWord(item, lang)).join(" · ")}
        {friday ? ` · ${t("Optional", "ঐচ্ছিক")}` : ""}
      </p>

      {phase === "intro" ? (
        <div className="mt-6">
          <p className="leading-relaxed">{shown.summary}</p>
          {record?.helped ? <p className="mt-3 text-sm">{t("You already marked how this went.", "এটা কেমন গেল, সেটা আপনি ইতিমধ্যে বলেছেন।")}</p> : null}
          <button type="button" className="mt-4 text-sm underline" onClick={() => setWhy((value) => !value)}>
            {t("Why this task?", "এই কাজ কেন?")}
          </button>
          {why ? (
            <p className="mt-3 text-sm leading-relaxed">{explainReason(choice.reasonCode, choice.reasonText, lang)}</p>
          ) : null}
          {state.paused ? (
            <p className="mt-6 text-sm leading-relaxed">
              {t("Processing is paused. You can still use grounding.", "প্রসেসিং থামানো আছে। গ্রাউন্ডিং এখনও ব্যবহার করতে পারেন।")}
              <Link href="/ground" className="ml-1 underline">
                {t("Open grounding", "গ্রাউন্ডিং খুলুন")}
              </Link>
            </p>
          ) : (
            <div className="mt-6 flex flex-col items-start gap-3">
              <button type="button" onClick={begin} className="round-next">
                {t("Start", "শুরু")}
              </button>
              {swapped ? (
                <p className="text-sm">{t("You've already chosen a different task today.", "আজ আপনি ইতিমধ্যে অন্য একটা কাজ নিয়েছেন।")}</p>
              ) : (
                <button type="button" className="text-sm underline" onClick={() => setPhase("swap")}>
                  {t("I need something different today", "আজ অন্য কিছু দরকার")}
                </button>
              )}
              <button type="button" className="text-sm underline" onClick={() => setPhase("hard")}>
                {t("This is too hard", "এটা বেশি কঠিন")}
              </button>
              <button type="button" className="text-sm underline" onClick={() => setPhase("skip")}>
                {t("Not today", "আজ নয়")}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {phase === "steps" && step ? (
        <StepView
          step={step}
          note={note}
          picked={picked}
          onNote={setNote}
          onPicked={setPicked}
          onBack={() => {
            if (stepIndex === 0) setPhase("intro");
            else setStepIndex((value) => value - 1);
          }}
          onNext={() => {
            if (last) setPhase(processing ? "feel" : "help");
            else setStepIndex((value) => value + 1);
          }}
          last={last}
        />
      ) : null}

      {phase === "feel" ? (
        <div className="mt-8">
          <Companion look={feelLook} />
          <h2 className="mt-2 font-serif text-4xl leading-tight">{t("How are you feeling now?", "এখন কেমন লাগছে?")}</h2>
          <div className="mt-6 grid gap-3">
            {FEELING_NOW.map((word) => (
              <button
                key={word}
                type="button"
                className={`soft-choice ${feelPick === word ? "is-on" : ""}`}
                onClick={() => {
                  setFeelPick(word);
                  setFeelLook(lookForFeeling(word));
                }}
              >
                {feelingNowWord(word, lang)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="round-next mt-6"
            disabled={!feelPick}
            onClick={() => {
              if (!feelPick) return;
              dispatch({ type: "task", patch: { taskId: task.id, feelingNow: feelPick as (typeof FEELING_NOW)[number] } });
              setPhase("help");
            }}
          >
            {t("Next", "পরেরটা")}
          </button>
          <div className="mt-8">
            <CrisisLines />
          </div>
        </div>
      ) : null}

      {phase === "help" ? (
        <div className="mt-8">
          <h2 className="font-serif text-3xl">{t("Did this help?", "এটা কাজে লেগেছে?")}</h2>
          {(task.kind === "processing" || task.id === "reach-out" || task.id === "values") &&
          state.profile.consents.journalStorage ? (
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={keepJournal}
                onChange={(event) => setKeepJournal(event.target.checked)}
                className="mt-1"
              />
              <span>{t("Also keep what I wrote in my recovery journal.", "যা লিখেছি, সেটা রিকভারি জার্নালেও রাখুন।")}</span>
            </label>
          ) : null}
          <div className="mt-4 grid gap-2">
            {(
              [
                ["yes", t("Yes", "হ্যাঁ")],
                ["a-little", t("A little", "অল্প")],
                ["not-really", t("Not really", "তেমন নয়")],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" onClick={() => finish(id)} className="soft-choice text-center">
                {label}
              </button>
            ))}
          </div>
          {processing ? (
            <div className="mt-8">
              <CrisisLines />
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "hard" ? (
        <div className="mt-8">
          <h2 className="font-serif text-3xl leading-tight">
            {t("Some of this is better done with your therapist.", "এর কিছু অংশ থেরাপিস্টের সঙ্গে করাই ভালো।")}
          </h2>
          <p className="mt-4 leading-relaxed">{t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}</p>
          <p className="mt-3 text-sm leading-relaxed">{t("You can stop here. Nothing is owed.", "এখানে থামতে পারেন। কিছু বাকি থাকে না।")}</p>
          <div className="mt-6 flex flex-col items-start gap-3">
            <button
              type="button"
              className="min-h-11 bg-ink px-4 text-sm text-paper"
              onClick={() => {
                dispatch({ type: "task", patch: { taskId: task.id, tooHard: true, skipped: false } });
                router.push("/home");
              }}
            >
              {t("Leave this here", "এখানেই রাখুন")}
            </button>
            <Link href="/ground" className="text-sm underline">
              {t("Try a grounding practice", "একটা গ্রাউন্ডিং চেষ্টা করুন")}
            </Link>
          </div>
        </div>
      ) : null}

      {phase === "swap" ? (
        <div className="mt-8">
          <h2 className="font-serif text-3xl">{t("What would help more?", "আর কী বেশি কাজে লাগত?")}</h2>
          <div className="mt-4 grid gap-2">
            {SWAP_FEELINGS.map((feeling) => (
              <button
                key={feeling}
                type="button"
                className="min-h-12 border border-ink/20 text-left px-3 text-sm"
                onClick={() => {
                  const nextTask = alternativeFor(state, feeling, task.id);
                  const reasonText = swapReason(feeling, nextTask.categories[0]);
                  dispatch({
                    type: "lock",
                    taskId: nextTask.id,
                    reasonCode: "swap",
                    reasonText,
                    swap: feeling,
                  });
                  setStepIndex(0);
                  setPhase("intro");
                }}
              >
                {swapWord(feeling, lang)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {phase === "skip" ? (
        <div className="mt-8">
          <h2 className="font-serif text-3xl">{t("Set it aside.", "সরিয়ে রাখুন।")}</h2>
          <div className="mt-4 grid gap-2">
            {SKIP.map((reason) => (
              <button
                key={reason.id}
                type="button"
                className="min-h-12 border border-ink/20 text-sm"
                onClick={() => {
                  dispatch({
                    type: "task",
                    patch: { taskId: task.id, skipped: true, skipReason: reason.id, helped: null },
                  });
                  router.push("/home");
                }}
              >
                {t(reason.en, reason.bn)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {friday ? <Reflection /> : null}
    </div>
  );
}

function StepView({
  step,
  note,
  picked,
  onNote,
  onPicked,
  onBack,
  onNext,
  last,
}: {
  step: TaskStep;
  note: string;
  picked: string[];
  onNote: (value: string) => void;
  onPicked: (value: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  last: boolean;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="mt-8">
      <h2 className="font-serif text-3xl">{step.title}</h2>
      <p className="mt-3 leading-relaxed">{step.body}</p>
      {step.capture === "breath" ? <BreathCircle key="box" pattern="box" /> : null}
      {step.capture === "belly" ? <BreathCircle key="belly" pattern="belly" /> : null}
      {step.capture === "text" ? (
        <label className="mt-4 block text-sm" htmlFor="task-note">
          {t("Notes, if you want them", "নোট, চাইলে")}
          <textarea
            id="task-note"
            value={note}
            onChange={(event) => onNote(event.target.value)}
            className="mt-2 min-h-28 w-full border border-ink/15 p-3"
          />
        </label>
      ) : null}
      {step.capture === "feelings" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {FEELING_CHOICES.map((feeling) => {
            const on = picked.includes(feeling);
            return (
              <button
                key={feeling}
                type="button"
                aria-pressed={on}
                className={`min-h-11 border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
                onClick={() => {
                  if (on) onPicked(picked.filter((item) => item !== feeling));
                  else if (picked.length < 3) onPicked([...picked, feeling]);
                }}
              >
                {feelingChoice(feeling, lang)}
              </button>
            );
          })}
        </div>
      ) : null}
      {step.capture === "values" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {VALUE_CHOICES.map((value) => {
            const on = picked.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                className={`min-h-11 border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
                onClick={() => onPicked(on ? [] : [value])}
              >
                {valueChoice(value, lang)}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm">
          {t("Back", "পিছনে")}
        </button>
        <button type="button" onClick={onNext} className="min-h-11 bg-ink px-4 text-sm text-paper">
          {last ? t("Finish practice", "চর্চা শেষ") : t("Next", "পরের")}
        </button>
      </div>
    </div>
  );
}

function Reflection() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const choice = selectTask(state);
  const date = todayISO();
  const record = state.tasks.find((item) => item.date === date);
  const saved = record?.reflection;
  const [equipped, setEquipped] = useState<number | null>(saved?.equipped ?? null);
  const [notice, setNotice] = useState<string | null>(saved?.notice ?? null);

  function save(skipped: boolean) {
    dispatch({
      type: "task",
      patch: {
        taskId: choice.task.id,
        reflection: skipped
          ? { equipped: null, notice: null, skipped: true }
          : { equipped, notice, skipped: false },
      },
    });
  }

  return (
    <section id="reflection" className="mt-14 border-t border-ink/10 pt-8">
      <p className="kicker">{t("Optional", "ঐচ্ছিক")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("A weekly reflection", "সপ্তাহের একটা ভাবনা")}</h2>
      <p className="mt-2 text-sm leading-relaxed">
        {t("This does not replace the task. Both questions can be skipped.", "এটা কাজের বদলি নয়। দুটো প্রশ্নই বাদ দেওয়া যায়।")}
      </p>
      {saved ? <p className="mt-3 text-sm">{t("Saved on this device.", "এই ডিভাইসে রাখা হয়েছে।")}</p> : null}
      <p className="mt-6 text-sm">
        {t(
          "How equipped did you feel managing time between sessions this week?",
          "এ সপ্তাহে সেশনের মাঝের সময় সামলাতে কতটা প্রস্তুত লাগছিল?",
        )}
      </p>
      <div className="mt-2 grid gap-2">
        {EQUIPPED_WORDS.slice(1).map((word, index) => (
          <button
            key={word}
            type="button"
            onClick={() => setEquipped(index + 1)}
            className={`min-h-11 border px-3 text-left text-sm ${equipped === index + 1 ? "border-ink bg-ink text-paper" : "border-ink/15"}`}
          >
            {equippedWord(index + 1, lang)}
          </button>
        ))}
      </div>
      <p className="mt-6 text-sm">{t("Would you notice if Between wasn't there?", "Between না থাকলে কি টের পেতেন?")}</p>
      <div className="mt-2 grid gap-2">
        {(
          [
            ["Yes", t("Yes", "হ্যাঁ")],
            ["A little", t("A little", "অল্প")],
            ["Not really", t("Not really", "তেমন নয়")],
          ] as const
        ).map(([word, label]) => (
          <button
            key={word}
            type="button"
            onClick={() => setNotice(word)}
            className={`min-h-11 border px-3 text-left text-sm ${notice === word ? "border-ink bg-ink text-paper" : "border-ink/15"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-4">
        <button type="button" className="min-h-11 bg-ink px-4 text-sm text-paper" onClick={() => save(false)}>
          {t("Save reflection", "ভাবনা রাখুন")}
        </button>
        <button type="button" className="text-sm underline" onClick={() => save(true)}>
          {t("Skip both", "দুটোই বাদ")}
        </button>
      </div>
    </section>
  );
}
