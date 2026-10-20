"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireProfile } from "@/components/patient-shell";
import { bandLine, SurveyNote, useI18n } from "@/lib/i18n";
import { bandFromDraft } from "@/lib/scoring";
import { useStore } from "@/lib/store";
import { GAD_ITEMS, PCL_ITEMS, PCL_OPTIONS, PHQ_ITEMS, PHQ_OPTIONS, PHQ_STEM } from "@/lib/surveys";

type Part = "phq" | "pcl" | "gad-opt" | "gad" | "done";

export default function MorePage() {
  return (
    <RequireProfile>
      <More />
    </RequireProfile>
  );
}

function More() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const draft = state.draft;
  const [part, setPart] = useState<Part>(() => firstPart(draft));
  const [index, setIndex] = useState(() => firstIndex(draft, firstPart(draft)));

  if (state.longerPass !== "open") {
    return (
      <div>
        <h1 className="font-serif text-4xl leading-tight">
          {t("These questions are closed.", "এই প্রশ্নগুলো বন্ধ।")}
        </h1>
        <Link href="/settings" className="mt-6 inline-block text-sm underline">
          {t("Back to settings", "সেটিংসে ফিরুন")}
        </Link>
      </div>
    );
  }

  function leave() {
    dispatch({ type: "longer-commit" });
    router.push("/settings");
  }

  function answer(value: number) {
    if (part === "phq") dispatch({ type: "draft/answer", key: "phq9", index, value });
    if (part === "pcl") dispatch({ type: "draft/answer", key: "pcl5", index, value });
    if (part === "gad") dispatch({ type: "draft/answer", key: "gad7", index, value });
  }

  function currentValue() {
    if (part === "phq") return draft.phq9[index];
    if (part === "pcl") return draft.pcl5[index];
    if (part === "gad") return draft.gad7[index];
    return null;
  }

  function afterPcl() {
    if (draft.gadOpt === false) {
      setPart("done");
      return;
    }
    if (draft.gadOpt === true) {
      const gap = draft.gad7.findIndex((item) => item === null);
      if (gap === -1) setPart("done");
      else {
        setPart("gad");
        setIndex(gap);
      }
      return;
    }
    setPart("gad-opt");
  }

  function nextItem() {
    if (part === "phq") {
      const following = [2, 3, 4, 5, 6, 7].find((item) => item > index && draft.phq9[item] === null);
      if (following !== undefined) {
        setIndex(following);
        return;
      }
      const pclGap = draft.pcl5.findIndex((item) => item === null);
      if (pclGap === -1) afterPcl();
      else {
        setPart("pcl");
        setIndex(pclGap);
      }
      return;
    }
    if (part === "pcl") {
      const following = draft.pcl5.findIndex((item, itemIndex) => itemIndex > index && item === null);
      if (following !== -1) {
        setIndex(following);
        return;
      }
      afterPcl();
      return;
    }
    if (part === "gad") {
      const following = draft.gad7.findIndex((item, itemIndex) => itemIndex > index && item === null);
      if (following !== -1) {
        setIndex(following);
        return;
      }
      setPart("done");
    }
  }

  function stop() {
    if (part === "phq") {
      const pclGap = draft.pcl5.findIndex((item) => item === null);
      if (pclGap === -1) afterPcl();
      else {
        setPart("pcl");
        setIndex(pclGap);
      }
      return;
    }
    if (part === "pcl") {
      afterPcl();
      return;
    }
    setPart("done");
  }

  const prompt =
    part === "phq" ? PHQ_ITEMS[index] : part === "pcl" ? PCL_ITEMS[index] : part === "gad" ? GAD_ITEMS[index] : "";
  const options = part === "pcl" ? PCL_OPTIONS : PHQ_OPTIONS;
  const value = currentValue();
  const blocked = (part === "phq" || part === "pcl" || part === "gad") && (value === null || value === undefined);

  return (
    <div>
      {part === "phq" || part === "pcl" || part === "gad" ? (
        <p className="mb-4 text-sm leading-relaxed">
          {t(
            "You can stop this part. Answers you already gave stay.",
            "এই অংশ থামানো যায়। যে উত্তর দিয়েছেন, সেগুলো থাকে।",
          )}
        </p>
      ) : null}
      {part === "gad-opt" ? (
        <>
          <p className="kicker">{t("Optional", "ঐচ্ছিক")}</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight">
            {t("There is an optional set of questions about worry.", "দুশ্চিন্তা নিয়ে ঐচ্ছিক এক সেট প্রশ্ন আছে।")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed">
            {t("You can skip it. It is still a screening aid, not a diagnosis.", "এটা বাদ দিতে পারেন। এটা তবু স্ক্রিনিংয়ের সাহায্য, রোগনির্ণয় নয়।")}
          </p>
          <SurveyNote />
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              className="soft-choice"
              onClick={() => {
                dispatch({ type: "draft", patch: { gadOpt: true } });
                const gap = draft.gad7.findIndex((item) => item === null);
                if (gap === -1) setPart("done");
                else {
                  setPart("gad");
                  setIndex(gap);
                }
              }}
            >
              {t("Include the worry questions", "দুশ্চিন্তার প্রশ্ন রাখুন")}
            </button>
            <button
              type="button"
              className="soft-choice"
              onClick={() => {
                dispatch({ type: "draft", patch: { gadOpt: false } });
                setPart("done");
              }}
            >
              {t("Skip them", "বাদ দিন")}
            </button>
          </div>
        </>
      ) : null}
      {part === "done" ? (
        <>
          <h1 className="font-serif text-3xl leading-tight">{bandLine(bandFromDraft(draft), lang)}</h1>
          <p className="mt-4 text-sm leading-relaxed">
            {t(
              "These questions are a screening aid, not a diagnosis. Unfinished parts stay as they are.",
              "এই প্রশ্ন স্ক্রিনিংয়ের সাহায্য, রোগনির্ণয় নয়। যে অংশ শেষ হয়নি, সেটা যেমন আছে তেমনই থাকে।",
            )}
          </p>
        </>
      ) : null}
      {prompt ? (
        <>
          {part === "phq" || part === "gad" ? <p className="text-sm">{PHQ_STEM}</p> : null}
          <h1 className="mt-3 font-serif text-3xl leading-tight">{prompt}</h1>
          <SurveyNote />
          <div className="mt-6 grid gap-2" role="radiogroup" aria-label={prompt}>
            {options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={value === optionIndex}
                onClick={() => answer(optionIndex)}
                className={`soft-choice ${value === optionIndex ? "is-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className="mt-8 flex items-center justify-between gap-3">
        <Link
          href="/settings"
          className="min-h-11 text-sm underline"
          onClick={(event) => {
            event.preventDefault();
            leave();
          }}
        >
          {t("Back to settings", "সেটিংসে ফিরুন")}
        </Link>
        {part === "phq" || part === "pcl" || part === "gad" ? (
          <button type="button" onClick={stop} className="min-h-11 text-sm underline">
            {t("Stop this part", "এই অংশ থামান")}
          </button>
        ) : null}
        {part === "gad-opt" ? null : (
          <button
            type="button"
            disabled={blocked}
            className="min-h-11 bg-clay px-5 text-sm text-[#f4efe8] disabled:opacity-40"
            onClick={() => {
              if (part === "done") {
                leave();
                return;
              }
              nextItem();
            }}
          >
            {part === "done" ? t("Keep this result", "এই ফল রাখুন") : t("Continue", "এগিয়ে যান")}
          </button>
        )}
      </div>
    </div>
  );
}

function firstPart(draft: { phq9: (number | null)[]; pcl5: (number | null)[]; gadOpt: boolean | null; gad7: (number | null)[] }): Part {
  if ([2, 3, 4, 5, 6, 7].some((index) => draft.phq9[index] === null)) return "phq";
  if (draft.pcl5.some((item) => item === null)) return "pcl";
  if (draft.gadOpt === null) return "gad-opt";
  if (draft.gadOpt === true && draft.gad7.some((item) => item === null)) return "gad";
  return "done";
}

function firstIndex(
  draft: { phq9: (number | null)[]; pcl5: (number | null)[]; gad7: (number | null)[] },
  part: Part,
) {
  if (part === "phq") return [2, 3, 4, 5, 6, 7].find((index) => draft.phq9[index] === null) ?? 2;
  if (part === "pcl") {
    const found = draft.pcl5.findIndex((item) => item === null);
    return found === -1 ? 0 : found;
  }
  if (part === "gad") {
    const found = draft.gad7.findIndex((item) => item === null);
    return found === -1 ? 0 : found;
  }
  return 0;
}
