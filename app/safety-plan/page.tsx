"use client";

import Link from "next/link";
import { useState } from "react";
import { RequireProfile } from "@/components/patient-shell";
import { crisisLineShown, useI18n } from "@/lib/i18n";
import { safetyProgress } from "@/lib/select";
import { useStore } from "@/lib/store";
import { KAAN_LINE, KAAN_NUMBER, NO_DELETE_LINE, THERAPIST_NAME } from "@/lib/types";

type View = "list" | "helps" | "people" | "line" | "reason" | "place";

const FIELDS: { id: View; label: string; index: number }[] = [
  { id: "helps", label: "What helps a little", index: 0 },
  { id: "people", label: "Two people", index: 1 },
  { id: "line", label: "A number to call", index: 2 },
  { id: "reason", label: "A reason to stay safe", index: 3 },
  { id: "place", label: "A safer place", index: 4 },
];

export default function SafetyPlanPage() {
  const { ready, state } = useStore();
  if (!ready) return <div className="min-h-dvh bg-paper" aria-hidden="true" />;
  if (!state.profile.onboardingComplete) {
    return (
      <main className="min-h-dvh bg-paper text-ink">
        <div className="mx-auto min-h-dvh w-full max-w-[440px] px-5 py-6">
          <header className="mb-6 flex items-center justify-between">
            <CrisisHelpLink />
            <ExitLink />
          </header>
          <Plan />
        </div>
      </main>
    );
  }
  return (
    <RequireProfile>
      <Plan />
    </RequireProfile>
  );
}

function CrisisHelpLink() {
  const { t } = useI18n();
  return (
    <Link href="/crisis" className="text-sm">
      {t("Crisis help", "সংকটের সাহায্য")}
    </Link>
  );
}

function ExitLink() {
  const { t } = useI18n();
  return (
    <Link href="/exit" className="text-sm">
      {t("Exit", "বেরিয়ে যান")}
    </Link>
  );
}

function Plan() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const fieldLabel: Record<string, string> = {
    helps: t("What helps a little", "যা অল্প হলেও সাহায্য করে"),
    people: t("Two people", "দুজন মানুষ"),
    line: t("A number to call", "কল করার একটা নম্বর"),
    reason: t("A reason to stay safe", "নিরাপদ থাকার একটা কারণ"),
    place: t("A safer place", "একটু নিরাপদ জায়গা"),
  };
  const progress = safetyProgress(state);
  const [view, setView] = useState<View>(progress.done === 5 ? "list" : "list");
  const paused = state.paused;

  return (
    <div>
      <p className="kicker">{t("Safety plan", "নিরাপত্তা পরিকল্পনা")}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">{t("Notes for a hard moment.", "কঠিন মুহূর্তের নোট।")}</h1>
      <p className="mt-3 text-sm">
        {t("Your plan is", "আপনার পরিকল্পনা")} {progress.done} / 5.
      </p>
      {progress.done > 0 && progress.done < 5 ? (
        <p className="mt-2 text-sm">{t("Draft — tap to continue", "খসড়া — এগিয়ে যেতে চাপুন")}</p>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed">
        {t(
          NO_DELETE_LINE,
          "এই পরিকল্পনায় এক ট্যাপে মুছে ফেলার সুযোগ নেই। কঠিন মুহূর্তে এই নোটগুলো কাজে লাগতে পারে, তাই প্রতিটি ঘর আলাদা করে খালি করা হয়।",
        )}
      </p>
      {progress.active ? (
        <p className="mt-3 text-sm">
          {t("This plan is active. You can add the other notes whenever you want.", "এই পরিকল্পনা চালু। বাকি নোট যখন খুশি যোগ করতে পারেন।")}
        </p>
      ) : null}

      <fieldset className="mt-6" disabled={paused}>
        <legend className="text-sm">{t("Sharing", "শেয়ার")}</legend>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="plan-share"
            checked={!state.safety.shareWithTherapist}
            onChange={() => dispatch({ type: "safety", patch: { shareWithTherapist: false } })}
          />
          {t("Hidden from therapist", "থেরাপিস্টের কাছ থেকে আড়াল")}
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="plan-share"
            checked={state.safety.shareWithTherapist}
            onChange={() => dispatch({ type: "safety", patch: { shareWithTherapist: true } })}
          />
          {t("Read-only for my therapist", "থেরাপিস্ট শুধু পড়তে পারবেন")}
        </label>
        <p className="mt-2 text-sm text-muted">
          {t(
            "The reason to stay safe is never included. Your therapist cannot request this plan.",
            "নিরাপদ থাকার কারণ কখনও এর মধ্যে থাকে না। আপনার থেরাপিস্ট এই পরিকল্পনা চাইতে পারেন না।",
          )}
        </p>
      </fieldset>

      {view === "list" ? (
        <ul className="mt-8 space-y-2">
          {FIELDS.map((field) => (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => setView(field.id)}
                className="flex w-full items-center justify-between border border-ink/10 px-3 py-3 text-left text-sm"
              >
                <span>{fieldLabel[field.id] ?? field.label}</span>
                <span className="text-muted">{progress.flags[field.index] ? t("Saved", "রাখা হয়েছে") : t("Open", "খোলা")}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Field view={view} onBack={() => setView("list")} paused={paused} />
      )}

      {progress.done === 5 && view === "list" ? <Review /> : null}
    </div>
  );
}

function Field({ view, onBack, paused }: { view: Exclude<View, "list">; onBack: () => void; paused: boolean }) {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const plan = state.safety;
  const filledLine = lang === "bn" ? `কান পেতে রই — ${KAAN_NUMBER}` : KAAN_LINE;
  const [helps, setHelps] = useState(plan.helps);
  const [person1, setPerson1] = useState(plan.person1);
  const [person2, setPerson2] = useState(plan.person2);
  const [optOut, setOptOut] = useState(plan.optOutAutoContact);
  const [line, setLine] = useState(crisisLineShown(plan.crisisLine || filledLine, lang));
  const [lineError, setLineError] = useState("");
  const [reason, setReason] = useState(plan.reason);
  const [place, setPlace] = useState(plan.saferPlace);

  return (
    <div className="mt-8">
      <button type="button" onClick={onBack} className="text-sm underline">
        {t("All fields", "সব ঘর")}
      </button>
      {view === "helps" ? (
        <Editor
          title={t("What helps a little", "যা অল্প হলেও সাহায্য করে")}
          help={t("One small thing that takes the edge off. 300 characters.", "যা একটু কমিয়ে দেয়, এমন ছোট একটা কাজ। ৩০০ অক্ষর।")}
          value={helps}
          max={300}
          onChange={setHelps}
          paused={paused}
          onSave={() => dispatch({ type: "safety", patch: { helps: helps.slice(0, 300) } })}
          onClear={() => {
            setHelps("");
            dispatch({ type: "safety", patch: { helps: "" } });
          }}
        />
      ) : null}
      {view === "people" ? (
        <div className="mt-4">
          <h2 className="font-serif text-3xl">{t("Two people", "দুজন মানুষ")}</h2>
          <p className="mt-3 text-sm leading-relaxed">
            {t(
              "This is for your reference only — choose someone you feel completely safe contacting.",
              "এটা শুধু আপনার নিজের জন্য — যাঁর সঙ্গে যোগাযোগ করতে পুরো নিরাপদ লাগে, তাঁকেই নিন।",
            )}
          </p>
          <label className="mt-4 block text-sm" htmlFor="person1">
            {t("First person", "প্রথমজন")}
            <input id="person1" value={person1} onChange={(event) => setPerson1(event.target.value)} className="mt-1 w-full border-b border-ink/30 py-2" disabled={paused} />
          </label>
          <label className="mt-4 block text-sm" htmlFor="person2">
            {t("Second person", "দ্বিতীয়জন")}
            <input id="person2" value={person2} onChange={(event) => setPerson2(event.target.value)} className="mt-1 w-full border-b border-ink/30 py-2" disabled={paused} />
          </label>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={optOut} onChange={(event) => setOptOut(event.target.checked)} disabled={paused} className="mt-1" />
            <span>{t("Do not contact these people automatically.", "এই মানুষদের আপনাআপনি যোগাযোগ করবেন না।")}</span>
          </label>
          {state.profile.therapistConnected ? (
            <p className="mt-4 text-sm">
              {t("Your connected therapist", "আপনার যুক্ত থেরাপিস্ট")} — {THERAPIST_NAME}
            </p>
          ) : null}
          <Actions
            paused={paused}
            onSave={() => dispatch({ type: "safety", patch: { person1, person2, optOutAutoContact: optOut } })}
            onClear={() => {
              setPerson1("");
              setPerson2("");
              dispatch({ type: "safety", patch: { person1: "", person2: "" } });
            }}
          />
        </div>
      ) : null}
      {view === "line" ? (
        <div className="mt-4">
          <h2 className="font-serif text-3xl">{t("A number to call", "কল করার একটা নম্বর")}</h2>
          <label className="mt-4 block text-sm" htmlFor="line">
            {t("Crisis line", "সংকটের লাইন")}
            <input id="line" value={line} onChange={(event) => setLine(event.target.value)} className="mt-1 w-full border-b border-ink/30 py-2" disabled={paused} />
          </label>
          {lineError ? <p className="mt-2 text-sm">{lineError}</p> : null}
          <Actions
            paused={paused}
            onSave={() => {
              if (!line.trim()) {
                setLineError(t("This line can't be empty.", "এই লাইন খালি থাকতে পারে না।"));
                return;
              }
              setLineError("");
              dispatch({ type: "safety", patch: { crisisLine: line.trim(), crisisLineSaved: true } });
            }}
            onClear={() => {
              setLine(filledLine);
              setLineError(
                t(
                  "This line can't be empty. Kaan Pete Roi is filled in again.",
                  "এই লাইন খালি থাকতে পারে না। কান পেতে রই আবার বসানো হয়েছে।",
                ),
              );
              dispatch({ type: "safety", patch: { crisisLine: filledLine, crisisLineSaved: true } });
            }}
          />
        </div>
      ) : null}
      {view === "reason" ? (
        <Editor
          title={t("A reason to stay safe", "নিরাপদ থাকার একটা কারণ")}
          help={t(
            "This stays on this device. It is hidden from your therapist, even if you share the rest of the plan. 200 characters.",
            "এটা এই ডিভাইসেই থাকে। বাকি পরিকল্পনা শেয়ার করলেও এটা থেরাপিস্টের কাছ থেকে আড়াল থাকে। ২০০ অক্ষর।",
          )}
          value={reason}
          max={200}
          onChange={setReason}
          paused={paused}
          onSave={() => dispatch({ type: "safety", patch: { reason: reason.slice(0, 200) } })}
          onClear={() => {
            setReason("");
            dispatch({ type: "safety", patch: { reason: "" } });
          }}
        />
      ) : null}
      {view === "place" ? (
        <Editor
          title={t("A safer place", "একটু নিরাপদ জায়গা")}
          help={t(
            "Somewhere you can go, or picture, that is safer than here. 200 characters.",
            "এমন জায়গা, যেখানে যেতে পারেন বা ভাবতে পারেন, যা এখানের চেয়ে নিরাপদ। ২০০ অক্ষর।",
          )}
          value={place}
          max={200}
          onChange={setPlace}
          paused={paused}
          onSave={() => dispatch({ type: "safety", patch: { saferPlace: place.slice(0, 200) } })}
          onClear={() => {
            setPlace("");
            dispatch({ type: "safety", patch: { saferPlace: "" } });
          }}
        />
      ) : null}
    </div>
  );
}

function Editor({
  title,
  help,
  value,
  max,
  onChange,
  onSave,
  onClear,
  paused,
}: {
  title: string;
  help: string;
  value: string;
  max: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  paused: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-4">
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed">{help}</p>
      <label className="mt-4 block text-sm" htmlFor="field">
        {t("Note", "নোট")}
        <textarea
          id="field"
          value={value}
          maxLength={max}
          disabled={paused}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-28 w-full border border-ink/15 p-3"
        />
      </label>
      <p className="mt-1 text-xs text-muted">
        {value.length} / {max}
      </p>
      <Actions paused={paused} onSave={onSave} onClear={onClear} />
    </div>
  );
}

function Actions({ paused, onSave, onClear }: { paused: boolean; onSave: () => void; onClear: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={paused} onClick={onSave} className="min-h-11 bg-ink px-4 text-sm text-paper">
        {t("Save this field", "এই ঘর রাখুন")}
      </button>
      <button type="button" disabled={paused} onClick={onClear} className="min-h-11 border border-ink/20 px-4 text-sm">
        {t("Clear this field", "এই ঘর খালি করুন")}
      </button>
    </div>
  );
}

function Review() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const plan = state.safety;
  return (
    <section className="mt-10 border-t border-ink/10 pt-6">
      <h2 className="font-serif text-3xl">{t("Review", "দেখে নিন")}</h2>
      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="text-muted">{t("What helps a little", "যা অল্প হলেও সাহায্য করে")}</dt>
          <dd>{plan.helps}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("People", "মানুষ")}</dt>
          <dd>{[plan.person1, plan.person2].filter(Boolean).join(", ")}</dd>
          {state.profile.therapistConnected ? (
            <dd>
              {t("Your connected therapist", "আপনার যুক্ত থেরাপিস্ট")} — {THERAPIST_NAME}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-muted">{t("Number", "নম্বর")}</dt>
          <dd>{crisisLineShown(plan.crisisLine, lang)}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("Reason to stay safe", "নিরাপদ থাকার কারণ")}</dt>
          <dd>{plan.reason}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("Safer place", "নিরাপদ জায়গা")}</dt>
          <dd>{plan.saferPlace}</dd>
        </div>
      </dl>
    </section>
  );
}
