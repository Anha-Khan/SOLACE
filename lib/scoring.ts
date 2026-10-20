import type { Band, OnboardingDraft, Scores } from "./types";

export function sum(values: (number | null)[]) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function filled(values: (number | null)[]) {
  return values.length > 0 && values.every((value) => value !== null);
}

export function pcptsdScore(event: boolean | null, items: (number | null)[]) {
  if (event === false) return 0;
  if (event !== true || !filled(items)) return null;
  return items.reduce<number>((total, value) => total + (value === 1 ? 1 : 0), 0);
}

export function phq2Score(items: (number | null)[]) {
  if (items[0] === null || items[0] === undefined || items[1] === null || items[1] === undefined) return null;
  return items[0] + items[1];
}

export function phqRestDone(items: (number | null)[]) {
  return [2, 3, 4, 5, 6, 7].every((index) => items[index] !== null && items[index] !== undefined);
}

export function longerFinished(draft: Pick<OnboardingDraft, "phq9" | "pcl5" | "gadOpt" | "gad7">) {
  const phq = phqRestDone(draft.phq9) && draft.phq9[0] !== null && draft.phq9[1] !== null && draft.phq9[8] !== null;
  const pcl = filled(draft.pcl5);
  const gad = draft.gadOpt === false || (draft.gadOpt === true && filled(draft.gad7));
  return phq && pcl && gad;
}

type Level = 0 | 1 | 2;

export function bandFromDraft(
  draft: Pick<OnboardingDraft, "pcEvent" | "pcptsd" | "phq9" | "pcl5" | "gadOpt" | "gad7">,
): Band {
  const item9 = draft.phq9[8] ?? 0;
  const pc = pcptsdScore(draft.pcEvent, draft.pcptsd);
  const phq2 = phq2Score(draft.phq9);
  const pcHigh = pc !== null && pc >= 3;
  const phq2High = phq2 !== null && phq2 >= 3;
  const phqFull = phq2 !== null && draft.phq9[8] !== null && phqRestDone(draft.phq9);
  const pclFull = filled(draft.pcl5);
  const gadFull = draft.gadOpt === true && filled(draft.gad7);

  let trauma: Level = pcHigh ? 1 : 0;
  if (pclFull) {
    const total = sum(draft.pcl5);
    trauma = total >= 33 ? 2 : total >= 20 ? 1 : 0;
  }

  let mood: Level = phq2High ? 1 : 0;
  if (phqFull) {
    const total = sum(draft.phq9);
    mood = total >= 15 ? 2 : total >= 5 ? 1 : 0;
  }

  let worry: Level = 0;
  if (gadFull) {
    const total = sum(draft.gad7);
    worry = total >= 15 ? 2 : total >= 10 ? 1 : 0;
  }

  let level: Level = Math.max(trauma, mood, worry) as Level;
  if (item9 >= 2) level = 2;
  if (pcHigh && phq2High && !pclFull && !phqFull) level = 2;

  if (level >= 2) return "heavier-week";
  if (level === 1) return "some-strain";
  return "steadier";
}

export function scoresFromDraft(draft: OnboardingDraft): Scores {
  const phqFull = phq2Score(draft.phq9) !== null && draft.phq9[8] !== null && phqRestDone(draft.phq9);
  const pclFull = filled(draft.pcl5);
  const gadFull = draft.gadOpt === true && filled(draft.gad7);
  return {
    pcl5: pclFull ? sum(draft.pcl5) : null,
    phq9: phqFull ? sum(draft.phq9) : null,
    gad7: gadFull ? sum(draft.gad7) : null,
    equipped: draft.equipped,
    phq9Item9: draft.phq9[8] ?? 0,
    pcptsd5: pcptsdScore(draft.pcEvent, draft.pcptsd),
    phq2: phq2Score(draft.phq9),
  };
}

export function bandFromScores(scores: Pick<Scores, "pcl5" | "phq9" | "phq9Item9">): Band {
  const item9 = scores.phq9Item9 ?? 0;
  if (item9 >= 2) return "heavier-week";
  const heavy = (scores.phq9 !== null && scores.phq9 >= 15) || (scores.pcl5 !== null && scores.pcl5 >= 33);
  const strain = (scores.phq9 !== null && scores.phq9 >= 5) || (scores.pcl5 !== null && scores.pcl5 >= 20);
  if (heavy) return "heavier-week";
  if (strain) return "some-strain";
  return "steadier";
}

export function bandSentence(band: Band) {
  if (band === "steadier") return "From these answers, this looks like a steadier stretch.";
  if (band === "some-strain") return "From these answers, this looks like some strain.";
  return "From these answers, this looks like a heavier week.";
}

export function hasCrisisPhrase(text: string) {
  const normalized = text.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const explicitPhrases = [
    "kill myself",
    "want to die",
    "end my life",
    "মরতে চাই",
    "মরে যেতে চাই",
    "নিজেকে মেরে ফেলতে চাই",
    "জীবন শেষ করতে চাই",
  ];
  return explicitPhrases.some((phrase) => normalized.includes(phrase));
}

export function sentimentLine(texts: string[]) {
  if (texts.length === 0) return "No recovery journal entries yet.";
  const joined = texts.join(" ").toLowerCase();
  const heavy = ["hopeless", "worthless", "afraid", "panic", "empty", "numb", "ashamed"];
  const steady = ["okay", "calm", "better", "slept", "walk", "quiet", "safer"];
  const heavyHits = heavy.filter((word) => joined.includes(word)).length;
  const steadyHits = steady.filter((word) => joined.includes(word)).length;
  const tone =
    heavyHits > steadyHits ? "heavy" : steadyHits > heavyHits ? "steady" : "mixed";
  return `Recovery journal: ${texts.length} ${texts.length === 1 ? "entry" : "entries"}. Language reads ${tone}. Entry text is not shown.`;
}
