"use client";

const TONES = ["raw", "low", "heavy", "down", "mixed", "okay", "steady", "clear", "light", "bright"] as const;

export function MoodFace({
  value,
  selected,
  label,
  onPick,
}: {
  value: number;
  selected: boolean;
  label: string;
  onPick: () => void;
}) {
  const tone = TONES[Math.min(Math.max(value, 1), 10) - 1];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${value}, ${label}`}
      onClick={onPick}
      className={`mood-face tone-${tone} ${selected ? "is-on" : ""}`}
    >
      <FaceMark tone={tone} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function FaceMark({ tone }: { tone: (typeof TONES)[number] | string }) {
  const heavy = tone === "raw" || tone === "low" || tone === "heavy" || tone === "down";
  const mixed = tone === "mixed" || tone === "okay";
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {heavy ? (
        <g className="face-eyes">
          <path d="M18 30c4 5 10 5 14 0" />
          <path d="M34 30c4 5 10 5 14 0" />
        </g>
      ) : mixed ? (
        <g className="face-eyes">
          <circle cx="24" cy="30" r="3.2" />
          <circle cx="42" cy="30" r="3.2" />
        </g>
      ) : (
        <g className="face-eyes">
          <path d="M16 32c4-6 10-6 14 0" />
          <path d="M34 32c4-6 10-6 14 0" />
        </g>
      )}
    </svg>
  );
}

export function lookForMood(value: number | null): "rest" | "low" | "bright" | "still" {
  if (!value) return "rest";
  if (value <= 4) return "low";
  if (value >= 8) return "bright";
  return "still";
}

export function lookForFeeling(word: string): "rest" | "low" | "bright" | "notice" {
  if (word === "Raw" || word === "Heavy") return "low";
  if (word === "Light" || word === "Steady") return "bright";
  return "notice";
}
