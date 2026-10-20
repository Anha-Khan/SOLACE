import { addDays, daysBetween, hashString, isFriday, todayISO } from "./dates";
import { diaryFeltHeavy } from "./diary";
import { getTask, TASKS, type TaskDef } from "./tasks";
import type { AppState, Category, SwapFeeling } from "./types";

export type LibraryMode = "full" | "stage1" | "breath-ground" | "none";

export function restrictionDays(state: AppState, now = new Date()) {
  if (state.restrictionPreview === 1) return 0;
  if (state.restrictionPreview === 2) return 14;
  if (state.restrictionPreview === 3) return 31;
  if (state.profile.band !== "heavier-week" || state.profile.therapistConnected) return null;
  const today = todayISO(now);
  const start = state.restrictionStart ?? today;
  let days = Math.max(0, daysBetween(start, today));
  if (state.invitePauseUntil) {
    const pauseStart = addDays(state.invitePauseUntil, -14);
    const overlapStart = pauseStart > start ? pauseStart : start;
    const overlapEnd = state.invitePauseUntil < today ? state.invitePauseUntil : today;
    const paused = daysBetween(overlapStart, overlapEnd);
    if (paused > 0) days -= paused;
  }
  return Math.max(0, days);
}

export function effectiveLevel(state: AppState, now = new Date()): 1 | 2 | 3 | null {
  if (state.restrictionPreview === 1 || state.restrictionPreview === 2 || state.restrictionPreview === 3) {
    return state.restrictionPreview;
  }
  const days = restrictionDays(state, now);
  if (days === null) return null;
  if (days < 14) return 1;
  if (days <= 30) return 2;
  return 3;
}

export function libraryMode(state: AppState): LibraryMode {
  const level = effectiveLevel(state);
  if (level === 3) return "none";
  if (level === 2) return "breath-ground";
  if (level === 1) return "stage1";
  if (!state.profile.therapistConnected || state.harderHeld) return "stage1";
  return "full";
}

function allowed(task: TaskDef, mode: LibraryMode) {
  if (mode === "none") return false;
  if (mode === "breath-ground") {
    return (
      task.kind === "daily" &&
      task.categories.some((category) => category === "Breathing" || category === "Grounding")
    );
  }
  if (mode === "stage1") return task.kind === "daily";
  return true;
}

function poolFor(state: AppState, mode: LibraryMode) {
  const selected = new Set(state.profile.categories);
  return TASKS.filter((task) => {
    if (!allowed(task, mode)) return false;
    if (selected.size === 0) return task.kind === "daily";
    return task.categories.some((category) => selected.has(category));
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export type TaskChoice = {
  task: TaskDef;
  reasonCode: string;
  reasonText: string;
};

export function selectTask(state: AppState, now = new Date()): TaskChoice {
  const date = todayISO(now);
  const mode = libraryMode(state);
  if (state.todayLock && state.todayLock.date === date && mode !== "none") {
    const locked = getTask(state.todayLock.taskId);
    if (allowed(locked, mode)) {
      return {
        task: locked,
        reasonCode: state.todayLock.reasonCode,
        reasonText: state.todayLock.reasonText,
      };
    }
  }

  const recentMoods = [...state.moods].sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
  const lowDays = recentMoods.length >= 3 && recentMoods.every((entry) => entry.mood <= 3);
  const recentTasks = [...state.tasks].sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
  const manySkips = recentTasks.filter((entry) => entry.skipped).length >= 3;

  if (diaryFeltHeavy(state.journals, now)) {
    return {
      task: getTask("senses"),
      reasonCode: "diary",
      reasonText: "A recent diary page felt heavy, so this stays with grounding.",
    };
  }

  if (lowDays || manySkips) {
    const reasonText =
      lowDays && manySkips
        ? "The last few check-ins were on the low side, and a few tasks were set aside, so this is a simpler grounding task."
        : lowDays
          ? "The last few check-ins were on the low side, so this is a simpler grounding task."
          : "A few recent tasks were set aside, so this is a simpler grounding task.";
    return {
      task: getTask("senses"),
      reasonCode: lowDays && manySkips ? "both" : lowDays ? "low" : "skips",
      reasonText,
    };
  }

  const friday = state.fridayPreview || isFriday(now);
  let pool = poolFor(state, mode === "none" ? "breath-ground" : mode);
  const checkins = new Set(state.moods.map((entry) => entry.date)).size;
  if (checkins >= 7) {
    const steadier = pool.filter((task) => !task.lighter);
    if (steadier.length > 0) pool = steadier;
  }

  if (friday && pool.length > 0) {
    const lighter = pool.filter((task) => task.lighter);
    const use = lighter.length > 0 ? lighter : pool;
    const task = use[hashString(`${date}:friday`) % use.length];
    return {
      task,
      reasonCode: "friday",
      reasonText: "It's the end of the week, so this is a lighter, optional task.",
    };
  }

  const todayMood = state.moods.find((entry) => entry.date === date);
  if (todayMood && todayMood.mood <= 4) {
    const gentle = pool.filter((task) =>
      task.categories.some((category) => category === "Grounding" || category === "Breathing"),
    );
    if (gentle.length > 0) {
      const task = gentle[hashString(`${date}:mood`) % gentle.length];
      return {
        task,
        reasonCode: "mood",
        reasonText: "Today's check-in leaned heavy, so this stays with breath and grounding.",
      };
    }
  }

  if (pool.length === 0) {
    return {
      task: getTask("senses"),
      reasonCode: "fallback",
      reasonText:
        "Nothing in your chosen categories fit a daily practice, so this is a grounding task.",
    };
  }

  let task = pool[hashString(date) % pool.length];
  if (categoryHeld(state, now) && isOutside(state, task)) {
    const inside = pool.filter((item) => !isOutside(state, item));
    task = inside[0] ?? task;
  }
  const category =
    task.categories.find((item) => state.profile.categories.includes(item)) ?? task.categories[0];
  return {
    task,
    reasonCode: "category",
    reasonText: `This matches a category you chose: ${category}.`,
  };
}

export function categoryHeld(state: AppState, now = new Date()) {
  return !!state.categoryHoldUntil && state.categoryHoldUntil > todayISO(now);
}

export function isOutside(state: AppState, task: TaskDef) {
  const chosen = new Set([...state.profile.categories, ...state.triedCategories]);
  if (chosen.size === 0) return false;
  return !task.categories.some((category) => chosen.has(category));
}

export function shorterTask(state: AppState, primaryId: string) {
  const mode = libraryMode(state);
  const candidates = TASKS.filter(
    (task) => allowed(task, mode === "none" ? "breath-ground" : mode) && task.id !== primaryId && task.minutes <= 4,
  );
  const chosen = candidates.filter((task) => !isOutside(state, task));
  const pool = (chosen.length > 0 ? chosen : candidates).sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id));
  return pool[0] ?? null;
}

export function upcomingTasks(state: AppState) {
  const mode = libraryMode(state);
  const list = TASKS.filter((task) => allowed(task, mode === "none" ? "breath-ground" : mode));
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

const SWAP_ORDER: Record<SwapFeeling, string[]> = {
  Anxious: ["box", "senses", "diaphragmatic"],
  Overwhelmed: ["safe-place", "diaphragmatic", "box"],
  Numb: ["body-scan", "senses", "movement"],
  Restless: ["movement", "diaphragmatic", "box"],
  "Just not this": [],
};

export function alternativeFor(state: AppState, feeling: SwapFeeling, currentId: string) {
  const mode = libraryMode(state);
  const usable = TASKS.filter((task) => allowed(task, mode === "none" ? "breath-ground" : mode));
  const ids = usable.map((task) => task.id);
  if (feeling === "Just not this") {
    const pool = poolFor(state, mode === "none" ? "breath-ground" : mode);
    const ordered = pool.length > 0 ? pool : usable;
    const index = ordered.findIndex((task) => task.id === currentId);
    const next = ordered[(index + 1) % ordered.length];
    return next ?? getTask("senses");
  }
  const preferred = SWAP_ORDER[feeling].find((id) => id !== currentId && ids.includes(id));
  if (preferred) return getTask(preferred);
  const fallback = usable.find((task) => task.id !== currentId);
  return fallback ?? getTask("senses");
}

export function swapReason(feeling: SwapFeeling, category?: Category) {
  if (feeling === "Just not this") {
    return category
      ? `You asked for something different today. This still sits with ${category}.`
      : "You asked for something different today.";
  }
  return `You asked for something different today, because it felt ${feeling.toLowerCase()}.`;
}

export function safetyProgress(state: AppState) {
  const plan = state.safety;
  const flags = [
    plan.helps.trim().length > 0,
    plan.person1.trim().length > 0 || plan.person2.trim().length > 0,
    plan.crisisLineSaved && plan.crisisLine.trim().length > 0,
    plan.reason.trim().length > 0,
    plan.saferPlace.trim().length > 0,
  ];
  return { done: flags.filter(Boolean).length, flags, active: flags[0] };
}

export function showFriday(state: AppState, now = new Date()) {
  return state.fridayPreview || isFriday(now);
}
