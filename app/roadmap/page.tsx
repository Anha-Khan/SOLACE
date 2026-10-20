"use client";

import { RequireProfile } from "@/components/patient-shell";
import { localizeTask, minutesLabel, useI18n } from "@/lib/i18n";
import { effectiveLevel, upcomingTasks } from "@/lib/select";
import { useStore } from "@/lib/store";

export default function RoadmapPage() {
  return (
    <RequireProfile>
      <Roadmap />
    </RequireProfile>
  );
}

function Roadmap() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const level = effectiveLevel(state);
  const locked = level === 2 || level === 3;
  const tasks = upcomingTasks(state);

  return (
    <div>
      <p className="kicker">{t("Ahead", "সামনে")}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">{t("Upcoming practices", "সামনের চর্চা")}</h1>
      <p className="mt-4 text-sm leading-relaxed">
        {t(
          "A short list of practices already in this app, in words. You can set one aside, or leave it.",
          "এই অ্যাপে যে চর্চাগুলো আছে, কথায় তাদের একটা ছোট তালিকা। একটা সরিয়ে রাখতে পারেন, বা রেখে দিতে পারেন।",
        )}
      </p>
      {locked ? (
        <p className="mt-4 text-sm leading-relaxed">
          {t("You can read this list. It can't be changed right now.", "এই তালিকা আপনি পড়তে পারেন। এখন এটা বদলানো যাবে না।")}
        </p>
      ) : null}
      <ul className="mt-8 space-y-5">
        {tasks.map((task) => {
          const aside = state.roadmapAside.includes(task.id);
          const shown = localizeTask(task, lang);
          return (
            <li key={task.id} className="border-t border-ink/10 pt-4">
              <h2 className="font-serif text-2xl leading-tight">{shown.name}</h2>
              <p className="mt-2 text-sm leading-relaxed">{shown.summary}</p>
              <p className="mt-1 text-sm text-muted">{minutesLabel(task.minutes, lang)}</p>
              {aside ? <p className="mt-2 text-sm">{t("Set aside.", "সরিয়ে রাখা।")}</p> : null}
              <button
                type="button"
                disabled={locked}
                onClick={() => dispatch({ type: "roadmap", taskId: task.id })}
                className="mt-3 min-h-11 border border-ink/20 px-3 text-sm disabled:opacity-40"
              >
                {aside ? t("Put it back", "ফিরিয়ে আনুন") : t("Set aside", "সরিয়ে রাখুন")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
