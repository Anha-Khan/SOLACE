"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addDays, todayISO, uid } from "./dates";
import { omitDiary } from "./diary";
import { normalizeDraft } from "./flow";
import { bandFromDraft, hasCrisisPhrase, longerFinished, scoresFromDraft } from "./scoring";
import {
  buildFixtures,
  createDefault,
  emptyDraft,
  freshAlert,
  fixtureAlert,
} from "./seed";
import type {
  AppState,
  Band,
  BodySignal,
  Category,
  DemoAlert,
  DiaryLock,
  JournalEntry,
  OnboardingDraft,
  Privacy,
  SafetyPlan,
  Scores,
  SwapFeeling,
  TaskRecord,
} from "./types";
import { COMPANION_LINE, SOFT_FLAG_NOTE, THERAPIST_NAME } from "./types";

const KEY = "between.v1";
const SAVED = "between.savedAt";

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "draft"; patch: Partial<OnboardingDraft> }
  | { type: "draft/answer"; key: "pcl5" | "phq9" | "gad7" | "pcptsd"; index: number; value: number }
  | { type: "under18" }
  | { type: "finish"; connect: boolean }
  | { type: "connect-demo" }
  | { type: "invite-demo" }
  | { type: "disconnect" }
  | { type: "wrong-person" }
  | { type: "retake"; scores: Scores; band: Band }
  | { type: "longer-commit" }
  | { type: "longer-dismiss" }
  | { type: "server-backup"; on: boolean }
  | { type: "pin"; pin: string | null }
  | { type: "diary-lock"; lock: DiaryLock }
  | { type: "try-category"; category: Category }
  | { type: "decline-category" }
  | { type: "roadmap"; taskId: string }
  | { type: "shorter-done" }
  | { type: "hold-harder"; held: boolean }
  | { type: "mood"; mood: number; body: BodySignal }
  | { type: "lock"; taskId: string; reasonCode: string; reasonText: string; swap?: SwapFeeling }
  | { type: "task"; patch: Partial<TaskRecord> & { taskId: string } }
  | { type: "journal"; entry: Omit<JournalEntry, "id" | "createdAt">; scan: boolean }
  | { type: "privacy"; value: Privacy }
  | { type: "monitoring"; on: boolean }
  | { type: "safety"; patch: Partial<SafetyPlan> }
  | { type: "tier2"; yes: boolean }
  | { type: "clear-handoff" }
  | { type: "message"; from: "patient" | "therapist"; text: string }
  | { type: "profile"; firstName?: string; reminderTime?: string; journalStorage?: boolean }
  | { type: "font"; size: "default" | "large" }
  | { type: "language"; language: "en" | "bn" }
  | { type: "pause"; on: boolean }
  | { type: "preview-level"; level: 0 | 1 | 2 | 3 }
  | { type: "preview-friday"; on: boolean }
  | { type: "therapist-enter" }
  | { type: "therapist-form"; patch: Partial<AppState["therapist"]> }
  | { type: "alert"; id: string; patch: Partial<DemoAlert> }
  | { type: "journal-request" }
  | { type: "journal-answer"; accept: boolean }
  | { type: "access"; text: string }
  | { type: "reset" };

function taskFor(state: AppState, date: string, taskId: string): TaskRecord {
  return (
    state.tasks.find((item) => item.date === date) ?? {
      date,
      taskId,
      helped: null,
      skipped: false,
      skipReason: null,
      tooHard: false,
      swapFeeling: null,
      feelingNow: null,
      note: null,
      reflection: null,
    }
  );
}

function upsertTask(state: AppState, record: TaskRecord): AppState {
  const tasks = state.tasks.some((item) => item.date === record.date)
    ? state.tasks.map((item) => (item.date === record.date ? record : item))
    : [...state.tasks, record];
  return { ...state, tasks };
}

function connectTherapist(state: AppState): AppState {
  if (state.profile.therapistConnected) return state;
  const already = state.accessLog.some((entry) => entry.id === "seed-access");
  const accessLog = already
    ? state.accessLog
    : [
        ...state.accessLog,
        {
          id: "seed-access",
          text: `${THERAPIST_NAME} viewed your weekly summary`,
          at: `${addDays(todayISO(), -3)}T09:00:00.000Z`,
        },
      ];
  return {
    ...state,
    connection: "confirmed",
    profile: { ...state.profile, therapistConnected: true },
    accessLog,
    privacy: state.profile.consents.therapistSharing ? state.privacy : "hidden",
  };
}

function inviteTherapist(state: AppState): AppState {
  if (state.profile.therapistConnected || state.connection === "pending") return state;
  return {
    ...state,
    connection: "pending",
    invitePauseUntil: addDays(todayISO(), 14),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "draft":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "draft/answer": {
      const next = [...state.draft[action.key]];
      next[action.index] = action.value;
      return { ...state, draft: { ...state.draft, [action.key]: next } };
    }
    case "under18":
      return { ...state, draft: emptyDraft(), profile: { ...state.profile, onboardingComplete: false } };
    case "finish": {
      const scores = scoresFromDraft(state.draft);
      const band = bandFromDraft(state.draft);
      let next: AppState = {
        ...state,
        profile: {
          ...state.profile,
          onboardingComplete: true,
          email: state.draft.email.trim(),
          passwordSet: state.draft.passwordSet,
          ageConfirmed: true,
          firstName: state.draft.firstName.trim(),
          consents: state.draft.consents,
          categories: state.draft.categories,
          reminderTime: state.draft.reminderTime || "09:00",
          band,
          scores,
          therapistConnected: false,
        },
        surveys: [...state.surveys, { takenAt: new Date().toISOString(), scores, band, kind: "full" as const }],
        longerPass: longerFinished(state.draft) ? "done" : "open",
        privacy: state.draft.consents.therapistSharing ? "progress" : "hidden",
        crisisMonitoring: true,
        restrictionStart:
          band === "heavier-week" && !action.connect ? (state.restrictionStart ?? todayISO()) : state.restrictionStart,
      };
      if (action.connect) next = connectTherapist(next);
      return next;
    }
    case "connect-demo":
      return connectTherapist(state);
    case "invite-demo":
      return inviteTherapist(state);
    case "disconnect":
      return {
        ...state,
        connection: "none",
        profile: { ...state.profile, therapistConnected: false },
        restrictionStart:
          state.profile.band === "heavier-week"
            ? (state.restrictionStart ?? todayISO())
            : state.restrictionStart,
      };
    case "wrong-person":
      return { ...state, wrongPerson: true };
    case "retake":
      return {
        ...state,
        surveys: [
          ...state.surveys,
          { takenAt: new Date().toISOString(), scores: action.scores, band: action.band, kind: "full" as const },
        ],
        profile: { ...state.profile, scores: action.scores, band: action.band },
        restrictionStart:
          action.band === "heavier-week" && !state.profile.therapistConnected
            ? (state.restrictionStart ?? todayISO())
            : state.restrictionStart,
      };
    case "longer-commit": {
      if (!state.profile.onboardingComplete) return state;
      const scores = scoresFromDraft(state.draft);
      const band = bandFromDraft(state.draft);
      const done = longerFinished(state.draft);
      const wasDone = state.longerPass === "done";
      return {
        ...state,
        longerPass: done ? "done" : state.longerPass === "dismissed" ? "dismissed" : "open",
        profile: { ...state.profile, scores, band },
        surveys:
          done && !wasDone
            ? [...state.surveys, { takenAt: new Date().toISOString(), scores, band, kind: "longer" as const }]
            : state.surveys,
        restrictionStart:
          band === "heavier-week" && !state.profile.therapistConnected
            ? (state.restrictionStart ?? todayISO())
            : state.restrictionStart,
      };
    }
    case "longer-dismiss":
      return { ...state, longerPass: "dismissed" };
    case "server-backup":
      return { ...state, serverBackup: action.on };
    case "pin":
      return { ...state, pin: action.pin };
    case "diary-lock":
      if (state.diaryLock) return state;
      return { ...state, diaryLock: action.lock };
    case "try-category":
      return {
        ...state,
        triedCategories: state.triedCategories.includes(action.category)
          ? state.triedCategories
          : [...state.triedCategories, action.category],
        categoryHoldUntil: null,
      };
    case "decline-category":
      return { ...state, categoryHoldUntil: addDays(todayISO(), 7), todayLock: null };
    case "roadmap": {
      const has = state.roadmapAside.includes(action.taskId);
      return {
        ...state,
        roadmapAside: has
          ? state.roadmapAside.filter((id) => id !== action.taskId)
          : [...state.roadmapAside, action.taskId],
      };
    }
    case "shorter-done":
      return { ...state, shorterDoneOn: todayISO() };
    case "hold-harder":
      return { ...state, harderHeld: action.held, todayLock: null };
    case "mood": {
      const date = todayISO();
      const entry = { date, mood: action.mood, body: action.body, at: new Date().toISOString() };
      const moods = state.moods.some((item) => item.date === date)
        ? state.moods.map((item) => (item.date === date ? entry : item))
        : [...state.moods, entry];
      return { ...state, moods };
    }
    case "lock": {
      const date = todayISO();
      let next = upsertTask(state, {
        ...taskFor(state, date, action.taskId),
        taskId: action.taskId,
        swapFeeling: action.swap ?? taskFor(state, date, action.taskId).swapFeeling,
      });
      next = {
        ...next,
        todayLock: {
          date,
          taskId: action.taskId,
          reasonCode: action.reasonCode,
          reasonText: action.reasonText,
        },
        swapDate: action.swap ? date : state.swapDate,
      };
      return next;
    }
    case "task": {
      const date = todayISO();
      const current = taskFor(state, date, action.patch.taskId);
      return upsertTask(state, { ...current, ...action.patch, date, taskId: action.patch.taskId });
    }
    case "journal": {
      const entry: JournalEntry = {
        ...action.entry,
        id: uid(),
        createdAt: new Date().toISOString(),
      };
      let next: AppState = { ...state, journals: [...state.journals, entry] };
      if (
        action.scan &&
        state.crisisMonitoring &&
        action.entry.kind === "recovery" &&
        hasCrisisPhrase(action.entry.text)
      ) {
        next = {
          ...next,
          keywordHandoff: true,
          alerts: [freshAlert("self", "keyword"), ...state.alerts],
        };
      }
      return next;
    }
    case "privacy": {
      if (!state.crisisMonitoring) return state;
      return { ...state, privacy: action.value, previousPrivacy: action.value };
    }
    case "monitoring": {
      if (action.on) {
        return {
          ...state,
          crisisMonitoring: true,
          privacy: state.previousPrivacy ?? "progress",
        };
      }
      return {
        ...state,
        crisisMonitoring: false,
        previousPrivacy: state.privacy,
        privacy: "full",
      };
    }
    case "safety":
      return { ...state, safety: { ...state.safety, ...action.patch } };
    case "tier2": {
      const date = todayISO();
      if (action.yes) {
        return {
          ...state,
          tier2Date: date,
          tier2Choice: "yes",
          alerts: [freshAlert("self", "tier2"), ...state.alerts],
        };
      }
      return {
        ...state,
        tier2Date: date,
        tier2Choice: "no",
        softFlags: [
          {
            id: uid(),
            patientId: "self",
            createdAt: new Date().toISOString(),
            note: SOFT_FLAG_NOTE,
          },
          ...state.softFlags,
        ],
      };
    }
    case "clear-handoff":
      return { ...state, keywordHandoff: false };
    case "message":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: uid(),
            from: action.from,
            text: action.text.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      };
    case "profile":
      return {
        ...state,
        profile: {
          ...state.profile,
          firstName: action.firstName ?? state.profile.firstName,
          reminderTime: action.reminderTime ?? state.profile.reminderTime,
          consents: {
            ...state.profile.consents,
            journalStorage: action.journalStorage ?? state.profile.consents.journalStorage,
          },
        },
      };
    case "font":
      return { ...state, fontSize: action.size };
    case "language":
      return { ...state, language: action.language };
    case "pause":
      return { ...state, paused: action.on };
    case "preview-level":
      return { ...state, restrictionPreview: action.level };
    case "preview-friday":
      return { ...state, fridayPreview: action.on, todayLock: null };
    case "therapist-enter":
      return { ...state, therapist: { ...state.therapist, entered: true } };
    case "therapist-form":
      return { ...state, therapist: { ...state.therapist, ...action.patch } };
    case "alert":
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.id ? { ...alert, ...action.patch } : alert,
        ),
      };
    case "journal-request": {
      const existing = state.journalRequests.find((item) => item.patientId === "self" && item.status === "pending");
      if (existing || state.privacy === "full") return state;
      return {
        ...state,
        journalRequests: [
          {
            id: uid(),
            patientId: "self",
            status: "pending",
            createdAt: new Date().toISOString(),
          },
          ...state.journalRequests,
        ],
      };
    }
    case "journal-answer": {
      const pending = state.journalRequests.find((item) => item.patientId === "self" && item.status === "pending");
      if (!pending) return state;
      return {
        ...state,
        privacy: action.accept ? "full" : state.privacy,
        previousPrivacy: action.accept ? "full" : state.previousPrivacy,
        journalRequests: state.journalRequests.map((item) =>
          item.id === pending.id
            ? { ...item, status: action.accept ? "accepted" : "declined" }
            : item,
        ),
      };
    }
    case "access":
      return {
        ...state,
        accessLog: [
          { id: uid(), text: action.text, at: new Date().toISOString() },
          ...state.accessLog,
        ],
      };
    case "reset":
      return { ...createDefault(), language: state.language };
    default:
      return state;
  }
}

function reviveAlert(alert: DemoAlert): DemoAlert {
  return {
    ...alert,
    demoMinutes: alert.demoMinutes ?? null,
    closure: alert.closure ?? null,
    resolve: alert.resolve ?? { spoke: false, safe: false, followUp: false },
  };
}

function normalizeDiaryLock(value: unknown): DiaryLock | null {
  if (!value || typeof value !== "object") return null;
  const lock = value as Partial<DiaryLock>;
  if (lock.method === "code" && typeof lock.code === "string" && /^\d{4}$/.test(lock.code)) {
    return { method: "code", code: lock.code };
  }
  if (
    lock.method === "question" &&
    typeof lock.question === "string" &&
    lock.question.trim() &&
    typeof lock.answer === "string" &&
    lock.answer.trim()
  ) {
    return { method: "question", question: lock.question.trim(), answer: lock.answer.trim() };
  }
  return null;
}

function revive(raw: unknown): AppState {
  const fresh = createDefault();
  if (!raw || typeof raw !== "object") return fresh;
  const saved = raw as Partial<AppState>;
  if (saved.version !== 1 || !saved.profile || !saved.draft) return fresh;
  const fixtureIds = new Set(["alert-farzana"]);
  const savedAlerts = Array.isArray(saved.alerts) ? saved.alerts : [];
  const farzana = reviveAlert(savedAlerts.find((alert) => alert.id === "alert-farzana") ?? fixtureAlert());
  const otherAlerts = savedAlerts.filter((alert) => !fixtureIds.has(alert.id)).map(reviveAlert);
  const profile = { ...fresh.profile, ...saved.profile };
  const draft = normalizeDraft({ ...fresh.draft, ...saved.draft }, !!profile.onboardingComplete);
  const longerPass =
    saved.longerPass === "open" || saved.longerPass === "done" || saved.longerPass === "dismissed"
      ? saved.longerPass
      : profile.onboardingComplete
        ? "done"
        : "open";
  const surveys =
    saved.surveys && saved.surveys.length > 0
      ? saved.surveys
      : profile.scores && profile.band
        ? [{ takenAt: new Date().toISOString(), scores: profile.scores, band: profile.band }]
        : [];
  return {
    ...fresh,
    ...saved,
    profile,
    draft,
    longerPass,
    safety: { ...fresh.safety, ...saved.safety },
    therapist: { ...fresh.therapist, ...saved.therapist },
    fixtures: buildFixtures(),
    alerts: [farzana, ...otherAlerts],
    moods: saved.moods ?? [],
    tasks: saved.tasks ?? [],
    journals: saved.journals ?? [],
    messages: saved.messages ?? [],
    accessLog: saved.accessLog ?? [],
    softFlags: saved.softFlags ?? [],
    journalRequests: saved.journalRequests ?? [],
    surveys,
    connection: saved.connection ?? (profile.therapistConnected ? "confirmed" : "none"),
    triedCategories: saved.triedCategories ?? [],
    roadmapAside: saved.roadmapAside ?? [],
    harderHeld: saved.harderHeld ?? true,
    serverBackup: saved.serverBackup ?? false,
    wrongPerson: saved.wrongPerson ?? false,
    pin: saved.pin ?? null,
    diaryLock: normalizeDiaryLock(saved.diaryLock),
    language: saved.language === "bn" ? "bn" : "en",
  };
}

type StoreValue = {
  state: AppState;
  ready: boolean;
  dispatch: (action: Action) => void;
};

const SERVER_STATE = createDefault();

function loadClient() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? revive(JSON.parse(raw)) : createDefault();
  } catch {
    return createDefault();
  }
}

const StoreContext = createContext<StoreValue | null>(null);

export async function wipeServerCopy() {
  try {
    await fetch("/api/record", { method: "DELETE" });
    localStorage.removeItem(SAVED);
  } catch {
    /* The browser copy is still removed by the caller. */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(SERVER_STATE);
  const [ready, setReady] = useState(false);
  const [syncReady, setSyncReady] = useState(false);
  const pulled = useRef(false);

  useEffect(() => {
    const loaded = loadClient();
    // Paint the server snapshot first, then read this browser's saved demo.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState((current) =>
      current.language === "bn" ? { ...loaded, language: "bn" } : loaded,
    );
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancel = false;
    fetch("/api/record")
      .then(async (res) => {
        if (!res.ok || cancel) return;
        const file = (await res.json()) as { savedAt?: string; state?: AppState };
        if (!file.state || cancel) return;
        setState((current) => {
          const stamp = localStorage.getItem(SAVED) || "";
          const remote = file.savedAt || "";
          const empty = !current.profile.onboardingComplete;
          if (empty || (current.serverBackup && remote > stamp)) {
            if (remote) localStorage.setItem(SAVED, remote);
            const revived = revive(file.state);
            const kept = current.journals.filter((entry) => entry.kind === "personal");
            return {
              ...revived,
              journals: [...revived.journals.filter((entry) => entry.kind !== "personal"), ...kept],
              diaryLock: current.diaryLock,
            };
          }
          return current;
        });
      })
      .catch(() => {
        /* Offline: the browser copy remains. */
      })
      .finally(() => {
        pulled.current = true;
        setSyncReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
    document.documentElement.dataset.font = state.fontSize;
    document.documentElement.lang = state.language;
    if (!syncReady || !state.serverBackup || !pulled.current) return;
    const handle = window.setTimeout(() => {
      fetch("/api/record", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(omitDiary(state)),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const file = (await res.json()) as { savedAt?: string };
          if (file.savedAt) localStorage.setItem(SAVED, file.savedAt);
        })
        .catch(() => {
          /* The next change will try again. */
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [ready, state, syncReady]);

  const dispatch = useCallback((action: Action) => {
    setState((current) => reducer(current, action));
  }, []);

  return <StoreContext.Provider value={{ state, ready, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store missing");
  return value;
}

export function pendingJournalRequest(state: AppState) {
  return state.journalRequests.find((item) => item.patientId === "self" && item.status === "pending") ?? null;
}

export function selfJournalStatus(state: AppState) {
  const latest = state.journalRequests.find((item) => item.patientId === "self" && item.status !== "pending");
  return latest?.status ?? null;
}

export { COMPANION_LINE };
