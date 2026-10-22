"use client";

import { useEffect, useRef } from "react";

export type CompanionState = "rest" | "calm" | "low" | "joyful";

const EYES: Record<CompanionState, { left: string; right: string }> = {
  rest: { left: "M111 98c3-3 7-3 10 0", right: "M142 96c3-3 7-3 10 0" },
  calm: { left: "M111 98c3-3 7-3 10 0", right: "M142 96c3-3 7-3 10 0" },
  low: { left: "M111 100c3 2 7 2 10 0", right: "M142 98c3 2 7 2 10 0" },
  joyful: { left: "M110 98c3 3 8 3 11 0", right: "M141 96c3 3 8 3 11 0" },
};

const MOUTHS: Record<CompanionState, string> = {
  rest: "M128 113c4 3 8 3 12 0",
  calm: "M128 113c4 3 8 3 12 0",
  low: "M128 116c4-3 8-3 12 0",
  joyful: "M127 111c5 7 11 7 16 0",
};

/**
 * The original Between creature, re-skinned for the dark hero.
 * One emotional anchor for the whole page: it mirrors what the visitor just did.
 */
export function HeroCompanion({ state = "rest" }: { state?: CompanionState }) {
  const faceRef = useRef<SVGGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const eyes = EYES[state];

  // The eyes follow the pointer, relative to the creature rather than the viewport.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = wrapRef.current;
      const face = faceRef.current;
      if (!el || !face) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 1.5)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 1.5)));
      face.style.transform = `translate(${(dx * 6).toFixed(2)}px, ${(dy * 4).toFixed(2)}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={wrapRef} className={`fs-companion is-${state}`} aria-hidden="true">
      <svg viewBox="0 0 260 190" role="presentation">
        <path className="scene-ground" d="M27 154c49-21 157-22 207 1-40 23-164 24-207-1Z" />
        <path className="scene-stem" d="M38 142c2-27 9-52 22-73M48 110c-12-1-20-7-24-17M51 98c12-3 20-10 25-21" />
        <path className="scene-stem" d="M222 148c-1-25-7-44-18-61M214 117c10-2 18-8 22-17" />
        <path className="creature-tail" d="M166 113c28-10 41 3 34 18-5 11-20 8-21-2" />
        <path className="creature-body" d="M84 80c8-29 55-42 82-18 25 22 20 66-8 82-27 15-71 5-81-27-4-13-1-25 7-37Z" />
        <path className="creature-ear" d="M100 70 90 42c17 4 26 13 29 26M151 63l18-24c7 17 4 29-4 38" />
        <g className="creature-face" ref={faceRef}>
          <path d={eyes.left} />
          <path d={eyes.right} />
          <path d={MOUTHS[state]} />
        </g>
        <path className="scene-leaf leaf-one" d="M25 91c17-5 25 3 21 18-14 3-22-3-21-18Z" />
        <path className="scene-leaf leaf-two" d="M212 87c13-7 23-2 23 12-12 6-21 2-23-12Z" />
      </svg>
    </div>
  );
}
