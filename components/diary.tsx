"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { bookLock, personalPages } from "@/lib/diary";
import { useI18n } from "@/lib/i18n";
import { hasCrisisPhrase } from "@/lib/scoring";
import { useStore } from "@/lib/store";

const COVER =
  "This is your diary. The app may use what you write to understand how you are doing. The words are never shown to a person, including your therapist. They are not sent anywhere.";

const COVER_BN =
  "এটা আপনার ডায়েরি। আপনি যা লেখেন, অ্যাপ তা থেকে বুঝতে পারে আপনি কেমন আছেন। এই শব্দগুলো কোনো মানুষকে দেখানো হয় না, আপনার থেরাপিস্টকেও না। কোথাও পাঠানো হয় না।";

const SHUT = "It did not open.";
const SHUT_BN = "খোলেনি।";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function readMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function LockMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="3.5" y="8" width="11" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 8V5.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Diary() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const reduce = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const pages = personalPages(state.journals);
  const lock = bookLock(state.diaryLock);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [focus, setFocus] = useState<string>("cover");
  const [turn, setTurn] = useState<"forward" | "back" | null>(null);
  const [draft, setDraft] = useState("");
  const [shut, setShut] = useState(false);
  const savedPage = useRef(false);
  const writable = !state.paused;
  const lastId = pages[pages.length - 1]?.id ?? "";

  useEffect(() => {
    if (!turn) return;
    const id = window.setTimeout(() => setTurn(null), 700);
    return () => window.clearTimeout(id);
  }, [turn]);

  useEffect(() => {
    if (!savedPage.current || !lastId) return;
    savedPage.current = false;
    setFocus(lastId);
  }, [lastId]);

  function saveDraft() {
    const value = draft.trim();
    if (!value || !writable) return false;
    savedPage.current = true;
    dispatch({
      type: "journal",
      entry: { kind: "personal", prompt: null, text: value },
      scan: false,
    });
    setDraft("");
    if (hasCrisisPhrase(value)) {
      router.push("/crisis");
      return true;
    }
    return false;
  }

  function go(next: string, direction: "forward" | "back") {
    if (!unlocked) return;
    if (focus === "blank" && draft.trim()) {
      if (!reduce) setTurn(direction);
      const crisis = saveDraft();
      if (crisis || direction === "back") return;
    }
    if (!reduce) setTurn(direction);
    setFocus(next);
  }

  function closeBook() {
    if (focus === "blank" && draft.trim()) {
      const crisis = saveDraft();
      if (crisis) return;
    }
    setOpen(false);
    setUnlocked(false);
    setFocus("cover");
    setShut(false);
    setTurn(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setFocus("cover");
          setUnlocked(false);
          setShut(false);
        }}
        className="mt-8 block w-full text-left"
        aria-label={t("My journal, locked", "আমার জার্নাল, তালাবন্ধ")}
      >
        <span className="book-closed">
          <span className="book-spine" />
          <span className="book-pages" aria-hidden="true" />
          <span className="book-cover">
            <span className="font-serif text-3xl leading-none">{t("My journal", "আমার জার্নাল")}</span>
            <span className="flex items-center gap-2 text-sm text-ink">
              <LockMark />
              {t("Locked", "তালাবন্ধ")}
            </span>
          </span>
        </span>
      </button>
    );
  }

  const entry = pages.find((page) => page.id === focus) ?? null;
  const entryIndex = entry ? pages.findIndex((page) => page.id === entry.id) : -1;
  const onCover = focus === "cover";
  const onBlank = focus === "blank";
  const earlier = !unlocked
    ? null
    : onCover
      ? null
      : onBlank
        ? (pages[pages.length - 1]?.id ?? "cover")
        : entryIndex <= 0
          ? "cover"
          : pages[entryIndex - 1].id;
  const next = !unlocked ? null : onCover ? (pages[0]?.id ?? "blank") : onBlank ? null : (pages[entryIndex + 1]?.id ?? "blank");

  return (
    <section className="diary-stage mt-8" aria-label={t("My journal", "আমার জার্নাল")}>
      <div className="mb-3 flex justify-end">
        <button type="button" className="text-sm underline" onClick={closeBook}>
          {t("Close", "বন্ধ")}
        </button>
      </div>
      <div className="diary-book">
        <div
          key={focus}
          className={`diary-sheet relative min-h-[32rem] overflow-hidden rounded-[1.6rem] bg-[#fffaf3] ${
            turn === "forward" ? "diary-forward" : turn === "back" ? "diary-back" : ""
          }`}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("input, textarea, button, a, label, form")) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            if (x > rect.width * 0.64 && next) go(next, "forward");
            else if (x < rect.width * 0.22 && earlier) go(earlier, "back");
          }}
        >
          <span className="absolute inset-y-0 left-0 w-3 bg-sage" aria-hidden="true" />
          {onCover ? (
            <Cover
              unlocked={unlocked}
              locked={!!lock}
              method={lock?.method ?? null}
              question={lock?.method === "question" ? lock.question : ""}
              shut={shut}
              onChooseCode={(code) => {
                dispatch({ type: "diary-lock", lock: { method: "code", code } });
                setShut(false);
              }}
              onChooseQuestion={(question, answer) => {
                dispatch({ type: "diary-lock", lock: { method: "question", question, answer } });
                setShut(false);
              }}
              onTry={(value) => {
                const opened =
                  lock?.method === "code"
                    ? value === lock.code
                    : lock?.method === "question"
                      ? value.trim() === lock.answer
                      : false;
                if (opened) {
                  setUnlocked(true);
                  setShut(false);
                  return;
                }
                setShut(true);
              }}
            />
          ) : (
            <article className="diary-leaf">
              <p className="diary-date">{pageDate(entry?.createdAt ?? new Date().toISOString(), lang)}</p>
              {entry ? <p className="diary-prose whitespace-pre-wrap">{entry.text}</p> : null}
              {onBlank && writable ? (
                <textarea
                  id="diary-page"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-label={t("Diary page", "ডায়েরির পাতা")}
                  className="diary-prose min-h-80 w-full flex-1 resize-none border-0 bg-transparent p-0 outline-none"
                />
              ) : null}
            </article>
          )}
          {earlier ? (
            <button
              type="button"
              className="diary-edge diary-edge-back"
              aria-label={t("Turn back", "পিছনের পাতা")}
              onClick={() => go(earlier, "back")}
            />
          ) : null}
          {next ? (
            <button
              type="button"
              className="diary-edge diary-edge-forward"
              aria-label={t("Turn forward", "সামনের পাতা")}
              onClick={() => go(next, "forward")}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Cover({
  unlocked,
  locked,
  method,
  question,
  shut,
  onChooseCode,
  onChooseQuestion,
  onTry,
}: {
  unlocked: boolean;
  locked: boolean;
  method: "code" | "question" | null;
  question: string;
  shut: boolean;
  onChooseCode: (code: string) => void;
  onChooseQuestion: (question: string, answer: string) => void;
  onTry: (value: string) => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<"code" | "question" | null>(null);
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState("");
  const [attempt, setAttempt] = useState("");

  return (
    <div className="py-8 pl-8 pr-6">
      <p className="font-serif text-3xl">{t("My journal", "আমার জার্নাল")}</p>
      <p className="mt-6 font-serif text-2xl leading-snug">{t(COVER, COVER_BN)}</p>
      {!unlocked && locked && method === "code" ? (
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            onTry(attempt);
            setAttempt("");
          }}
        >
          <label className="block text-sm" htmlFor="diary-code">
            {t("Code", "কোড")}
            <input
              id="diary-code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={attempt}
              onChange={(event) => setAttempt(event.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-1 w-32 border-b border-ink/30 bg-transparent py-2 tracking-[0.4em]"
            />
          </label>
          {shut ? <p className="mt-3 text-sm">{t(SHUT, SHUT_BN)}</p> : null}
          <button type="submit" className="round-next mt-5" disabled={attempt.length !== 4}>
            {t("Open", "খুলুন")}
          </button>
        </form>
      ) : null}
      {!unlocked && locked && method === "question" ? (
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            onTry(attempt);
            setAttempt("");
          }}
        >
          <p className="text-lg leading-snug">{question}</p>
          <label className="mt-4 block text-sm" htmlFor="diary-answer">
            {t("Answer", "উত্তর")}
            <input
              id="diary-answer"
              autoComplete="off"
              value={attempt}
              onChange={(event) => setAttempt(event.target.value)}
              className="mt-1 w-full border-b border-ink/30 bg-transparent py-2"
            />
          </label>
          {shut ? <p className="mt-3 text-sm">{t(SHUT, SHUT_BN)}</p> : null}
          <button type="submit" className="round-next mt-5" disabled={!attempt.trim()}>
            {t("Open", "খুলুন")}
          </button>
        </form>
      ) : null}
      {!unlocked && !locked ? (
        <div className="mt-8">
          {choice === null ? (
            <div className="grid gap-3">
              <button type="button" className="soft-choice" onClick={() => setChoice("code")}>
                {t("A 4-digit code", "৪ সংখ্যার কোড")}
              </button>
              <button type="button" className="soft-choice" onClick={() => setChoice("question")}>
                {t("A secret question", "একটা গোপন প্রশ্ন")}
              </button>
            </div>
          ) : null}
          {choice === "code" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (code.length === 4 && code === again) onChooseCode(code);
              }}
            >
              <label className="block text-sm" htmlFor="diary-code-new">
                {t("Code", "কোড")}
                <input
                  id="diary-code-new"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 w-32 border-b border-ink/30 bg-transparent py-2 tracking-[0.4em]"
                />
              </label>
              <label className="mt-4 block text-sm" htmlFor="diary-code-again">
                {t("Again", "আবার")}
                <input
                  id="diary-code-again"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={again}
                  onChange={(event) => setAgain(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 w-32 border-b border-ink/30 bg-transparent py-2 tracking-[0.4em]"
                />
              </label>
              <button type="submit" className="round-next mt-5" disabled={code.length !== 4 || code !== again}>
                {t("Open", "খুলুন")}
              </button>
              <button type="button" className="mt-4 block text-sm underline" onClick={() => setChoice("question")}>
                {t("Use a secret question instead", "বরং একটা গোপন প্রশ্ন")}
              </button>
            </form>
          ) : null}
          {choice === "question" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (ask.trim() && answer.trim()) onChooseQuestion(ask.trim(), answer.trim());
              }}
            >
              <label className="block text-sm" htmlFor="diary-question">
                {t("Question", "প্রশ্ন")}
                <input
                  id="diary-question"
                  value={ask}
                  onChange={(event) => setAsk(event.target.value)}
                  className="mt-1 w-full border-b border-ink/30 bg-transparent py-2"
                />
              </label>
              <label className="mt-4 block text-sm" htmlFor="diary-secret">
                {t("Answer", "উত্তর")}
                <input
                  id="diary-secret"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  className="mt-1 w-full border-b border-ink/30 bg-transparent py-2"
                />
              </label>
              <button type="submit" className="round-next mt-5" disabled={!ask.trim() || !answer.trim()}>
                {t("Open", "খুলুন")}
              </button>
              <button type="button" className="mt-4 block text-sm underline" onClick={() => setChoice("code")}>
                {t("Use a 4-digit code instead", "বরং ৪ সংখ্যার কোড")}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function pageDate(iso: string, lang: "en" | "bn") {
  const [date] = iso.split("T");
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).toLocaleDateString(lang === "bn" ? "bn-BD" : "en", {
    day: "numeric",
    month: "short",
  });
}
