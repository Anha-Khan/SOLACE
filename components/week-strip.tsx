"use client";

import { addDays, todayISO } from "@/lib/dates";
import type { MoodEntry } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

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
  const { t, lang } = useI18n();
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const locale = lang === "bn" ? "bn-BD" : "en";
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });

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
          <p className="kicker">{t("Your week", "আপনার সপ্তাহ")}</p>
          <h2 id="week-heading">{formatter.format(localDate(days[3]))}</h2>
        </div>
        <div className="week-arrows">
          <button type="button" onClick={() => { const next = addDays(weekStart, -7); onWeekStart(next); onSelect(addDays(next, 3)); }} aria-label={t("Previous week", "আগের সপ্তাহ")}>←</button>
          <button type="button" onClick={() => { onWeekStart(addDays(today, -3)); onSelect(today); }}>{t("Today", "আজ")}</button>
          <button type="button" onClick={() => { const next = addDays(weekStart, 7); onWeekStart(next); onSelect(addDays(next, 3)); }} aria-label={t("Next week", "পরের সপ্তাহ")}>→</button>
        </div>
      </div>
      <div className="week-days" role="radiogroup" aria-label={t("Choose a day", "একটি দিন বেছে নিন")} onKeyDown={handleKey}>
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
              <span className="week-day-name">{date.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span className="week-day-number">{date.getDate()}</span>
              <span className={`week-mood mood-${mood?.mood ?? 0}`} aria-label={mood ? t("Check-in recorded", "চেক-ইন রাখা হয়েছে") : t("No check-in", "চেক-ইন নেই")} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
