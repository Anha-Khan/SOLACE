"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CrisisLines } from "@/components/crisis-lines";
import { RequireProfile } from "@/components/patient-shell";
import { addDays, todayISO } from "@/lib/dates";
import { bandLine, equippedWord, SurveyNote, useI18n } from "@/lib/i18n";
import { bandFromDraft, scoresFromDraft } from "@/lib/scoring";
import { emptyDraft } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { GAD_ITEMS, PCL_ITEMS, PCL_OPTIONS, PHQ_INTRO, PHQ_ITEMS, PHQ_OPTIONS } from "@/lib/surveys";
import { EQUIPPED_WORDS } from "@/lib/types";

export default function RetakePage() {
  return (
    <RequireProfile>
      <Retake />
    </RequireProfile>
  );
}

function Retake() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const full = [...state.surveys].reverse().find((item) => item.kind !== "longer");
  const opens = full ? addDays(full.takenAt.slice(0, 10), 14) : todayISO();
  const locked = !!full && opens > todayISO();
  const [step, setStep] = useState(0);
  const [pcl, setPcl] = useState<(number | null)[]>(() => Array.from({ length: 20 }, () => null));
  const [phq, setPhq] = useState<(number | null)[]>(() => Array.from({ length: 9 }, () => null));
  const [gadOpt, setGadOpt] = useState<boolean | null>(null);
  const [gad, setGad] = useState<(number | null)[]>(() => Array.from({ length: 7 }, () => null));
  const [equipped, setEquipped] = useState<number | null>(null);
  const [pause, setPause] = useState(false);

  const steps = useMemo(() => {
    const list = [
      "intro",
      ...PCL_ITEMS.map((_, index) => `pcl-${index}`),
      "phq-intro",
      ...PHQ_ITEMS.map((_, index) => `phq-${index}`),
      "gad-opt",
    ];
    if (gadOpt) list.push(...GAD_ITEMS.map((_, index) => `gad-${index}`));
    list.push("equipped", "done");
    return list;
  }, [gadOpt]);

  const current = steps[step] ?? "done";

  if (locked) {
    return (
      <div>
        <h1 className="font-serif text-4xl leading-tight">{t("The questions can wait.", "প্রশ্ন অপেক্ষা করতে পারে।")}</h1>
        <p className="mt-4 text-sm leading-relaxed">
          {t(
            `A retake stays closed for 14 days. You can take them again on ${opens}. The first result stays.`,
            `আবার নেওয়া ১৪ দিন বন্ধ থাকে। ${opens}-এ আবার নিতে পারবেন। প্রথম ফল থেকে যায়।`,
          )}
        </p>
        <Link href="/settings" className="mt-6 inline-block text-sm underline">
          {t("Back to settings", "সেটিংসে ফিরুন")}
        </Link>
      </div>
    );
  }

  function answered() {
    return {
      ...emptyDraft(),
      pcl5: pcl,
      phq9: phq,
      gadOpt,
      gad7: gad,
      equipped,
    };
  }

  function save() {
    const draft = answered();
    dispatch({ type: "retake", scores: scoresFromDraft(draft), band: bandFromDraft(draft) });
    router.push("/settings");
  }

  function next() {
    if (current.startsWith("phq-") && current !== "phq-intro") {
      const index = Number(current.slice(4));
      if ((phq[index] ?? 0) >= 1 && index === 8 && !pause) {
        setPause(true);
        return;
      }
    }
    if (step >= steps.length - 1) {
      save();
      return;
    }
    setStep((value) => value + 1);
  }

  const prompt = current.startsWith("pcl-")
    ? PCL_ITEMS[Number(current.slice(4))]
    : current.startsWith("phq-") && current !== "phq-intro"
      ? PHQ_ITEMS[Number(current.slice(4))]
      : current.startsWith("gad-") && current !== "gad-opt"
        ? GAD_ITEMS[Number(current.slice(4))]
        : current === "equipped"
          ? t(
              "How equipped do you feel managing the time between sessions right now?",
              "সেশনের মাঝের সময় সামলাতে এখন কতটা প্রস্তুত লাগছে?",
            )
          : "";

  const options =
    current.startsWith("pcl-")
      ? PCL_OPTIONS
      : current === "equipped"
        ? EQUIPPED_WORDS.slice(1).map((_, index) => equippedWord(index + 1, lang))
        : PHQ_OPTIONS;

  const value = current.startsWith("pcl-")
    ? pcl[Number(current.slice(4))]
    : current.startsWith("phq-") && current !== "phq-intro"
      ? phq[Number(current.slice(4))]
      : current.startsWith("gad-") && current !== "gad-opt"
        ? gad[Number(current.slice(4))]
        : current === "equipped"
          ? equipped
            ? equipped - 1
            : null
          : null;

  function choose(index: number) {
    if (current.startsWith("pcl-")) {
      const copy = [...pcl];
      copy[Number(current.slice(4))] = index;
      setPcl(copy);
    } else if (current.startsWith("phq-")) {
      const copy = [...phq];
      copy[Number(current.slice(4))] = index;
      setPhq(copy);
    } else if (current.startsWith("gad-")) {
      const copy = [...gad];
      copy[Number(current.slice(4))] = index;
      setGad(copy);
    } else if (current === "equipped") {
      setEquipped(index + 1);
    }
  }

  const blocked =
    (current.startsWith("pcl-") && pcl[Number(current.slice(4))] === null) ||
    (current.startsWith("phq-") && current !== "phq-intro" && phq[Number(current.slice(4))] === null) ||
    (current.startsWith("gad-") && current !== "gad-opt" && gad[Number(current.slice(4))] === null) ||
    (current === "gad-opt" && gadOpt === null) ||
    (current === "equipped" && !equipped);

  return (
    <div>
      {current === "intro" ? (
        <>
          <p className="kicker">{t("Retake", "আবার")}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">
            {t("The same questions, kept beside the first result.", "একই প্রশ্ন, প্রথম ফলের পাশে রাখা।")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed">
            {t(
              "This adds a new result. It does not erase the first one. These are screening aids, not a diagnosis.",
              "এতে একটা নতুন ফল যোগ হয়। প্রথমটা মুছে যায় না। এগুলো স্ক্রিনিংয়ের সাহায্য, রোগনির্ণয় নয়।",
            )}
          </p>
          <SurveyNote />
        </>
      ) : null}
      {current === "phq-intro" ? (
        <>
          <h1 className="font-serif text-3xl leading-tight">{PHQ_INTRO}</h1>
          <SurveyNote />
        </>
      ) : null}
      {current === "gad-opt" ? (
        <>
          <h1 className="font-serif text-3xl leading-tight">
            {t("There is an optional set of questions about worry.", "দুশ্চিন্তা নিয়ে ঐচ্ছিক এক সেট প্রশ্ন আছে।")}
          </h1>
          <SurveyNote />
          <div className="mt-6 grid gap-3">
            <button type="button" className="soft-choice" onClick={() => setGadOpt(true)}>
              {t("Include the worry questions", "দুশ্চিন্তার প্রশ্ন রাখুন")}
            </button>
            <button type="button" className="soft-choice" onClick={() => setGadOpt(false)}>
              {t("Skip them", "বাদ দিন")}
            </button>
          </div>
        </>
      ) : null}
      {current === "done" ? (
        <>
          <h1 className="font-serif text-3xl leading-tight">
            {bandLine(bandFromDraft(answered()), lang)}
          </h1>
          <p className="mt-4 text-sm leading-relaxed">
            {t("This is a starting point. The first result is still kept.", "এটা একটা শুরু। প্রথম ফল এখনও রাখা আছে।")}
          </p>
        </>
      ) : null}
      {prompt ? (
        <>
          <h1 className="font-serif text-3xl leading-tight">{prompt}</h1>
          {current.startsWith("pcl-") || current.startsWith("phq-") || (current.startsWith("gad-") && current !== "gad-opt") ? (
            <SurveyNote />
          ) : null}
          <div className="mt-6 grid gap-2">
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => choose(index)}
                className={`soft-choice ${value === index ? "is-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {pause ? (
        <div className="mt-6 border border-ink/10 p-4">
          <h2 className="font-serif text-2xl leading-tight">
            {t("If this has been on your mind, you can pause here.", "এটা মনে থাকলে, এখানে থামতে পারেন।")}
          </h2>
          <div className="mt-4">
            <CrisisLines />
          </div>
          <button
            type="button"
            className="round-next mt-4"
            onClick={() => {
              setPause(false);
              setStep((value) => value + 1);
            }}
          >
            {t("Continue the questions", "প্রশ্ন চালিয়ে যান")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={blocked}
          className="round-next mt-8 disabled:opacity-40"
          onClick={next}
        >
          {current === "done" ? t("Keep this result", "এই ফল রাখুন") : t("Continue", "এগিয়ে যান")}
        </button>
      )}
    </div>
  );
}
