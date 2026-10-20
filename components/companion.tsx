"use client";

import { createContext, useContext } from "react";

export type CompanionLook = "rest" | "still" | "notice" | "low" | "bright";

const Pulse = createContext<() => void>(() => {});

export function useChoicePulse() {
  return useContext(Pulse);
}

export function ChoicePulse({
  onPulse,
  children,
}: {
  onPulse: () => void;
  children: React.ReactNode;
}) {
  return <Pulse.Provider value={onPulse}>{children}</Pulse.Provider>;
}

export function Companion({
  look = "rest",
  className = "",
}: {
  look?: CompanionLook;
  className?: string;
}) {
  return (
    <div className={`companion look-${look} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 140 120" width="120" height="104" role="img">
        <ellipse cx="70" cy="104" rx="28" ry="6" fill="#3f5c4a22" />
        <path
          className="companion-body"
          fill="#d7e7d6"
          d="M70 18c22 0 40 16 42 38 2 18-8 34-24 40-8 3-12 8-18 8s-10-5-18-8C36 90 24 74 26 56 28 34 48 18 70 18z"
        />
        <g className="eyes">
          <ellipse cx="54" cy="58" rx="7.2" ry="8.4" fill="#24312b" />
          <ellipse cx="86" cy="58" rx="7.2" ry="8.4" fill="#24312b" />
          <circle className="glint" cx="56.4" cy="55" r="2.1" fill="#fffaf3" />
          <circle className="glint" cx="88.4" cy="55" r="2.1" fill="#fffaf3" />
        </g>
      </svg>
    </div>
  );
}
