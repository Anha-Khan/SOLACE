"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PinGate } from "@/components/pin-gate";
import { RequireProfile } from "@/components/patient-shell";
import { hasCrisisPhrase } from "@/lib/scoring";
import { recoveryPrompt, shownPrompt, useI18n, whenLabel } from "@/lib/i18n";
import { effectiveLevel } from "@/lib/select";
import { useStore } from "@/lib/store";
import {
  POINT_OF_CHOICE_HIDDEN,
  RECOVERY_PROMPTS,
  type Privacy,
} from "@/lib/types";

export default function JournalPage() {
  return (
    <RequireProfile>
      <PinGate>
        <Journals />
      </PinGate>
    </RequireProfile>
  );
}

function Journals() {
  const { state } = useStore();
  const { t } = useI18n();
  const level = effectiveLevel(state);
  if (level === 3) {
    return (
      <div>
        <h1 className="font-serif text-3xl">{t("Journal", "জার্নাল")}</h1>
        <p className="mt-3 text-sm leading-relaxed">
          {t(
            "New writing is paused on this screen so the tools stay small. Grounding and crisis help are still open.",
            "হাতিয়ার ছোট রাখতে এই পর্দায় নতুন লেখা থামানো আছে। গ্রাউন্ডিং আর সংকটের সাহায্য খোলা আছে।",
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-12">
      <Recovery />
      <Personal />
    </div>
  );
}

function Recovery() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const level = effectiveLevel(state);
  const readOnly = level === 2 || state.paused || !state.profile.consents.journalStorage;
  const [prompt, setPrompt] = useState(RECOVERY_PROMPTS[0]);
  const [text, setText] = useState("");
  const entries = state.journals.filter((entry) => entry.kind === "recovery");

  useEffect(() => {
    if (state.keywordHandoff) router.push("/crisis");
  }, [router, state.keywordHandoff]);

  const line = !state.crisisMonitoring
    ? t("Crisis monitoring is off. Entries are not scanned.", "সংকট নজরদারি বন্ধ। লেখা স্ক্যান হয় না।")
    : state.privacy === "hidden"
      ? t(
          POINT_OF_CHOICE_HIDDEN,
          "আপনার থেরাপিস্ট এটা দেখবেন না, কিন্তু আপনাকে সুরক্ষিত রাখতে অ্যাপ তবু নিরাপত্তার সংকেত খোঁজে।",
        )
      : state.privacy === "progress"
        ? t(
            "Your therapist can see that you wrote, not the words. The app still scans for safety signals to protect you.",
            "আপনার থেরাপিস্ট দেখতে পাবেন যে আপনি লিখেছেন, শব্দগুলো নয়। আপনাকে সুরক্ষিত রাখতে অ্যাপ তবু নিরাপত্তার সংকেত খোঁজে।",
          )
        : t(
            "Your therapist can read this recovery entry. The app still scans for safety signals to protect you.",
            "আপনার থেরাপিস্ট এই রিকভারি লেখা পড়তে পারবেন। আপনাকে সুরক্ষিত রাখতে অ্যাপ তবু নিরাপত্তার সংকেত খোঁজে।",
          );

  return (
    <section>
      <p className="kicker">{t("Recovery journal", "রিকভারি জার্নাল")}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">{t("A few prompted lines.", "প্রম্পট করা কয়েকটা লাইন।")}</h1>
      <PrivacyControl />
      <p className="mt-4 text-sm leading-relaxed">{line}</p>
      {level === 2 ? (
        <p className="mt-3 text-sm leading-relaxed">
          {t(
            "New recovery entries are paused so this stays a smaller set of tools. You can still read what you wrote. This is protection, not a penalty.",
            "হাতিয়ারের সেট ছোট রাখতে নতুন রিকভারি লেখা থামানো আছে। যা লিখেছেন, সেটা এখনও পড়তে পারেন। এটা সুরক্ষা, শাস্তি নয়।",
          )}
        </p>
      ) : null}
      {!state.profile.consents.journalStorage ? (
        <p className="mt-3 text-sm leading-relaxed">
          {t(
            "Journal storage is off. You can turn it on in Settings if you want recovery entries kept on this device.",
            "জার্নাল রাখা বন্ধ। রিকভারি লেখা এই ডিভাইসে রাখতে চাইলে সেটিংসে চালু করতে পারেন।",
          )}
        </p>
      ) : null}
      {readOnly ? null : (
        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            const value = text.trim();
            if (!value) return;
            dispatch({
              type: "journal",
              entry: { kind: "recovery", prompt, text: value },
              scan: true,
            });
            if (state.crisisMonitoring && hasCrisisPhrase(value)) router.push("/crisis");
            setText("");
          }}
        >
          <label className="block text-sm" htmlFor="prompt">
            {t("Prompt", "প্রম্পট")}
            <select
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-ink/10 bg-card px-3 py-2"
            >
              {RECOVERY_PROMPTS.map((item, index) => (
                <option key={item} value={item}>
                  {recoveryPrompt(index, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm" htmlFor="recovery-text">
            {t("Entry", "লেখা")}
            <textarea
              id="recovery-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-2 min-h-36 w-full rounded-[1.4rem] border border-sage/30 bg-card p-4"
            />
          </label>
          <button type="submit" className="mt-3 min-h-11 bg-sage px-4 text-sm text-paper">
            {t("Save entry", "লেখা রাখুন")}
          </button>
        </form>
      )}
      <EntryList entries={entries.map((entry) => ({ id: entry.id, when: entry.createdAt.slice(0, 10), title: shownPrompt(entry.prompt, lang), text: entry.text }))} />
    </section>
  );
}

function PrivacyControl() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const options: { id: Privacy; label: string }[] = [
    { id: "hidden", label: t("Hidden from therapist", "থেরাপিস্টের কাছ থেকে আড়াল") },
    { id: "progress", label: t("Let my therapist see progress", "থেরাপিস্ট অগ্রগতি দেখুন") },
    { id: "full", label: t("Full access", "পুরো পড়া") },
  ];
  return (
    <fieldset className="mt-5" disabled={!state.crisisMonitoring}>
      <legend className="text-sm">{t("What your therapist can see", "থেরাপিস্ট কী দেখতে পাবেন")}</legend>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="privacy"
              checked={state.privacy === option.id}
              onChange={() => dispatch({ type: "privacy", value: option.id })}
            />
            {option.label}
          </label>
        ))}
      </div>
      {!state.crisisMonitoring ? (
        <p className="mt-2 text-sm">
          {t(
            "Crisis monitoring is off. Entries are not scanned. Sharing stays on full access, because monitoring and limited sharing cannot both be off.",
            "সংকট নজরদারি বন্ধ। লেখা স্ক্যান হয় না। শেয়ার পুরো পড়ায় থাকে, কারণ নজরদারি আর সীমিত শেয়ার দুটোই বন্ধ থাকতে পারে না।",
          )}
        </p>
      ) : null}
    </fieldset>
  );
}

function Personal() {
  const { t } = useI18n();
  return (
    <section className="soft-card mt-10 px-5 py-6">
      <p className="text-xs uppercase tracking-[0.16em] text-clay">{t("My journal", "আমার জার্নাল")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("Your diary is on Today.", "আপনার ডায়েরি আজকের পাতায়।")}</h2>
      <p className="mt-3 text-sm leading-relaxed">
        {t(
          "Those pages stay on this device. They are not shown here, and they are not shown to your therapist.",
          "ওই পাতাগুলো এই ডিভাইসেই থাকে। এখানে দেখানো হয় না, আর আপনার থেরাপিস্টকেও দেখানো হয় না।",
        )}
      </p>
      <Link href="/home" className="mt-4 inline-block text-sm underline">
        {t("Open Today", "আজকের পাতা খুলুন")}
      </Link>
    </section>
  );
}

function EntryList({
  entries,
}: {
  entries: { id: string; when: string; title: string | null; text: string }[];
}) {
  const { t, lang } = useI18n();
  if (entries.length === 0) return <p className="mt-6 text-sm text-muted">{t("Nothing saved yet.", "এখনও কিছু রাখা হয়নি।")}</p>;
  return (
    <ul className="mt-6 space-y-4">
      {entries
        .slice()
        .reverse()
        .map((entry) => (
          <li key={entry.id} className="border-t border-ink/10 pt-3">
            <p className="text-xs text-muted">{whenLabel(entry.when, lang)}</p>
            {entry.title ? <p className="mt-1 text-sm">{entry.title}</p> : null}
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{entry.text}</p>
          </li>
        ))}
    </ul>
  );
}
