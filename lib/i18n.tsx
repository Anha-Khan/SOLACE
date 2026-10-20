"use client";

import { elapsed, greeting } from "./dates";
import { bandSentence } from "./scoring";
import { getTask, type TaskDef } from "./tasks";
import { FEELING_BN, TASK_BN, VALUE_BN } from "./bn-tasks";
import { useStore } from "./store";
import {
  EQUIPPED_WORDS,
  KAAN_LINE,
  KAAN_NUMBER,
  MOOD_WORDS,
  RECOVERY_PROMPTS,
  SOFT_FLAG_NOTE,
  type Band,
  type Category,
  type Language,
} from "./types";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function bnNum(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BN_DIGITS[Number(digit)] ?? digit);
}

export function useI18n() {
  const { state, dispatch } = useStore();
  const lang = state.language;
  return {
    lang,
    t: (en: string, bn: string) => (lang === "bn" ? bn : en),
    setLang: (language: Language) => dispatch({ type: "language", language }),
  };
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("Language", "ভাষা")}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      {(
        [
          ["en", "English"],
          ["bn", "বাংলা"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={lang === id}
          onClick={() => setLang(id)}
          className={`min-h-11 px-1 text-sm ${lang === id ? "text-ink underline decoration-clay underline-offset-4" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SurveyNote() {
  const { lang } = useI18n();
  if (lang !== "bn") return null;
  return (
    <p className="mt-3 text-sm leading-relaxed">
      প্রশ্নগুলো ইংরেজিতেই থাকছে, যাতে শব্দ বদলে না যায়।
    </p>
  );
}

const MOOD_BN = ["", "ক্ষত", "নিচু", "ভারী", "মন খারাপ", "মেশানো", "ঠিক আছে", "স্থির", "পরিষ্কার", "হালকা", "উজ্জ্বল"];
const BODY_BN: Record<string, string> = {
  Tense: "টান",
  Tired: "ক্লান্ত",
  Restless: "অস্থির",
  Calm: "শান্ত",
  Heavy: "ভারী",
};
const CATEGORY_BN: Record<string, string> = {
  Breathing: "শ্বাস",
  Movement: "নড়াচড়া",
  Journaling: "জার্নাল",
  Grounding: "গ্রাউন্ডিং",
  Social: "মানুষের সঙ্গ",
  Cognitive: "ভাবনা",
  Creative: "সৃষ্টি",
};
const EQUIPPED_BN = ["", "প্রস্তুত নই", "অল্প", "কিছুটা", "অনেকটা", "প্রস্তুত"];
const FEELING_NOW_BN: Record<string, string> = {
  Raw: "ক্ষত",
  Heavy: "ভারী",
  Mixed: "মেশানো",
  Okay: "ঠিক আছে",
  Steady: "স্থির",
  Light: "হালকা",
};
const SWAP_BN: Record<string, string> = {
  Anxious: "উদ্বিগ্ন",
  Overwhelmed: "ভারাক্রান্ত",
  Numb: "অবশ",
  Restless: "অস্থির",
  "Just not this": "এটা নয়",
};
const SKIP_BN: Record<string, string> = {
  busy: "আমি ব্যস্ত ছিলাম",
  "didnt-feel": "ইচ্ছে করছিল না",
  "wasnt-well": "আমার অবস্থা ভালো ছিল না",
  "I was busy": "আমি ব্যস্ত ছিলাম",
  "I didn't feel like it": "ইচ্ছে করছিল না",
  "I wasn't doing well": "আমার অবস্থা ভালো ছিল না",
};
const RECOVERY_BN = [
  "আজ এমন কী ছিল, যা অল্প হলেও চলছিল?",
  "পরের সেশনের আগে কী মনে রাখতে চান?",
  "শরীরে এটা কোথায় টের পেয়েছেন, পেয়ে থাকলে?",
  "কালকের আরও ছোট একটা রূপ কেমন হত?",
];
const KIND_BN: Record<string, string> = {
  processing: "প্রসেসিং",
  reconnection: "আবার যোগ",
  daily: "প্রতিদিনের চর্চা",
};
const BAND_WORD_BN: Record<Band, string> = {
  steadier: "একটু স্থির",
  "some-strain": "কিছুটা চাপ",
  "heavier-week": "ভারী সপ্তাহ",
};

export function moodWord(index: number, lang: Language) {
  if (lang !== "bn") return MOOD_WORDS[index] ?? "";
  return MOOD_BN[index] ?? MOOD_WORDS[index] ?? "";
}

export function bodyWord(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return BODY_BN[value] ?? value;
}

export function categoryWord(value: Category | string, lang: Language) {
  if (lang !== "bn") return value;
  return CATEGORY_BN[value] ?? value;
}

export function equippedWord(index: number, lang: Language) {
  if (lang !== "bn") return EQUIPPED_WORDS[index] ?? "";
  return EQUIPPED_BN[index] ?? EQUIPPED_WORDS[index] ?? "";
}

export function feelingNowWord(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return FEELING_NOW_BN[value] ?? value;
}

export function swapWord(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return SWAP_BN[value] ?? value;
}

export function skipWord(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return SKIP_BN[value] ?? value;
}

export function feelingChoice(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return FEELING_BN[value] ?? value;
}

export function valueChoice(value: string, lang: Language) {
  if (lang !== "bn") return value;
  return VALUE_BN[value] ?? value;
}

export function recoveryPrompt(index: number, lang: Language) {
  if (lang !== "bn") return RECOVERY_PROMPTS[index] ?? "";
  return RECOVERY_BN[index] ?? RECOVERY_PROMPTS[index] ?? "";
}

export function shownPrompt(prompt: string | null, lang: Language) {
  if (!prompt || lang !== "bn") return prompt;
  const index = RECOVERY_PROMPTS.indexOf(prompt as (typeof RECOVERY_PROMPTS)[number]);
  if (index >= 0) return RECOVERY_BN[index];
  const task = TASK_BN_BY_NAME(prompt);
  return task ?? prompt;
}

function TASK_BN_BY_NAME(name: string) {
  const match = Object.keys(TASK_BN).find((id) => getTask(id).name === name);
  return match ? TASK_BN[match].name : null;
}

export function kindWord(kind: string, lang: Language) {
  if (lang !== "bn") {
    if (kind === "processing") return "Processing";
    if (kind === "reconnection") return "Reconnection";
    return "Daily practice";
  }
  return KIND_BN[kind] ?? kind;
}

export function localizeTask(task: TaskDef, lang: Language): TaskDef {
  if (lang !== "bn") return task;
  const copy = TASK_BN[task.id];
  if (!copy) return task;
  return {
    ...task,
    name: copy.name,
    summary: copy.summary,
    steps: task.steps.map((step, index) => ({
      ...step,
      title: copy.steps[index]?.title ?? step.title,
      body: copy.steps[index]?.body ?? step.body,
    })),
  };
}

export function minutesLabel(minutes: number, lang: Language) {
  if (lang !== "bn") return `${minutes} min`;
  return `${bnNum(minutes)} মিনিট`;
}

export function greet(name: string, lang: Language, d = new Date()) {
  if (lang !== "bn") return greeting(name, d);
  const hour = d.getHours();
  const part = hour < 12 ? "শুভ সকাল" : hour < 17 ? "শুভ বিকেল" : "শুভ সন্ধ্যা";
  const trimmed = name.trim();
  return trimmed ? `${part}, ${trimmed}` : part;
}

export function whenLabel(iso: string, lang: Language) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(lang === "bn" ? "bn-BD" : "en", {
    month: "short",
    day: "numeric",
  });
}

export function dayMark(iso: string, lang: Language) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(lang === "bn" ? "bn-BD" : "en", {
    weekday: "narrow",
  });
}

export function ago(iso: string, lang: Language, now = Date.now()) {
  const english = elapsed(iso, now);
  if (lang !== "bn") return english;
  return english.replace(" min", " মিনিট").replace(" hr", " ঘণ্টা").replace(" days", " দিন");
}

export function bandLine(band: Band, lang: Language) {
  if (lang !== "bn") return bandSentence(band);
  if (band === "steadier") return "এই উত্তরগুলো থেকে মনে হচ্ছে, এটা একটু স্থির একটা সময়।";
  if (band === "some-strain") return "এই উত্তরগুলো থেকে মনে হচ্ছে, কিছুটা চাপ আছে।";
  return "এই উত্তরগুলো থেকে মনে হচ্ছে, এ সপ্তাহটা একটু ভারী।";
}

export function bandWord(band: Band, lang: Language) {
  if (lang !== "bn") {
    if (band === "heavier-week") return "Heavier week";
    if (band === "some-strain") return "Some strain";
    return "Steadier";
  }
  return BAND_WORD_BN[band];
}

export function explainReason(code: string, text: string, lang: Language) {
  if (lang !== "bn") return text;
  if (code === "both") {
    return "গত কয়েকদিনের চেক-ইন নিচু দিকে ছিল, আর কয়েকটা কাজ সরিয়ে রাখা হয়েছিল, তাই এটা সহজ একটা গ্রাউন্ডিং।";
  }
  if (code === "low") return "গত কয়েকদিনের চেক-ইন নিচু দিকে ছিল, তাই এটা সহজ একটা গ্রাউন্ডিং।";
  if (code === "skips") return "সম্প্রতি কয়েকটা কাজ সরিয়ে রাখা হয়েছিল, তাই এটা সহজ একটা গ্রাউন্ডিং।";
  if (code === "friday") return "সপ্তাহের শেষ, তাই এটা হালকা, ঐচ্ছিক একটা কাজ।";
  if (code === "mood") return "আজকের চেক-ইন ভারী দিকে ছিল, তাই এটা শ্বাস আর গ্রাউন্ডিংয়েই থাকছে।";
  if (code === "diary") return "ডায়েরির একটা সাম্প্রতিক পাতা ভারী লেগেছে, তাই এটা গ্রাউন্ডিংয়েই থাকছে।";
  if (code === "fallback") return "আপনার বেছে নেওয়া ধরনগুলোতে প্রতিদিনের কোনো চর্চা মেলানি, তাই এটা একটা গ্রাউন্ডিং।";
  if (code === "category") {
    const match = text.match(/: (.+)\.$/);
    const category = match?.[1] ?? "";
    return `এটা আপনার বেছে নেওয়া একটি ধরনের সঙ্গে মিলে: ${categoryWord(category, lang)}।`;
  }
  if (code === "swap") {
    const withCategory = text.match(/^You asked for something different today\. This still sits with (.+)\.$/);
    if (withCategory) {
      return `আজ আপনি অন্য কিছু চেয়েছেন। এটা এখনও ${categoryWord(withCategory[1] ?? "", lang)}-এর মধ্যেই।`;
    }
    if (text === "You asked for something different today.") return "আজ আপনি অন্য কিছু চেয়েছেন।";
    const felt = text.match(/felt (.+)\.$/);
    if (felt) return `আজ আপনি অন্য কিছু চেয়েছেন, কারণ এটা ${swapWord(titleCase(felt[1] ?? ""), lang)} লাগছিল।`;
  }
  return text;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function crisisLineShown(line: string, lang: Language) {
  if (lang === "bn" && (line === KAAN_LINE || line.startsWith("Kaan Pete Roi"))) {
    return `কান পেতে রই — ${KAAN_NUMBER}`;
  }
  return line;
}

export function sentimentShown(line: string, lang: Language) {
  if (lang !== "bn") return line;
  if (line === "No recovery journal entries yet.") return "এখনও কোনো রিকভারি জার্নাল নেই।";
  if (line === "Hidden from therapist. No journal content is available.") {
    return "থেরাপিস্টের কাছ থেকে আড়াল। জার্নালের কোনো লেখা নেই।";
  }
  if (line === "Full recovery entries are shared. Personal writing is not included.") {
    return "রিকভারি জার্নালের পুরো লেখা শেয়ার করা আছে। ব্যক্তিগত লেখা এর মধ্যে নেই।";
  }
  const match = line.match(
    /^Recovery journal: (\d+) (entry|entries)\. Language reads (heavy|steady|mixed)\. Entry text is not shown\.$/,
  );
  if (!match) return line;
  const tone = match[3] === "heavy" ? "ভারী" : match[3] === "steady" ? "স্থির" : "মেশানো";
  return `রিকভারি জার্নাল: ${bnNum(match[1] ?? "")}টি লেখা। ভাষা ${tone}। লেখার বাক্য দেখানো হয়নি।`;
}

export function flagShown(note: string, lang: Language) {
  if (lang !== "bn") return note;
  if (note === SOFT_FLAG_NOTE) return "আপনার রোগীর শিগগির একটা চেক-ইন কাজে লাগতে পারে";
  return note;
}

export function alertSummary(summary: string, lang: Language) {
  if (lang !== "bn") return summary;
  if (summary === "Explicit safety phrase in the recovery journal.") {
    return "রিকভারি জার্নালে স্পষ্ট একটি নিরাপত্তার বাক্য।";
  }
  if (summary === "Patient agreed to a demo alert from the crisis screen.") {
    return "রোগী সংকটের পর্দা থেকে একটি ডেমো সতর্কতায় রাজি হয়েছেন।";
  }
  return summary;
}

export function accessShown(text: string, lang: Language) {
  if (lang !== "bn") return text;
  const match = text.match(/^(.*) opened your summary in this demo$/);
  if (match) return `${match[1]} এই ডেমোতে আপনার সারাংশ খুলেছেন।`;
  return text;
}

export function stageShown(stage: string, lang: Language) {
  if (lang !== "bn") return stage;
  return stage.replace(/^Stage (\d+)/, (_, n: string) => `ধাপ ${bnNum(n)}`);
}

export const BREATH_BN = ["শ্বাস নিন", "ধরে রাখুন", "শ্বাস ছাড়ুন", "ধরে রাখুন"];
