"use client";

import { useState } from "react";
import { EmotionCompanion } from "@/components/emotion-companion";
import { RequireProfile } from "@/components/patient-shell";
import { todayISO } from "@/lib/dates";
import { bodyWord, localizeTask, moodWord, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { getTask } from "@/lib/tasks";

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HistoryPage() {
  return <RequireProfile><History /></RequireProfile>;
}

function History() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(todayISO());
  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });
  const mood = state.moods.find((item) => item.date === selected);
  const task = state.tasks.find((item) => item.date === selected);
  const formatter = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en", { month: "long", year: "numeric" });
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString(lang === "bn" ? "bn-BD" : "en", { weekday: "long", month: "long", day: "numeric" });

  function moveMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(isoDate(next));
  }

  return (
    <div className="history-page">
      <header className="history-heading">
        <div><p className="kicker">{t("Your seasons", "আপনার সময়গুলো")}</p><h1>{t("Calendar & reflections", "ক্যালেন্ডার ও ভাবনা")}</h1><p>{t("A gentle record, not a score. Select any day to revisit what you noticed.", "কোনো নম্বর নয়, শুধু কোমল একটা রেকর্ড। যা খেয়াল করেছিলেন তা দেখতে যেকোনো দিন বেছে নিন।")}</p></div>
        <EmotionCompanion mood={mood?.mood ?? null} />
      </header>
      <div className="history-layout">
        <section className="calendar-card" aria-label={t("Check-in calendar", "চেক-ইন ক্যালেন্ডার")}>
          <div className="calendar-head"><button type="button" onClick={() => moveMonth(-1)} aria-label={t("Previous month", "আগের মাস")}>←</button><h2 aria-live="polite">{formatter.format(month)}</h2><button type="button" onClick={() => moveMonth(1)} aria-label={t("Next month", "পরের মাস")}>→</button></div>
          <div className="calendar-weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="calendar-empty" />;
              const iso = isoDate(date);
              const dayMood = state.moods.find((item) => item.date === iso);
              const hasTask = state.tasks.some((item) => item.date === iso);
              return <button key={iso} type="button" aria-pressed={selected === iso} aria-label={`${date.toLocaleDateString()}, ${dayMood ? t("check-in recorded", "চেক-ইন রাখা হয়েছে") : t("no check-in", "চেক-ইন নেই")}`} className={`calendar-day ${selected === iso ? "is-selected" : ""} ${iso === todayISO() ? "is-today" : ""}`} onClick={() => setSelected(iso)}><span>{date.getDate()}</span>{dayMood ? <i className={`calendar-mood mood-${dayMood.mood}`} /> : hasTask ? <i className="calendar-task" /> : null}</button>;
            })}
          </div>
          <p className="calendar-legend"><span /> {t("A colored leaf means you checked in.", "রঙিন পাতা মানে আপনি চেক-ইন করেছিলেন।")}</p>
        </section>
        <aside className="day-reflection" aria-live="polite">
          <p className="kicker">{selectedLabel}</p>
          {mood || task ? <><h2>{mood ? moodWord(mood.mood, lang) : t("A practice day", "চর্চার একটা দিন")}</h2>{mood ? <p>{bodyWord(mood.body, lang)} {t("in your body", "ছিল শরীরে")}</p> : null}{task ? <div className="reflection-note"><span>{t("Practice", "চর্চা")}</span><strong>{localizeTask(getTask(task.taskId), lang).name}</strong>{task.reflection?.notice ? <p>“{task.reflection.notice}”</p> : task.note ? <p>“{task.note}”</p> : null}</div> : null}</> : <div className="history-empty"><EmotionCompanion mood={null} /><h2>{t("Nothing recorded here yet.", "এখানে এখনও কিছু রাখা হয়নি।")}</h2><p>{t("That’s completely okay. This space will wait without keeping score.", "সেটাও একদম ঠিক আছে। এই জায়গা কোনো হিসাব না রেখে অপেক্ষা করবে।")}</p></div>}
        </aside>
      </div>
    </div>
  );
}
