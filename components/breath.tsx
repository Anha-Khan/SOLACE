"use client";

import { useEffect, useState } from "react";
import { BREATH_BN, useI18n } from "@/lib/i18n";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

const PATTERNS = {
  box: {
    labels: ["Breathe in", "Hold", "Breathe out", "Hold"],
    seconds: [4, 4, 4, 4],
    open: [true, true, false, false],
  },
  belly: {
    labels: ["Breathe in", "Breathe out"],
    seconds: [4, 6],
    open: [true, false],
  },
} as const;

export function BreathCircle({ pattern = "box" }: { pattern?: "box" | "belly" }) {
  const { lang } = useI18n();
  const reduced = useReducedMotion();
  const spec = PATTERNS[pattern];
  const total = spec.seconds.reduce((sum, value) => sum + value, 0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => (value + 1) % total);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [total]);

  let cursor = elapsed;
  let index = 0;
  while (cursor >= spec.seconds[index]) {
    cursor -= spec.seconds[index];
    index += 1;
  }
  const count = spec.seconds[index] - cursor;
  const scale = reduced ? 1 : spec.open[index] ? 1 : 0.72;

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className="breath-orb grid h-44 w-44 place-items-center rounded-full border border-clay/50"
        style={{
          transform: `scale(${scale})`,
          transition: reduced ? "none" : `transform ${spec.seconds[index]}s linear`,
          background: "rgba(140, 63, 42, 0.06)",
        }}
        aria-hidden="true"
      />
      <p className="mt-6 font-serif text-3xl" aria-live="polite">
        {lang === "bn"
          ? spec.labels[index] === "Breathe in"
            ? BREATH_BN[0]
            : spec.labels[index] === "Breathe out"
              ? BREATH_BN[2]
              : BREATH_BN[1]
          : spec.labels[index]}
      </p>
      <p className="mt-1 text-sm text-muted">{count}</p>
    </div>
  );
}
