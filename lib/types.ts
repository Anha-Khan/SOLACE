export type BodySignal = "Tense" | "Tired" | "Restless" | "Calm" | "Heavy";

export type Helped = "yes" | "a-little" | "not-really";

export type SkipReason = "busy" | "didnt-feel" | "wasnt-well";

export type SwapFeeling =
  | "Anxious"
  | "Overwhelmed"
  | "Numb"
  | "Restless"
  | "Just not this";

export type Privacy = "hidden" | "progress" | "full";

export type Band = "steadier" | "some-strain" | "heavier-week";

export type Category =
  | "Breathing"
  | "Movement"
  | "Journaling"
  | "Grounding"
  | "Social"
  | "Cognitive"
  | "Creative";

export type TaskKind = "daily" | "processing" | "reconnection";

export type Consent = {
  moodAndTasks: boolean;
  journalStorage: boolean;
  aiAnalysis: boolean;
  crisisDetection: boolean;
  tier3Alert: boolean;
  therapistSharing: boolean;
};

export type Scores = {
  pcl5: number | null;
  phq9: number | null;
  gad7: number | null;
  equipped: number | null;
  phq9Item9: number;
  pcptsd5?: number | null;
  phq2?: number | null;
};

export type LongerPass = "open" | "done" | "dismissed";

export type DiaryLock =
  | { method: "code"; code: string }
  | { method: "question"; question: string; answer: string };

export type Profile = {
  onboardingComplete: boolean;
  email: string;
  passwordSet: boolean;
  ageConfirmed: boolean;
  firstName: string;
  consents: Consent;
  categories: Category[];
  reminderTime: string;
  band: Band | null;
  scores: Scores | null;
  therapistConnected: boolean;
};

export type OnboardingDraft = {
  step: string;
  email: string;
  passwordSet: boolean;
  ageConfirmed: boolean;
  consents: Consent;
  pcEvent: boolean | null;
  pcptsd: (number | null)[];
  pcl5: (number | null)[];
  phq9: (number | null)[];
  gadOpt: boolean | null;
  gad7: (number | null)[];
  longerChoice: "start" | "more" | null;
  stopPhq: boolean;
  stopPcl: boolean;
  stopGad: boolean;
  equipped: number | null;
  firstName: string;
  categories: Category[];
  reminderTime: string;
  therapistCode: string;
  showItem9: boolean;
  item9Ack: boolean;
};

export type MoodEntry = {
  date: string;
  mood: number;
  body: BodySignal;
  at: string;
};

export type TaskReflection = {
  equipped: number | null;
  notice: string | null;
  skipped: boolean;
};

export type TaskRecord = {
  date: string;
  taskId: string;
  helped: Helped | null;
  skipped: boolean;
  skipReason: SkipReason | null;
  tooHard: boolean;
  swapFeeling: SwapFeeling | null;
  feelingNow: string | null;
  note: string | null;
  reflection: TaskReflection | null;
};

export type TodayLock = {
  date: string;
  taskId: string;
  reasonCode: string;
  reasonText: string;
};

export type JournalEntry = {
  id: string;
  kind: "recovery" | "personal";
  prompt: string | null;
  text: string;
  createdAt: string;
};

export type SafetyPlan = {
  helps: string;
  person1: string;
  person2: string;
  optOutAutoContact: boolean;
  crisisLine: string;
  crisisLineSaved: boolean;
  reason: string;
  saferPlace: string;
  shareWithTherapist: boolean;
};

export type Message = {
  id: string;
  from: "patient" | "therapist";
  text: string;
  createdAt: string;
};

export type AccessLogEntry = {
  id: string;
  text: string;
  at: string;
};

export type AlertState =
  | "detected"
  | "dispatched"
  | "delivered"
  | "acknowledged"
  | "resolved"
  | "patient-contacted"
  | "closed";

export type DemoAlert = {
  id: string;
  patientId: string;
  source: "keyword" | "tier2" | "fixture";
  summary: string;
  createdAt: string;
  state: AlertState;
  stateBeforeReview: AlertState | null;
  reviewedAt: string | null;
  resolve: { spoke: boolean; safe: boolean; followUp: boolean };
  demoMinutes: number | null;
  closure: "time-based" | null;
};

export type SurveyResult = {
  takenAt: string;
  scores: Scores;
  band: Band;
  kind?: "full" | "longer";
};

export type Connection = "none" | "pending" | "confirmed";

export type SoftFlag = {
  id: string;
  patientId: string;
  createdAt: string;
  note: string;
};

export type JournalRequest = {
  id: string;
  patientId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type ResponseTime = "a few hours" | "a day" | "2 days" | "";

export type TherapistProfile = {
  entered: boolean;
  name: string;
  licence: string;
  region: string;
  dataAck: boolean;
  crisisAck: boolean;
  planAck: boolean;
  responseTime: ResponseTime;
};

export type FixtureMood = { date: string; mood: number };

export type FixturePatient = {
  id: string;
  name: string;
  stage: "Stage 1" | "Stage 2";
  group: "attention" | "checkin" | "progressing" | "quiet";
  moods: FixtureMood[];
  tasksCompleted: number;
  tasksOffered: number;
  skipReasons: { label: string; count: number }[];
  journal: Privacy;
  sentiment: string;
  entries: { date: string; text: string }[];
  planShared: boolean;
  plan: {
    helps: string;
    person1: string;
    person2: string;
    crisisLine: string;
    saferPlace: string;
  } | null;
  band: Band;
  scores: Scores;
  lastActive: string | null;
};

export type Language = "en" | "bn";

export type AppState = {
  version: 1;
  language: Language;
  profile: Profile;
  draft: OnboardingDraft;
  moods: MoodEntry[];
  tasks: TaskRecord[];
  todayLock: TodayLock | null;
  swapDate: string | null;
  journals: JournalEntry[];
  privacy: Privacy;
  previousPrivacy: Privacy | null;
  crisisMonitoring: boolean;
  safety: SafetyPlan;
  messages: Message[];
  accessLog: AccessLogEntry[];
  fontSize: "default" | "large";
  paused: boolean;
  restrictionPreview: 0 | 1 | 2 | 3;
  fridayPreview: boolean;
  alerts: DemoAlert[];
  softFlags: SoftFlag[];
  journalRequests: JournalRequest[];
  therapist: TherapistProfile;
  fixtures: FixturePatient[];
  keywordHandoff: boolean;
  tier2Date: string | null;
  tier2Choice: "yes" | "no" | null;
  connection: Connection;
  wrongPerson: boolean;
  harderHeld: boolean;
  serverBackup: boolean;
  pin: string | null;
  diaryLock: DiaryLock | null;
  surveys: SurveyResult[];
  restrictionStart: string | null;
  invitePauseUntil: string | null;
  triedCategories: Category[];
  categoryHoldUntil: string | null;
  roadmapAside: string[];
  shorterDoneOn: string | null;
  longerPass: LongerPass;
};

export const MOOD_WORDS = [
  "",
  "Raw",
  "Low",
  "Heavy",
  "Down",
  "Mixed",
  "Okay",
  "Steady",
  "Clear",
  "Light",
  "Bright",
] as const;

export const BODY_SIGNALS: BodySignal[] = [
  "Tense",
  "Tired",
  "Restless",
  "Calm",
  "Heavy",
];

export const CATEGORIES: Category[] = [
  "Breathing",
  "Movement",
  "Journaling",
  "Grounding",
  "Social",
  "Cognitive",
  "Creative",
];

export const FEELING_NOW = [
  "Raw",
  "Heavy",
  "Mixed",
  "Okay",
  "Steady",
  "Light",
] as const;

export const EQUIPPED_WORDS = [
  "",
  "Not equipped",
  "Slightly",
  "Somewhat",
  "Mostly",
  "Equipped",
] as const;

export const KAAN_NUMBER = "+880 9612-119911";
export const KAAN_TEL = "tel:+8809612119911";
export const KAAN_HOURS = "Every day, 3:00 PM–3:00 AM, no holidays";
export const KAAN_VERIFIED = "Verified October 2026";
export const KAAN_LINE = `Kaan Pete Roi — ${KAAN_NUMBER}`;
export const EMERGENCY_TEL = "tel:999";

export const CRISIS_PHRASES = ["kill myself", "want to die", "end my life"];

export const RECOVERY_PROMPTS = [
  "What felt even slightly workable today?",
  "What do you want to remember before your next session?",
  "Where did your body feel this, if anywhere?",
  "What would a smaller version of tomorrow look like?",
];

export const THERAPIST_NAME = "Nadia Rahman";
export const THERAPIST_LICENCE = "Demo licence · Bangladesh";
export const DEMO_CODE = "DEMO";

export const COMPANION_LINE =
  "Between is a companion, not a replacement for your therapist.";

export const NO_DELETE_LINE =
  "This plan does not offer one-tap deletion. These notes can matter in a hard moment, so each field is cleared on its own.";

export const POINT_OF_CHOICE_HIDDEN =
  "Your therapist won't see this, but the app still scans for safety signals to protect you.";

export const SOFT_FLAG_NOTE =
  "your patient may benefit from a check-in soon";
