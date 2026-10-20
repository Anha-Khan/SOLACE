"use client";

import { addDays, todayISO } from "@/lib/dates";
import type { MoodEntry } from "@/lib/types";

function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function WeekStrip({
  selected,
  onSelect,
  moods,
  weekStart,
  onWeekStart,
}: {
  selected: string;
  onSelect: (date: string) => void;
  moods: MoodEntry[];
  weekStart: string;
  onWeekStart: (date: string) => void;
}) {
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const formatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

  function handleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = days.indexOf(selected);
    if (event.key === "Home") return onSelect(days[0]);
    if (event.key === "End") return onSelect(days[6]);
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const next = addDays(selected, direction);
    if (!days.includes(next)) onWeekStart(addDays(weekStart, direction * 7));
    onSelect(next);
  }

  return (
    <section className="week-strip" aria-labelledby="week-heading">
      <div className="week-strip-head">
        <div>
          <p className="kicker">Your week</p>
          <h2 id="week-heading">{formatter.format(localDate(days[3]))}</h2>
        </div>
        <div className="week-arrows">
          <button type="button" onClick={() => { const next = addDays(weekStart, -7); onWeekStart(next); onSelect(addDays(next, 3)); }} aria-label="Previous week">←</button>
          <button type="button" onClick={() => { onWeekStart(addDays(today, -3)); onSelect(today); }}>Today</button>
          <button type="button" onClick={() => { const next = addDays(weekStart, 7); onWeekStart(next); onSelect(addDays(next, 3)); }} aria-label="Next week">→</button>
        </div>
      </div>
      <div className="week-days" role="radiogroup" aria-label="Choose a day" onKeyDown={handleKey}>
        {days.map((day) => {
          const date = localDate(day);
          const mood = moods.find((entry) => entry.date === day);
          const active = day === selected;
          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              className={`week-day ${active ? "is-selected" : ""} ${day === today ? "is-today" : ""}`}
              onClick={() => onSelect(day)}
            >
              <span className="week-day-name">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className="week-day-number">{date.getDate()}</span>
              <span className={`week-mood mood-${mood?.mood ?? 0}`} aria-label={mood ? "Check-in recorded" : "No check-in"} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
