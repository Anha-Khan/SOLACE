"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChoicePulse, Companion, useChoicePulse, type CompanionLook } from "@/components/companion";
import { CrisisLines } from "@/components/crisis-lines";
import { onboardingSteps, stepIndex } from "@/lib/flow";
import { bandLine, categoryWord, SurveyNote, useI18n } from "@/lib/i18n";
import { bandFromDraft } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import { GAD_ITEMS, PC_EVENT, PC_ITEMS, PC_STEM, PCL_INTRO, PCL_ITEMS, PCL_OPTIONS, PHQ_INTRO, PHQ_ITEMS, PHQ_OPTIONS, PHQ_STEM } from "@/lib/surveys";
import {
  CATEGORIES,
  COMPANION_LINE,
  DEMO_CODE,
  THERAPIST_LICENCE,
  THERAPIST_NAME,
  type Category,
  type Consent,
} from "@/lib/types";

const REQUIRED: (keyof Consent)[] = ["moodAndTasks", "crisisDetection", "tier3Alert"];

const CONSENT_COPY: { key: keyof Consent; label: string; help: string; required: boolean }[] = [
  {
    key: "moodAndTasks",
    label: "Mood and task data",
    help: "Check-ins and finished tasks stay on this device so a heavy run of days can lead to a simpler practice.",
    required: true,
  },
  {
    key: "journalStorage",
    label: "Journal storage",
    help: "If this is on, recovery journal entries are kept in this browser. You can leave it off.",
    required: false,
  },
  {
    key: "aiAnalysis",
    label: "AI analysis of journal",
    help: "A future version could send journal text to an outside service for a summary. This demo never sends it.",
    required: false,
  },
  {
    key: "crisisDetection",
    label: "Crisis detection",
    help: "The recovery journal is checked on this device for a few explicit phrases.",
    required: true,
  },
  {
    key: "tier3Alert",
    label: "Automatic therapist alert at Tier 3",
    help: "A future version could alert a therapist at the highest concern level. This demo never contacts anyone.",
    required: true,
  },
  {
    key: "therapistSharing",
    label: "Therapist data sharing",
    help: "If this is on, a connected therapist can see what your privacy setting allows. You can leave it off.",
    required: false,
  },
];

export default function OnboardingPage() {
  const { ready, state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const draft = state.draft;
  const [snap, setSnap] = useState<string | null>(null);
  const [accountError, setAccountError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [look, setLook] = useState<CompanionLook>("rest");
  const steps = useMemo(() => onboardingSteps(draft), [draft]);
  const onConfirm = draft.step === "confirm";
  const index = Math.max(0, steps.indexOf(draft.step));

  useEffect(() => {
    if (!ready) return;
    if (state.profile.onboardingComplete) router.replace("/home");
  }, [ready, router, state.profile.onboardingComplete]);

  useEffect(() => {
    if (leaving && state.profile.onboardingComplete) router.push("/home");
  }, [leaving, router, state.profile.onboardingComplete]);

  if (!ready || state.profile.onboardingComplete) {
    return <div className="min-h-dvh bg-paper" aria-hidden="true" />;
  }

  function go(step: string) {
    dispatch({ type: "draft", patch: { step } });
  }

  function next() {
    const position = steps.indexOf(draft.step);
    const following = steps[position + 1];
    if (following) go(following);
  }

  function back() {
    if (onConfirm) {
      go("therapist");
      return;
    }
    const position = steps.indexOf(draft.step);
    if (position > 0) go(steps[position - 1]);
  }

  function stopPart() {
    const phqItem = stepIndex(draft.step, "phq");
    const pclItem = stepIndex(draft.step, "pcl");
    const gadItem = stepIndex(draft.step, "gad");
    if (draft.step === "phq-more" || (phqItem !== null && phqItem >= 2 && phqItem <= 7)) {
      dispatch({ type: "draft", patch: { stopPhq: true, step: "pcl-more" } });
      return;
    }
    if (draft.step === "pcl-more" || pclItem !== null) {
      dispatch({ type: "draft", patch: { stopPcl: true, step: "gad-opt" } });
      return;
    }
    if (gadItem !== null) {
      dispatch({ type: "draft", patch: { stopGad: true, step: "result" } });
    }
  }

  const phqItemNow = stepIndex(draft.step, "phq");
  const canStop =
    draft.step === "phq-more" ||
    draft.step === "pcl-more" ||
    (phqItemNow !== null && phqItemNow >= 2 && phqItemNow <= 7) ||
    stepIndex(draft.step, "pcl") !== null ||
    stepIndex(draft.step, "gad") !== null;

  function finish(connect: boolean) {
    dispatch({ type: "finish", connect });
    setLeaving(true);
  }

  const progressMax = steps.length;
  const progressNow = onConfirm ? progressMax : index + 1;

  const quiet =
    draft.step === "account" || draft.step === "consent" || draft.step === "restriction" || onConfirm;
  const clinical =
    draft.step === "pc-event" ||
    draft.step.startsWith("pc-") ||
    draft.step.startsWith("phq") ||
    draft.step.startsWith("pcl") ||
    draft.step.startsWith("gad");

  return (
    <main className="visit-screen min-h-dvh text-ink">
      <ChoicePulse
        onPulse={() => {
          setLook("notice");
          window.setTimeout(() => setLook(clinical ? "still" : "rest"), 420);
        }}
      >
      <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <p className="font-serif text-2xl">Between</p>
          <Link href="/exit" className="soft-chip">
            {t("Exit", "বেরিয়ে যান")}
          </Link>
        </header>
        <div
          className="mt-6 flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={progressMax}
          aria-valuenow={progressNow}
          aria-label={t("Setup progress", "সেটআপের অগ্রগতি")}
        >
          {steps.map((step, stepNumber) => (
            <span
              key={step}
              className={`h-1.5 flex-1 rounded-full ${stepNumber < progressNow ? "bg-sage-deep" : "bg-ink/10"}`}
            />
          ))}
        </div>

        <div className="flex-1 py-8">
          {quiet ? null : <Companion look={clinical ? (look === "notice" ? "notice" : "still") : look} className="mb-4" />}
          {draft.step === "intro" ? <Intro /> : null}
          {draft.step === "account" ? (
            <Account
              email={draft.email}
              age={draft.ageConfirmed}
              error={accountError}
              onEmail={(email) => dispatch({ type: "draft", patch: { email } })}
              onAge={(ageConfirmed) => dispatch({ type: "draft", patch: { ageConfirmed } })}
              onPassword={(password) =>
                dispatch({ type: "draft", patch: { passwordSet: password.trim().length >= 4 } })
              }
            />
          ) : null}
          {draft.step === "consent" ? (
            <ConsentStep
              consent={draft.consents}
              snap={snap}
              onToggle={(key, on) => {
                if (!on && REQUIRED.includes(key)) {
                  setSnap(key);
                  dispatch({ type: "draft", patch: { consents: { ...draft.consents, [key]: true } } });
                  return;
                }
                setSnap(null);
                dispatch({
                  type: "draft",
                  patch: { consents: { ...draft.consents, [key]: on } },
                });
              }}
            />
          ) : null}
          {draft.step === "restriction" ? <Restriction /> : null}
          {draft.step === "pc-event" ? (
            <div>
              <p className="kicker">{t("A hard experience", "একটা কঠিন অভিজ্ঞতা")}</p>
              <h1 className="mt-3 font-serif text-3xl leading-tight">{PC_EVENT}</h1>
              <SurveyNote />
              <div className="mt-6 grid gap-2" role="radiogroup" aria-label={PC_EVENT}>
                <Choice
                  label="Yes"
                  selected={draft.pcEvent === true}
                  onClick={() => dispatch({ type: "draft", patch: { pcEvent: true } })}
                />
                <Choice
                  label="No"
                  selected={draft.pcEvent === false}
                  onClick={() => dispatch({ type: "draft", patch: { pcEvent: false } })}
                />
              </div>
            </div>
          ) : null}
          {stepIndex(draft.step, "pc") !== null ? (
            <div>
              <p className="kicker">{t("Past month", "গত মাস")}</p>
              <p className="mt-3 text-sm">{PC_STEM}</p>
              <h1 className="mt-3 font-serif text-3xl leading-tight">{PC_ITEMS[stepIndex(draft.step, "pc") ?? 0]}</h1>
              <SurveyNote />
              <div className="mt-6 grid gap-2" role="radiogroup" aria-label={PC_ITEMS[stepIndex(draft.step, "pc") ?? 0]}>
                {(["Yes", "No"] as const).map((label, option) => (
                  <Choice
                    key={label}
                    label={label}
                    selected={draft.pcptsd[stepIndex(draft.step, "pc") ?? 0] === (option === 0 ? 1 : 0)}
                    onClick={() =>
                      dispatch({
                        type: "draft/answer",
                        key: "pcptsd",
                        index: stepIndex(draft.step, "pc") ?? 0,
                        value: option === 0 ? 1 : 0,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
          {stepIndex(draft.step, "phq") !== null ? (
            <Question
              kicker={t("Last two weeks", "গত দুই সপ্তাহ")}
              survey
              stem={PHQ_STEM}
              prompt={PHQ_ITEMS[stepIndex(draft.step, "phq") ?? 0] ?? ""}
              options={PHQ_OPTIONS}
              value={draft.phq9[stepIndex(draft.step, "phq") ?? 0] ?? null}
              onChange={(value) =>
                dispatch({ type: "draft/answer", key: "phq9", index: stepIndex(draft.step, "phq") ?? 0, value })
              }
            />
          ) : null}
          {draft.step === "fork" ? (
            <div>
              <p className="kicker">{t("A starting point", "একটা শুরু")}</p>
              <h1 className="mt-3 font-serif text-3xl leading-tight">
                {t("You can start with these answers.", "এই উত্তরগুলো নিয়েই শুরু করতে পারেন।")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed">
                {t("Or answer a few more. You can stop each part.", "অথবা আর কয়েকটা উত্তর দিন। প্রতিটা অংশ থামানো যায়।")}
              </p>
              <div className="mt-6 grid gap-3">
                <Choice
                  label={t("Start with this", "এইটুকু নিয়ে শুরু")}
                  selected={draft.longerChoice === "start"}
                  onClick={() => dispatch({ type: "draft", patch: { longerChoice: "start", step: "result" } })}
                />
                <Choice
                  label={t("Answer a few more", "আর কয়েকটা উত্তর দিন")}
                  selected={draft.longerChoice === "more"}
                  onClick={() => dispatch({ type: "draft", patch: { longerChoice: "more", step: "phq-more" } })}
                />
              </div>
            </div>
          ) : null}
          {draft.step === "phq-more" ? (
            <Preface
              kicker={t("Last two weeks", "গত দুই সপ্তাহ")}
              body={t(
                "A few more questions about the last two weeks. You can stop this part. Answers you already gave stay.",
                "গত দুই সপ্তাহ নিয়ে আর কয়েকটা প্রশ্ন। এই অংশ থামানো যায়। যে উত্তর দিয়েছেন, সেগুলো থাকে।",
              )}
              note={PHQ_INTRO}
              survey
            />
          ) : null}
          {draft.step === "pcl-more" ? (
            <Preface
              kicker={t("Past month", "গত মাস")}
              body={t(
                "A longer set about the past month. You can stop this part. Answers you already gave stay.",
                "গত মাস নিয়ে একটা দীর্ঘ সেট। এই অংশ থামানো যায়। যে উত্তর দিয়েছেন, সেগুলো থাকে।",
              )}
              note={PCL_INTRO}
              survey
            />
          ) : null}
          {stepIndex(draft.step, "pcl") !== null ? (
            <Question
              kicker={t("Past month", "গত মাস")}
              survey
              prompt={PCL_ITEMS[stepIndex(draft.step, "pcl") ?? 0] ?? ""}
              options={PCL_OPTIONS}
              value={draft.pcl5[stepIndex(draft.step, "pcl") ?? 0] ?? null}
              onChange={(value) =>
                dispatch({ type: "draft/answer", key: "pcl5", index: stepIndex(draft.step, "pcl") ?? 0, value })
              }
            />
          ) : null}
          {draft.step === "gad-opt" ? (
            <div>
              <p className="kicker">{t("Optional", "ঐচ্ছিক")}</p>
              <h1 className="mt-3 font-serif text-3xl leading-tight">
                {t("There is an optional set of questions about worry.", "দুশ্চিন্তা নিয়ে ঐচ্ছিক এক সেট প্রশ্ন আছে।")}
              </h1>
              <p className="mt-3 text-sm leading-relaxed">
                {t("You can skip it. It is still a screening aid, not a diagnosis.", "এটা বাদ দিতে পারেন। এটা তবু স্ক্রিনিংয়ের সাহায্য, রোগনির্ণয় নয়।")}
              </p>
              <SurveyNote />
              <div className="mt-6 grid gap-3">
                <Choice
                  selected={draft.gadOpt === true}
                  onClick={() => dispatch({ type: "draft", patch: { gadOpt: true } })}
                  label={t("Include the worry questions", "দুশ্চিন্তার প্রশ্ন রাখুন")}
                />
                <Choice
                  selected={draft.gadOpt === false}
                  onClick={() => dispatch({ type: "draft", patch: { gadOpt: false } })}
                  label={t("Skip them", "বাদ দিন")}
                />
              </div>
            </div>
          ) : null}
          {stepIndex(draft.step, "gad") !== null ? (
            <Question
              kicker={t("Worry, last two weeks", "দুশ্চিন্তা, গত দুই সপ্তাহ")}
              survey
              stem={PHQ_STEM}
              prompt={GAD_ITEMS[stepIndex(draft.step, "gad") ?? 0] ?? ""}
              options={PHQ_OPTIONS}
              value={draft.gad7[stepIndex(draft.step, "gad") ?? 0] ?? null}
              onChange={(value) =>
                dispatch({ type: "draft/answer", key: "gad7", index: stepIndex(draft.step, "gad") ?? 0, value })
              }
            />
          ) : null}
          {draft.step === "result" ? (
            <Result
              sentence={bandLine(bandFromDraft(draft), lang)}
              heavier={bandFromDraft(draft) === "heavier-week"}
              name={draft.firstName}
              onName={(firstName) => dispatch({ type: "draft", patch: { firstName } })}
            />
          ) : null}
          {draft.step === "categories" ? (
            <Categories
              selected={draft.categories}
              time={draft.reminderTime}
              onToggle={(category) => {
                const has = draft.categories.includes(category);
                const categories = has
                  ? draft.categories.filter((item) => item !== category)
                  : [...draft.categories, category];
                dispatch({ type: "draft", patch: { categories } });
              }}
              onTime={(reminderTime) => dispatch({ type: "draft", patch: { reminderTime } })}
            />
          ) : null}
          {draft.step === "therapist" ? (
            <TherapistStep
              code={draft.therapistCode}
              error={codeError}
              onCode={(therapistCode) => {
                setCodeError("");
                dispatch({ type: "draft", patch: { therapistCode } });
              }}
            />
          ) : null}
          {onConfirm ? <Confirm /> : null}
          {draft.showItem9 ? (
              <div className="fixed inset-0 z-30 grid place-items-end bg-ink/30 sm:place-items-center">
              <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-t-[1.8rem] bg-paper px-5 py-6 sm:rounded-[1.8rem]" role="dialog" aria-labelledby="item9-title">
                <h2 id="item9-title" className="font-serif text-3xl leading-tight">
                  {t("If this has been on your mind, you can pause here.", "এটা মনে থাকলে, এখানে থামতে পারেন।")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed">
                  {t(
                    "You can breathe, or call. You can also continue the questions when you want to.",
                    "শ্বাস নিতে পারেন, বা কল করতে পারেন। চাইলে প্রশ্নও চালিয়ে যেতে পারেন।",
                  )}
                </p>
                <Link href="/ground" className="mt-4 inline-block text-sm underline">
                  {t("Open grounding", "গ্রাউন্ডিং খুলুন")}
                </Link>
                <div className="mt-6">
                  <CrisisLines />
                </div>
                <button
                  type="button"
                  className="round-next mt-6"
                  onClick={() => {
                    dispatch({ type: "draft", patch: { showItem9: false, item9Ack: true } });
                    next();
                  }}
                >
                  {t("Continue the questions", "প্রশ্ন চালিয়ে যান")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 pb-4">
          {draft.step !== "intro" ? (
            <button type="button" onClick={back} className="min-h-11 px-2 text-sm">
              {t("Back", "পিছনে")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-4">
            {canStop ? (
              <button type="button" onClick={stopPart} className="min-h-11 text-sm underline">
                {t("Stop this part", "এই অংশ থামান")}
              </button>
            ) : null}
            {draft.step === "fork" ? null : (
          <button
            type="button"
            className="round-next"
            onClick={() => {
              if (draft.step === "account") {
                if (!draft.ageConfirmed) {
                  dispatch({ type: "under18" });
                  router.push("/under-18");
                  return;
                }
                if (!draft.email.includes("@") || !draft.email.split("@")[1]?.includes(".")) {
                  setAccountError(t("Enter an email address to keep this demo on this device.", "এই ডেমো এই ডিভাইসে রাখতে একটা ইমেইল দিন।"));
                  return;
                }
                if (!draft.passwordSet) {
                  setAccountError(t("Use at least 4 characters. The password is not stored.", "অন্তত ৪টি অক্ষর দিন। পাসওয়ার্ড রাখা হয় না।"));
                  return;
                }
                setAccountError("");
              }
              if (draft.step === "pc-event" && draft.pcEvent === null) return;
              const pcItem = stepIndex(draft.step, "pc");
              if (pcItem !== null && draft.pcptsd[pcItem] === null) return;
              const pclItem = stepIndex(draft.step, "pcl");
              if (pclItem !== null && draft.pcl5[pclItem] === null) return;
              const phqItem = stepIndex(draft.step, "phq");
              if (phqItem !== null) {
                if (draft.phq9[phqItem] === null) return;
                if (phqItem === 8 && (draft.phq9[8] ?? 0) >= 1 && !draft.item9Ack) {
                  dispatch({ type: "draft", patch: { showItem9: true } });
                  return;
                }
              }
              const gadItem = stepIndex(draft.step, "gad");
              if (gadItem !== null && draft.gad7[gadItem] === null) return;
              if (draft.step === "gad-opt" && draft.gadOpt === null) return;
              if (draft.step === "fork") return;
              if (draft.step === "categories" && draft.categories.length === 0) return;
              if (draft.step === "therapist") {
                const code = draft.therapistCode.trim().toUpperCase();
                if (code === DEMO_CODE) {
                  dispatch({ type: "invite-demo" });
                  go("confirm");
                  return;
                }
                if (code.length > 0) {
                  setCodeError(
                    t(
                      "That code isn't recognized in this demo. You can try DEMO, or continue without one.",
                      "এই ডেমোতে এই কোড চেনা যায় না। DEMO চেষ্টা করতে পারেন, অথবা কোড ছাড়া এগোতে পারেন।",
                    ),
                  );
                  return;
                }
                setCodeError(t("Enter a code, or choose I'll do this later.", "একটা কোড দিন, অথবা পরে করব বেছে নিন।"));
                return;
              }
              if (onConfirm) {
                finish(true);
                return;
              }
              next();
            }}
          >
            {onConfirm ? t("Connect and continue", "যুক্ত করে এগিয়ে যান") : t("Continue", "এগিয়ে যান")}
          </button>
            )}
          </div>
        </footer>
        {draft.step === "therapist" ? (
          <button
            type="button"
            className="mb-4 text-sm underline"
            onClick={() => finish(false)}
          >
            {t("I'll do this later", "পরে করব")}
          </button>
        ) : null}
      </div>
      </ChoicePulse>
    </main>
  );
}

function Intro() {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("Before you begin", "শুরুর আগে")}</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">
        {t("A companion for the days between sessions.", "সেশনের মাঝের দিনগুলোর জন্য একজন সঙ্গী।")}
      </h1>
      <p className="mt-4 leading-relaxed">{t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}</p>
      <ul className="mt-6 space-y-2 font-serif text-2xl">
        <li>{t("Not a treatment", "চিকিৎসা নয়")}</li>
        <li>{t("Not a diagnosis", "রোগনির্ণয় নয়")}</li>
        <li>{t("Not a replacement for a therapist", "থেরাপিস্টের বদলি নয়")}</li>
        <li>{t("Not a crisis service", "সংকটকালীন সেবা নয়")}</li>
      </ul>
      <div className="mt-8">
        <CrisisLines />
      </div>
    </div>
  );
}

function Account({
  email,
  age,
  error,
  onEmail,
  onAge,
  onPassword,
}: {
  email: string;
  age: boolean;
  error: string;
  onEmail: (value: string) => void;
  onAge: (value: boolean) => void;
  onPassword: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("This device", "এই ডিভাইস")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{t("Set a local demo login.", "এই ডিভাইসে একটা ডেমো লগইন রাখুন।")}</h1>
      <p className="mt-3 text-sm leading-relaxed">
        {t(
          "The password is kept only as a flag on this device. It is not a real credential, and it is not sent anywhere.",
          "পাসওয়ার্ড শুধু একটা চিহ্ন হিসেবে এই ডিভাইসে থাকে। এটা আসল পরিচয়পত্র নয়, আর কোথাও পাঠানো হয় না।",
        )}
      </p>
      <label className="mt-6 block text-sm" htmlFor="email">
        {t("Email", "ইমেইল")}
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          className="mt-1 w-full border-b border-ink/30 py-2 outline-none"
        />
      </label>
      <label className="mt-5 block text-sm" htmlFor="password">
        {t("Password", "পাসওয়ার্ড")}
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          onChange={(event) => onPassword(event.target.value)}
          className="mt-1 w-full border-b border-ink/30 py-2 outline-none"
        />
      </label>
      <label className="mt-6 flex items-start gap-3 text-sm" htmlFor="age">
        <input
          id="age"
          type="checkbox"
          checked={age}
          onChange={(event) => onAge(event.target.checked)}
          className="mt-1"
        />
        <span>{t("I am 18 or older.", "আমার বয়স ১৮ বছর বা তার বেশি।")}</span>
      </label>
      <p className="mt-3 text-sm text-muted">
        {t(
          "If you are under 18, leave this unchecked and continue. We will not create an account.",
          "আপনার বয়স ১৮-এর কম হলে, এটা টিক না দিয়ে এগিয়ে যান। আমরা কোনো অ্যাকাউন্ট তৈরি করব না।",
        )}
      </p>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
    </div>
  );
}

function ConsentStep({
  consent,
  snap,
  onToggle,
}: {
  consent: Consent;
  snap: string | null;
  onToggle: (key: keyof Consent, on: boolean) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const copy: Record<string, { label: string; help: string }> = {
    moodAndTasks: {
      label: t("Mood and task data", "মেজাজ আর কাজের তথ্য"),
      help: t(
        "Check-ins and finished tasks stay on this device so a heavy run of days can lead to a simpler practice.",
        "চেক-ইন আর শেষ করা কাজ এই ডিভাইসে থাকে, যাতে ভারী কয়েকটা দিনের পর চর্চা সহজ হতে পারে।",
      ),
    },
    journalStorage: {
      label: t("Journal storage", "জার্নাল রাখা"),
      help: t(
        "If this is on, recovery journal entries are kept in this browser. You can leave it off.",
        "এটা চালু থাকলে রিকভারি জার্নাল এই ব্রাউজারে থাকে। বন্ধ রাখতে পারেন।",
      ),
    },
    aiAnalysis: {
      label: t("AI analysis of journal", "জার্নালের এআই বিশ্লেষণ"),
      help: t(
        "A future version could send journal text to an outside service for a summary. This demo never sends it.",
        "পরের কোনো সংস্করণ সারাংশের জন্য জার্নালের লেখা বাইরের সেবায় পাঠাতে পারত। এই ডেমো কখনও পাঠায় না।",
      ),
    },
    crisisDetection: {
      label: t("Crisis detection", "সংকট শনাক্ত"),
      help: t(
        "The recovery journal is checked on this device for a few explicit phrases.",
        "রিকভারি জার্নাল এই ডিভাইসে কয়েকটি স্পষ্ট বাক্যের জন্য দেখা হয়।",
      ),
    },
    tier3Alert: {
      label: t("Automatic therapist alert at Tier 3", "টিয়ার ৩-এ থেরাপিস্টের স্বয়ংক্রিয় সতর্কতা"),
      help: t(
        "A future version could alert a therapist at the highest concern level. This demo never contacts anyone.",
        "পরের কোনো সংস্করণ সবচেয়ে উদ্বেগের স্তরে একজন থেরাপিস্টকে সতর্ক করতে পারত। এই ডেমো কাউকে যোগাযোগ করে না।",
      ),
    },
    therapistSharing: {
      label: t("Therapist data sharing", "থেরাপিস্টের সঙ্গে তথ্য"),
      help: t(
        "If this is on, a connected therapist can see what your privacy setting allows. You can leave it off.",
        "এটা চালু থাকলে যুক্ত থেরাপিস্ট সেটুকুই দেখতে পারেন, যতটুকু আপনার গোপনীয়তা দেয়। বন্ধ রাখতে পারেন।",
      ),
    },
  };
  return (
    <div>
      <p className="kicker">{t("Consent", "সম্মতি")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{t("Choose what this demo may keep.", "এই ডেমো কী রাখতে পারে, সেটা বেছে নিন।")}</h1>
      <ul className="mt-6 space-y-5">
        {CONSENT_COPY.map((item) => (
          <li key={item.key} className="border-t border-ink/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">{copy[item.key]?.label ?? item.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={consent[item.key]}
                aria-label={copy[item.key]?.label ?? item.label}
                onClick={() => onToggle(item.key, !consent[item.key])}
                className={`min-h-8 w-12 rounded-full border border-ink/20 px-1 ${consent[item.key] ? "bg-sage" : "bg-transparent"}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-paper ${consent[item.key] ? "ml-auto" : ""}`} />
              </button>
            </div>
            <button type="button" className="mt-2 text-xs underline" onClick={() => setOpen(open === item.key ? null : item.key)}>
              {t("What does this mean?", "এটার মানে কী?")}
            </button>
            {open === item.key ? <p className="mt-2 text-sm leading-relaxed">{copy[item.key]?.help ?? item.help}</p> : null}
            {snap === item.key ? <p className="mt-2 text-sm">{t("This stays on.", "এটা চালুই থাকবে।")}</p> : null}
          </li>
        ))}
      </ul>
      <div className="mt-8 space-y-3 text-sm leading-relaxed">
        <p>{t("Crisis scanning cannot be turned off at signup.", "সাইন আপের সময় সংকট স্ক্যান বন্ধ করা যায় না।")}</p>
        <p>{t("Revoking access does not erase what a therapist already saw.", "প্রবেশ কেড়ে নিলে থেরাপিস্ট যা ইতিমধ্যে দেখেছেন, সেটা মুছে যায় না।")}</p>
        <p>
          {t(
            "Journal text may be analyzed by an external service that must not retain it. This demo sends nothing.",
            "জার্নালের লেখা এমন বাইরের সেবায় বিশ্লেষণ হতে পারে, যারা সেটা রাখতে পারবে না। এই ডেমো কিছুই পাঠায় না।",
          )}
        </p>
      </div>
    </div>
  );
}

function Restriction() {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("Before the questions", "প্রশ্নের আগে")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">
        {t("Some tools stay smaller on purpose.", "কিছু হাতিয়ার ইচ্ছে করেই ছোট থাকে।")}
      </h1>
      <p className="mt-4 text-sm leading-relaxed">{t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p>
          {t(
            "You can use the daily practices. If this week feels heavy and a therapist is not connected, an invitation to connect stays on your home screen. Processing tasks stay locked until your therapist is connected.",
            "প্রতিদিনের চর্চা ব্যবহার করতে পারেন। এ সপ্তাহ ভারী লাগলে আর থেরাপিস্ট যুক্ত না থাকলে, যুক্ত হওয়ার আমন্ত্রণ ঘরে থাকে। থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজ বন্ধ থাকে।",
          )}
        </p>
        <p>
          {t(
            "If support is limited, Between keeps check-in, grounding, breathing, and crisis help. The recovery journal can be read, but not added to. Cost and access are real barriers. This is protection, not a punishment.",
            "সাপোর্ট সীমিত হলে Between চেক-ইন, গ্রাউন্ডিং, শ্বাস, আর সংকটের সাহায্য রাখে। রিকভারি জার্নাল পড়া যায়, নতুন লেখা যায় না। খরচ আর সুযোগ সত্যিই বাধা। এটা সুরক্ষা, শাস্তি নয়।",
          )}
        </p>
        <p>
          {t(
            "If Between is not the right fit without a therapist, home becomes a short note and the numbers that can help. Check-in, grounding, and crisis help stay available.",
            "থেরাপিস্ট ছাড়া Between মানানসই না হলে ঘর একটা ছোট নোট আর সাহায্যের নম্বর হয়ে যায়। চেক-ইন, গ্রাউন্ডিং, আর সংকটের সাহায্য খোলা থাকে।",
          )}
        </p>
        <p>{t("Crisis help and grounding are never restricted.", "সংকটের সাহায্য আর গ্রাউন্ডিং কখনও সীমিত হয় না।")}</p>
      </div>
    </div>
  );
}

function Preface({
  kicker,
  body,
  note,
  survey = false,
}: {
  kicker: string;
  body: string;
  note?: string;
  survey?: boolean;
}) {
  return (
    <div>
      <p className="kicker">{kicker}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{body}</h1>
      {survey ? <SurveyNote /> : null}
      {note ? <p className="mt-4 text-sm leading-relaxed">{note}</p> : null}
    </div>
  );
}

function Question({
  kicker,
  prompt,
  options,
  value,
  onChange,
  survey = false,
  stem,
}: {
  kicker: string;
  prompt: string;
  options: readonly string[];
  value: number | null;
  onChange: (value: number) => void;
  survey?: boolean;
  stem?: string;
}) {
  return (
    <div>
      <p className="kicker">{kicker}</p>
      {stem ? <p className="mt-3 text-sm">{stem}</p> : null}
      <h1 className="mt-3 font-serif text-3xl leading-tight">{prompt}</h1>
      {survey ? <SurveyNote /> : null}
      <div className="mt-6 grid gap-2" role="radiogroup" aria-label={prompt}>
        {options.map((option, optionIndex) => (
          <Choice key={option} label={option} selected={value === optionIndex} onClick={() => onChange(optionIndex)} />
        ))}
      </div>
    </div>
  );
}

function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const pulse = useChoicePulse();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => {
        pulse();
        onClick();
      }}
      className={`soft-choice ${selected ? "is-on" : ""}`}
    >
      {label}
    </button>
  );
}

function Result({
  sentence,
  heavier,
  name,
  onName,
}: {
  sentence: string;
  heavier: boolean;
  name: string;
  onName: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("A starting point", "একটা শুরু")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{sentence}</h1>
      <p className="mt-4 leading-relaxed">
        {t("This is a starting point. It will adjust as the app learns more about you.", "এটা একটা শুরু। অ্যাপ আপনার সম্পর্কে আরও জানলে এটা বদলাবে।")}
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        {t("These questions are a screening aid, not a diagnosis.", "এই প্রশ্ন স্ক্রিনিংয়ের সাহায্য, রোগনির্ণয় নয়।")}
      </p>
      {heavier ? (
        <p className="mt-3 text-sm leading-relaxed">
          {t(
            "You can still use Between. A therapist invite will stay on your home screen. Processing tasks stay locked until your therapist is connected.",
            "আপনি Between ব্যবহার করতে পারেন। থেরাপিস্টের আমন্ত্রণ ঘরে থাকবে। থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজ বন্ধ থাকে।",
          )}
        </p>
      ) : null}
      <label className="mt-8 block text-sm" htmlFor="first-name">
        {t("First name, if you want one", "নামের প্রথম অংশ, চাইলে")}
        <input
          id="first-name"
          value={name}
          onChange={(event) => onName(event.target.value)}
          className="mt-1 w-full border-b border-ink/30 py-2 outline-none"
        />
      </label>
    </div>
  );
}

function Categories({
  selected,
  time,
  onToggle,
  onTime,
}: {
  selected: Category[];
  time: string;
  onToggle: (category: Category) => void;
  onTime: (value: string) => void;
}) {
  const { t, lang } = useI18n();
  const pulse = useChoicePulse();
  return (
    <div>
      <p className="kicker">{t("Practices", "চর্চা")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{t("What kinds of tasks feel possible?", "কোন ধরনের কাজ সম্ভব লাগছে?")}</h1>
      <p className="mt-3 text-sm">{t("Choose at least one. You can change this later.", "অন্তত একটা নিন। পরে বদলাতে পারেন।")}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const on = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={on}
              onClick={() => {
                pulse();
                onToggle(category);
              }}
              className={`soft-choice w-auto ${on ? "is-on" : ""}`}
            >
              {categoryWord(category, lang)}
            </button>
          );
        })}
      </div>
      <label className="mt-8 block text-sm" htmlFor="reminder">
        {t("Reminder time", "মনে করিয়ে দেওয়ার সময়")}
        <input
          id="reminder"
          type="time"
          value={time}
          onChange={(event) => onTime(event.target.value)}
          className="mt-2 block border border-ink/20 px-3 py-2"
        />
      </label>
    </div>
  );
}

function TherapistStep({
  code,
  error,
  onCode,
}: {
  code: string;
  error: string;
  onCode: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("Therapist", "থেরাপিস্ট")}</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight">{t("Enter a code, or do this later.", "একটা কোড দিন, অথবা পরে করুন।")}</h1>
      <p className="mt-3 text-sm leading-relaxed">
        {t(
          "Processing tasks stay locked until your therapist is connected. You can add an invite code later.",
          "থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজ বন্ধ থাকে। আমন্ত্রণের কোড পরেও দিতে পারেন।",
        )}
      </p>
      <label className="mt-6 block text-sm" htmlFor="code">
        {t("Therapist code", "থেরাপিস্টের কোড")}
        <input
          id="code"
          value={code}
          onChange={(event) => onCode(event.target.value)}
          autoCapitalize="characters"
          className="mt-1 w-full border-b border-ink/30 py-2 uppercase outline-none"
        />
      </label>
      {error ? <p className="mt-3 text-sm">{error}</p> : null}
    </div>
  );
}

function Confirm() {
  const { t } = useI18n();
  return (
    <div>
      <p className="kicker">{t("Confirm", "নিশ্চিত করুন")}</p>
      <h1 className="mt-3 font-serif text-4xl">{THERAPIST_NAME}</h1>
      <p className="mt-2 text-sm">{t(THERAPIST_LICENCE, "ডেমো লাইসেন্স · বাংলাদেশ")}</p>
      <p className="mt-6 text-sm leading-relaxed">
        {t("Connecting adds", "যুক্ত করলে")} {THERAPIST_NAME}{" "}
        {t(
          "to your safety plan as a contact you can see. You will confirm before anything is shared.",
          "আপনার নিরাপত্তা পরিকল্পনায় একজন পরিচিত হিসেবে যোগ হয়, যা আপনি দেখতে পান। কিছু শেয়ার হওয়ার আগে আপনি নিশ্চিত করবেন।",
        )}
      </p>
    </div>
  );
}
