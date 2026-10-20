import type { Category, TaskKind } from "./types";

export type TaskStep = {
  title: string;
  body: string;
  capture?: "text" | "feelings" | "values" | "breath" | "belly";
};

export type TaskDef = {
  id: string;
  name: string;
  summary: string;
  minutes: number;
  categories: Category[];
  kind: TaskKind;
  lighter: boolean;
  steps: TaskStep[];
};

export const FEELING_CHOICES = [
  "Calm",
  "Sad",
  "Angry",
  "Afraid",
  "Ashamed",
  "Numb",
  "Lonely",
  "Guilty",
  "Hopeful",
  "Tired",
  "Relieved",
  "Confused",
];

export const VALUE_CHOICES = [
  "Care",
  "Honesty",
  "Rest",
  "Courage",
  "Family",
  "Learning",
  "Faith",
  "Play",
];

export const TASKS: TaskDef[] = [
  {
    id: "box",
    name: "Box breathing",
    summary: "A steady count of four, four times around.",
    minutes: 3,
    categories: ["Breathing", "Grounding"],
    kind: "daily",
    lighter: true,
    steps: [
      {
        title: "Settle",
        body: "Sit in a way that feels workable. Soften your jaw. You can keep your eyes open.",
      },
      {
        title: "Follow the count",
        body: "Breathe in for 4, hold for 4, breathe out for 4, hold for 4. Stop if you feel dizzy.",
        capture: "breath",
      },
      {
        title: "Leave it",
        body: "Let the next breath be ordinary. You do not have to feel different for this to count.",
      },
    ],
  },
  {
    id: "diaphragmatic",
    name: "Diaphragmatic breathing",
    summary: "A slower breath, with a longer way out.",
    minutes: 4,
    categories: ["Breathing"],
    kind: "daily",
    lighter: true,
    steps: [
      {
        title: "Hands",
        body: "If it feels okay, rest one hand on your belly and one on your chest. Either hand can stay in your lap.",
      },
      {
        title: "Longer out-breath",
        body: "Breathe in through your nose for 4. Breathe out for 6, quiet and unforced. Six rounds is enough.",
        capture: "belly",
      },
      {
        title: "Notice the chair",
        body: "Feel the surface under you. Let your hands drop when you are ready.",
      },
    ],
  },
  {
    id: "senses",
    name: "5-4-3-2-1",
    summary: "Name what is here, one sense at a time.",
    minutes: 4,
    categories: ["Grounding"],
    kind: "daily",
    lighter: true,
    steps: [
      {
        title: "Five things you see",
        body: "Look around and name five things in this room. Ordinary objects count. Say them quietly or in your head.",
      },
      {
        title: "Four things you feel",
        body: "Notice four points of contact: feet, chair, fabric, air on your skin. Skip anything that feels sharp.",
      },
      {
        title: "Three things you hear",
        body: "Listen for three sounds, near or far. Silence can be one of them.",
      },
      {
        title: "Two things you smell",
        body: "Name two scents, even if they are faint. If you smell nothing, name that.",
      },
      {
        title: "One thing you taste",
        body: "Notice one taste, or take a sip of water. Then look at one still object and rest there.",
      },
    ],
  },
  {
    id: "body-scan",
    name: "Body scan",
    summary: "Move attention through the body, and skip anywhere you need to.",
    minutes: 6,
    categories: ["Grounding"],
    kind: "daily",
    lighter: false,
    steps: [
      {
        title: "Feet",
        body: "Bring attention to your feet. You do not need to relax them. Just notice temperature or pressure.",
      },
      {
        title: "Legs",
        body: "Move up through calves and thighs. If a place feels like too much, leave it and go to the next.",
      },
      {
        title: "Back and belly",
        body: "Notice the back against the chair, then the belly. Breathe once without changing it.",
      },
      {
        title: "Hands and arms",
        body: "Feel the weight of your hands. Unclench only if that is easy.",
      },
      {
        title: "Shoulders and jaw",
        body: "Visit the shoulders, then the jaw. You can skip the face entirely.",
      },
      {
        title: "Whole of you",
        body: "Take in the body as one shape in the room. Open your eyes if they were closed.",
      },
    ],
  },
  {
    id: "sleep",
    name: "A short sleep routine",
    summary: "A small sequence for the edge of sleep. Not a treatment for insomnia.",
    minutes: 5,
    categories: ["Grounding"],
    kind: "daily",
    lighter: true,
    steps: [
      {
        title: "Dim the room in your mind",
        body: "If you can, lower one light. Picture the room getting quieter, not perfect.",
      },
      {
        title: "Unclench one place",
        body: "Choose jaw, hands, or belly. Let that one place be 10% softer. Leave the rest.",
      },
      {
        title: "Four easy breaths",
        body: "Four breaths, no count required. Longer out than in if that feels kind.",
      },
      {
        title: "A plain picture",
        body: "Think of a neutral place: a hallway, a field, a familiar ceiling. Stay with one detail.",
      },
      {
        title: "A stopping line",
        body: "Tell yourself you can stop reviewing the day. Tomorrow can hold what is unfinished.",
      },
    ],
  },
  {
    id: "safe-place",
    name: "Safe place",
    summary: "Build a place in your mind that feels steady enough.",
    minutes: 5,
    categories: ["Grounding", "Creative"],
    kind: "daily",
    lighter: false,
    steps: [
      {
        title: "Choose a place",
        body: "It can be real or imagined. A room, a bench, a shore. If nowhere feels safe, choose somewhere simply quiet.",
      },
      {
        title: "One sense",
        body: "Add one color, one sound, or one temperature. You do not need a full scene.",
      },
      {
        title: "A word",
        body: "Give the place a single word you could recall later. Keep it ordinary.",
        capture: "text",
      },
      {
        title: "A way out",
        body: "Decide how you leave the image: open your eyes, feel your feet, name the room you are actually in.",
      },
    ],
  },
  {
    id: "movement",
    name: "Gentle movement",
    summary: "A few slow movements. Stop at pain.",
    minutes: 4,
    categories: ["Movement"],
    kind: "daily",
    lighter: true,
    steps: [
      {
        title: "Shoulders",
        body: "Lift both shoulders toward your ears, then drop them. Twice is enough.",
      },
      {
        title: "Neck",
        body: "Turn your head a small amount to one side, then the other. Stay inside an easy range.",
      },
      {
        title: "Reach",
        body: "If standing feels okay, reach one arm up and then the other. Sitting and reaching forward counts too.",
      },
      {
        title: "Stillness",
        body: "Stand or sit still for three breaths. Notice the floor or the chair holding you.",
      },
    ],
  },
  {
    id: "emotion-naming",
    name: "Emotion naming",
    summary: "Give today up to three feeling words. Nothing more is required.",
    minutes: 5,
    categories: ["Cognitive", "Journaling"],
    kind: "processing",
    lighter: false,
    steps: [
      {
        title: "Pick up to three",
        body: "Choose the closest words. They do not have to be exact.",
        capture: "feelings",
      },
      {
        title: "One sentence, if you want",
        body: "You can add “This feeling is about…” and stop mid-sentence. Leaving it blank is fine.",
        capture: "text",
      },
    ],
  },
  {
    id: "trigger-note",
    name: "Trigger note",
    summary: "A few sentences about what set something off. Keep it small.",
    minutes: 6,
    categories: ["Journaling", "Cognitive"],
    kind: "processing",
    lighter: false,
    steps: [
      {
        title: "Keep this short",
        body: "Write what happened in one or two sentences. You do not need the whole story. Stop if it gets too large.",
        capture: "text",
      },
      {
        title: "Body and next step",
        body: "Optional: where you felt it, and one thing you did next. A single word is enough.",
        capture: "text",
      },
    ],
  },
  {
    id: "journal-prompt",
    name: "A short journal prompt",
    summary: "One thing you might want your therapist to know.",
    minutes: 5,
    categories: ["Journaling"],
    kind: "processing",
    lighter: false,
    steps: [
      {
        title: "The prompt",
        body: "What is one thing you want your therapist to know happened between sessions? A few lines is a full answer.",
        capture: "text",
      },
    ],
  },
  {
    id: "reach-out",
    name: "Reach out to one person",
    summary: "Draft a message to someone you trust. Nothing is sent.",
    minutes: 4,
    categories: ["Social"],
    kind: "reconnection",
    lighter: true,
    steps: [
      {
        title: "Choose the person",
        body: "Think of one person you feel completely safe contacting. You do not have to name them here.",
      },
      {
        title: "Draft",
        body: "Write a message you could send later. This stays on this device. Between does not send it.",
        capture: "text",
      },
    ],
  },
  {
    id: "time-together",
    name: "Time with someone safe",
    summary: "Plan a small amount of time with someone who feels safe.",
    minutes: 3,
    categories: ["Social"],
    kind: "reconnection",
    lighter: true,
    steps: [
      {
        title: "Who",
        body: "Name one person, or a kind of company, that feels safe enough. A pet or a quiet public place can count.",
        capture: "text",
      },
      {
        title: "How little",
        body: "Choose a small dose: ten minutes, a walk, a shared meal, sitting in the same room. Small is the point.",
      },
    ],
  },
  {
    id: "values",
    name: "A values prompt",
    summary: "One value, and one action small enough for this week.",
    minutes: 4,
    categories: ["Cognitive", "Creative"],
    kind: "reconnection",
    lighter: true,
    steps: [
      {
        title: "Pick a value",
        body: "Choose one word that you want this week to lean toward.",
        capture: "values",
      },
      {
        title: "One action",
        body: "Name one action that would be recognizably that value, and small enough to actually do.",
        capture: "text",
      },
    ],
  },
];

const BY_ID = new Map(TASKS.map((task) => [task.id, task]));

export function getTask(id: string) {
  return BY_ID.get(id) ?? TASKS[2];
}

export function taskKindLabel(kind: TaskKind) {
  if (kind === "processing") return "Processing";
  if (kind === "reconnection") return "Reconnection";
  return "Daily practice";
}
