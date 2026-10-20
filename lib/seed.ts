import { datesEndingDaysAgo, lastNDates, todayISO, uid } from "./dates";
import {
  type AppState,
  type Consent,
  type DemoAlert,
  type FixturePatient,
  type OnboardingDraft,
  type SafetyPlan,
  KAAN_LINE,
  SOFT_FLAG_NOTE,
} from "./types";

export const defaultConsent = (): Consent => ({
  moodAndTasks: true,
  journalStorage: false,
  aiAnalysis: false,
  crisisDetection: true,
  tier3Alert: true,
  therapistSharing: false,
});

export function emptyDraft(): OnboardingDraft {
  return {
    step: "intro",
    email: "",
    passwordSet: false,
    ageConfirmed: false,
    consents: defaultConsent(),
    pcEvent: null,
    pcptsd: Array.from({ length: 5 }, () => null),
    pcl5: Array.from({ length: 20 }, () => null),
    phq9: Array.from({ length: 9 }, () => null),
    gadOpt: null,
    gad7: Array.from({ length: 7 }, () => null),
    longerChoice: null,
    stopPhq: false,
    stopPcl: false,
    stopGad: false,
    equipped: null,
    firstName: "",
    categories: [],
    reminderTime: "09:00",
    therapistCode: "",
    showItem9: false,
    item9Ack: false,
  };
}

export function emptySafety(): SafetyPlan {
  return {
    helps: "",
    person1: "",
    person2: "",
    optOutAutoContact: true,
    crisisLine: "",
    crisisLineSaved: false,
    reason: "",
    saferPlace: "",
    shareWithTherapist: false,
  };
}

function moods(pattern: number[], daysAgoEnd = 0) {
  const dates =
    daysAgoEnd === 0 ? lastNDates(pattern.length) : datesEndingDaysAgo(daysAgoEnd, pattern.length);
  return dates.map((date, index) => ({ date, mood: pattern[index] ?? 5 }));
}

export function buildFixtures(): FixturePatient[] {
  const quietDates = datesEndingDaysAgo(12, 14);
  return [
    {
      id: "farzana",
      name: "Farzana Ahmed",
      stage: "Stage 1",
      group: "attention",
      moods: moods([5, 6, 5, 4, 5, 4, 3, 4, 5, 4, 3, 3, 2, 3]),
      tasksCompleted: 6,
      tasksOffered: 14,
      skipReasons: [
        { label: "I wasn't doing well", count: 2 },
        { label: "I was busy", count: 1 },
      ],
      journal: "progress",
      sentiment:
        "Recovery journal: 4 entries. Language reads heavy. Entry text is not shown.",
      entries: [],
      planShared: true,
      plan: {
        helps: "A glass of water and sitting on the floor.",
        person1: "Sister",
        person2: "",
        crisisLine: KAAN_LINE,
        saferPlace: "The room with the window.",
      },
      band: "heavier-week",
      scores: { pcl5: 36, phq9: 16, gad7: 11, equipped: 2, phq9Item9: 1 },
      lastActive: todayISO(),
    },
    {
      id: "rahim",
      name: "Rahim Uddin",
      stage: "Stage 1",
      group: "checkin",
      moods: moods([7, 7, 6, 7, 6, 6, 5, 5, 4, 5, 4, 4, 3, 4]),
      tasksCompleted: 8,
      tasksOffered: 14,
      skipReasons: [{ label: "I didn't feel like it", count: 2 }],
      journal: "hidden",
      sentiment: "Hidden from therapist. No journal content is available.",
      entries: [],
      planShared: false,
      plan: null,
      band: "some-strain",
      scores: { pcl5: 22, phq9: 9, gad7: null, equipped: 3, phq9Item9: 0 },
      lastActive: todayISO(),
    },
    {
      id: "laila",
      name: "Laila Karim",
      stage: "Stage 2",
      group: "progressing",
      moods: moods([6, 7, 6, 7, 8, 7, 6, 7, 7, 8, 7, 6, 7, 7]),
      tasksCompleted: 12,
      tasksOffered: 14,
      skipReasons: [{ label: "I was busy", count: 1 }],
      journal: "full",
      sentiment: "Full recovery entries are shared. Personal writing is not included.",
      entries: [
        {
          date: lastNDates(6)[1] ?? todayISO(),
          text: "Walked to the corner shop and came back. The evening was quieter than I expected.",
        },
        {
          date: lastNDates(3)[0] ?? todayISO(),
          text: "Told my sister I was tired. She sat with me for a while. I slept a little earlier.",
        },
      ],
      planShared: true,
      plan: {
        helps: "Stepping outside for two minutes.",
        person1: "Sister",
        person2: "Cousin",
        crisisLine: KAAN_LINE,
        saferPlace: "The courtyard.",
      },
      band: "steadier",
      scores: { pcl5: 14, phq9: 4, gad7: 3, equipped: 4, phq9Item9: 0 },
      lastActive: todayISO(),
    },
    {
      id: "imran",
      name: "Imran Hossain",
      stage: "Stage 1",
      group: "quiet",
      moods: quietDates.map((date, index) => ({
        date,
        mood: [5, 5, 4, 6, 5, 5, 4, 4, 5, 5, 4, 4, 5, 4][index] ?? 5,
      })),
      tasksCompleted: 3,
      tasksOffered: 14,
      skipReasons: [{ label: "I was busy", count: 2 }],
      journal: "progress",
      sentiment: "Recovery journal: 1 entry. Language reads mixed. Entry text is not shown.",
      entries: [],
      planShared: false,
      plan: null,
      band: "some-strain",
      scores: { pcl5: 24, phq9: 8, gad7: 6, equipped: 2, phq9Item9: 0 },
      lastActive: quietDates[quietDates.length - 1] ?? null,
    },
  ];
}

export function fixtureAlert(): DemoAlert {
  return {
    id: "alert-farzana",
    patientId: "farzana",
    source: "fixture",
    summary: "Explicit safety phrase in the recovery journal.",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    state: "detected",
    stateBeforeReview: null,
    reviewedAt: null,
    resolve: { spoke: false, safe: false, followUp: false },
    demoMinutes: null,
    closure: null,
  };
}

export function createDefault(): AppState {
  return {
    version: 1,
    language: "en",
    profile: {
      onboardingComplete: false,
      email: "",
      passwordSet: false,
      ageConfirmed: false,
      firstName: "",
      consents: defaultConsent(),
      categories: [],
      reminderTime: "09:00",
      band: null,
      scores: null,
      therapistConnected: false,
    },
    draft: emptyDraft(),
    moods: [],
    tasks: [],
    todayLock: null,
    swapDate: null,
    journals: [],
    privacy: "progress",
    previousPrivacy: null,
    crisisMonitoring: true,
    safety: emptySafety(),
    messages: [],
    accessLog: [],
    fontSize: "default",
    paused: false,
    restrictionPreview: 0,
    fridayPreview: false,
    alerts: [fixtureAlert()],
    softFlags: [],
    journalRequests: [],
    therapist: {
      entered: false,
      name: "",
      licence: "",
      region: "",
      dataAck: false,
      crisisAck: false,
      planAck: false,
      responseTime: "",
    },
    fixtures: buildFixtures(),
    keywordHandoff: false,
    tier2Date: null,
    tier2Choice: null,
    connection: "none",
    wrongPerson: false,
    harderHeld: true,
    serverBackup: false,
    pin: null,
    diaryLock: null,
    surveys: [],
    restrictionStart: null,
    invitePauseUntil: null,
    triedCategories: [],
    categoryHoldUntil: null,
    roadmapAside: [],
    shorterDoneOn: null,
    longerPass: "open",
  };
}

export function freshAlert(patientId: string, source: "keyword" | "tier2"): DemoAlert {
  return {
    id: uid(),
    patientId,
    source,
    summary:
      source === "keyword"
        ? "Explicit safety phrase in the recovery journal."
        : "Patient agreed to a demo alert from the crisis screen.",
    createdAt: new Date().toISOString(),
    state: "detected",
    stateBeforeReview: null,
    reviewedAt: null,
    resolve: { spoke: false, safe: false, followUp: false },
    demoMinutes: null,
    closure: null,
  };
}

export { SOFT_FLAG_NOTE };
