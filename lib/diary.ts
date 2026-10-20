import { todayISO } from "./dates";
import { hasCrisisPhrase } from "./scoring";
import type { DiaryLock, JournalEntry } from "./types";

const HEAVY = [
  "hopeless",
  "worthless",
  "numb",
  "empty",
  "ashamed",
  "panic",
  "terrified",
  "নিরাশ",
  "অসহায়",
  "ফাঁকা",
  "অবশ",
  "আতঙ্ক",
];

export function personalPages(journals: JournalEntry[]) {
  return journals
    .filter((entry) => entry.kind === "personal")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function bookLock(diaryLock: DiaryLock | null): DiaryLock | null {
  if (diaryLock?.method === "question" && diaryLock.question.trim() && diaryLock.answer.trim()) return diaryLock;
  if (diaryLock?.method === "code" && /^\d{4}$/.test(diaryLock.code)) return diaryLock;
  return null;
}

export function omitDiary<T extends { journals?: { kind?: string }[]; diaryLock?: DiaryLock | null }>(state: T): T {
  const next = { ...state };
  if (Array.isArray(state.journals)) {
    next.journals = state.journals.filter((entry) => entry?.kind !== "personal");
  }
  delete next.diaryLock;
  return next;
}

export function diaryFeltHeavy(journals: JournalEntry[], now = new Date()) {
  const today = todayISO(now);
  const text = personalPages(journals)
    .filter((entry) => entry.createdAt.slice(0, 10) === today)
    .map((entry) => entry.text.toLowerCase())
    .join("\n");
  if (!text.trim()) return false;
  if (hasCrisisPhrase(text)) return true;
  return HEAVY.some((word) => text.includes(word));
}
