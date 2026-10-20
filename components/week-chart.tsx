"use client";

import { addDays, todayISO } from "@/lib/dates";
import { dayMark, moodWord, useI18n } from "@/lib/i18n";
import type { MoodEntry, TaskRecord } from "@/lib/types";

export function WeekChart({
  moods,
  tasks,
}: {
  moods: MoodEntry[];
  tasks: TaskRecord[];
}) {
  const { t, lang } = useI18n();
  const days = Array.from({ length: 7 }, (_, index) => addDays(todayISO(), index - 6));

  return (
    <section>
      <h2 className="font-serif text-2xl">{t("This week", "এ সপ্তাহ")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t("A dot means a practice was finished.", "একটা ফোঁটা মানে একটা চর্চা শেষ হয়েছে।")}
      </p>
      {moods.length === 0 ? (
        <p className="mt-4 text-sm">{t("Your check-ins will gather here.", "আপনার চেক-ইন এখানে জমবে।")}</p>
      ) : (
        <div className="mt-5 flex items-end justify-between gap-2" aria-label="Mood this week">
          {days.map((day) => {
            const mood = moods.find((entry) => entry.date === day);
            const done = tasks.some((entry) => entry.date === day && entry.helped);
            const height = mood ? 12 + mood.mood * 8 : 8;
            return (
              <div key={day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-28 items-end">
                  <div
                    className={mood ? "w-3 rounded-full bg-sage" : "w-3 rounded-full bg-blush/70"}
                    style={{ height }}
                    title={mood ? moodWord(mood.mood, lang) : t("No check-in", "কোনো চেক-ইন নেই")}
                  />
                </div>
                <span
                  className={done ? "h-1.5 w-1.5 rounded-full bg-sage" : "h-1.5 w-1.5 rounded-full bg-transparent"}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-muted">{dayMark(day, lang)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
