"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RequireProfile } from "@/components/patient-shell";
import { addDays, todayISO } from "@/lib/dates";
import { accessShown, LanguageSwitch, useI18n, whenLabel } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { COMPANION_LINE, THERAPIST_NAME, type Privacy } from "@/lib/types";

export default function SettingsPage() {
  return (
    <RequireProfile>
      <Settings />
    </RequireProfile>
  );
}

function Settings() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(state.profile.firstName);
  const [time, setTime] = useState(state.profile.reminderTime);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [pinError, setPinError] = useState("");
  const fullSurvey = [...state.surveys].reverse().find((item) => item.kind !== "longer");
  const retakeOn = fullSurvey ? addDays(fullSurvey.takenAt.slice(0, 10), 14) : todayISO();
  const retakeLocked = !!fullSurvey && retakeOn > todayISO();

  function download() {
    const payload = {
      note: t("Demo export from this browser. Not a medical record.", "এই ব্রাউজার থেকে ডেমো রপ্তানি। এটা মেডিকেল রেকর্ড নয়।"),
      exportedAt: new Date().toISOString(),
      state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "between-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const privacyOptions: { id: Privacy; label: string }[] = [
    { id: "hidden", label: t("Hidden from therapist", "থেরাপিস্টের কাছ থেকে আড়াল") },
    { id: "progress", label: t("Let my therapist see progress", "থেরাপিস্ট অগ্রগতি দেখুন") },
    { id: "full", label: t("Full access", "পুরো পড়া") },
  ];

  return (
    <div>
      <p className="kicker">{t("Settings", "সেটিংস")}</p>
      <h1 className="mt-2 font-serif text-4xl">{t("Your setup", "আপনার সেটআপ")}</h1>
      <div className="mt-4">
        <LanguageSwitch />
      </div>
      <p className="mt-4 text-sm leading-relaxed">
        {t(COMPANION_LINE, "Between একজন সঙ্গী, আপনার থেরাপিস্টের বদলি নয়।")}
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">{t("Profile", "প্রোফাইল")}</h2>
        <p className="mt-2 text-sm text-muted">{state.profile.email}</p>
        <label className="mt-4 block text-sm" htmlFor="name">
          {t("First name", "নামের প্রথম অংশ")}
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full border-b border-ink/30 py-2"
          />
        </label>
        <label className="mt-4 block text-sm" htmlFor="time">
          {t("Reminder time", "মনে করিয়ে দেওয়ার সময়")}
          <input
            id="time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="mt-2 block border border-ink/20 px-3 py-2"
          />
        </label>
        <button
          type="button"
          className="mt-4 min-h-11 border border-ink px-4 text-sm"
          onClick={() => dispatch({ type: "profile", firstName: name, reminderTime: time })}
        >
          {t("Save profile", "প্রোফাইল রাখুন")}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Privacy", "গোপনীয়তা")}</h2>
        <fieldset className="mt-3" disabled={!state.crisisMonitoring}>
          <legend className="text-sm">{t("Recovery journal", "রিকভারি জার্নাল")}</legend>
          {privacyOptions.map((option) => (
            <label key={option.id} className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="settings-privacy"
                checked={state.privacy === option.id}
                onChange={() => dispatch({ type: "privacy", value: option.id })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.profile.consents.journalStorage}
            onChange={(event) => dispatch({ type: "profile", journalStorage: event.target.checked })}
          />
          {t("Keep recovery journal entries on this device", "রিকভারি জার্নাল এই ডিভাইসে রাখুন")}
        </label>
        <Link href="/safety-plan" className="mt-4 inline-block text-sm underline">
          {t("Safety plan", "নিরাপত্তা পরিকল্পনা")}
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Crisis monitoring", "সংকট নজরদারি")}</h2>
        <button
          type="button"
          className="mt-3 min-h-11 border border-ink px-4 text-sm"
          onClick={() => dispatch({ type: "monitoring", on: !state.crisisMonitoring })}
        >
          {state.crisisMonitoring ? t("Turn monitoring off", "নজরদারি বন্ধ করুন") : t("Turn monitoring on", "নজরদারি চালু করুন")}
        </button>
        {!state.crisisMonitoring ? (
          <p className="mt-3 text-sm leading-relaxed">
            {t(
              "Crisis monitoring is off. Entries are not scanned. Your therapist can see recovery journal entries while monitoring is off. Monitoring and limited sharing cannot both be off.",
              "সংকট নজরদারি বন্ধ। লেখা স্ক্যান হয় না। নজরদারি বন্ধ থাকলে থেরাপিস্ট রিকভারি জার্নাল দেখতে পারেন। নজরদারি আর সীমিত শেয়ার দুটোই বন্ধ থাকতে পারে না।",
            )}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed">
            {t(
              "Recovery journal entries are checked on this device for a few explicit phrases. Nothing is sent.",
              "রিকভারি জার্নাল এই ডিভাইসে কয়েকটি স্পষ্ট বাক্যের জন্য দেখা হয়। কিছুই পাঠানো হয় না।",
            )}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Access log", "প্রবেশের লগ")}</h2>
        {state.profile.therapistConnected ? (
          <ul className="mt-3 space-y-3">
            {state.accessLog.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="block text-muted">{entry.at.slice(0, 10) ? whenLabel(entry.at.slice(0, 10), lang) : ""}</span>
                {accessShown(entry.text, lang)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">
            {t("An access log appears here when a therapist is connected.", "থেরাপিস্ট যুক্ত হলে প্রবেশের লগ এখানে আসে।")}
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Reading size", "পড়ার আকার")}</h2>
        <div className="mt-3 flex gap-2">
          {(["default", "large"] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={state.fontSize === size}
              onClick={() => dispatch({ type: "font", size })}
              className={`min-h-11 border px-4 text-sm ${state.fontSize === size ? "border-ink bg-ink text-paper" : "border-ink/20"}`}
            >
              {size === "default" ? t("Default", "সাধারণ") : t("Large", "বড়")}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Pause", "বিরতি")}</h2>
        <p className="mt-2 text-sm leading-relaxed">
          {t(
            "Pause processing and the app becomes read-only for writing. Check-in, grounding, and crisis help stay available.",
            "প্রসেসিং থামালে লেখা শুধু পড়া যায়। চেক-ইন, গ্রাউন্ডিং, আর সংকটের সাহায্য খোলা থাকে।",
          )}
        </p>
        <button
          type="button"
          className="mt-3 min-h-11 border border-ink px-4 text-sm"
          onClick={() => dispatch({ type: "pause", on: !state.paused })}
        >
          {state.paused ? t("Resume", "আবার চালু") : t("Pause processing", "প্রসেসিং থামান")}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Questions", "প্রশ্ন")}</h2>
        {state.longerPass === "open" ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed">
              {t(
                "A few more questions are still open. This first pass does not ask you to wait.",
                "আর কয়েকটা প্রশ্ন এখনও খোলা। এই প্রথমবারের জন্য অপেক্ষা করতে হয় না।",
              )}
            </p>
            <Link href="/settings/more" className="mt-3 inline-block text-sm underline">
              {t("Answer a few more", "আর কয়েকটা উত্তর দিন")}
            </Link>
            <button
              type="button"
              className="mt-3 block min-h-11 text-sm underline"
              onClick={() => dispatch({ type: "longer-dismiss" })}
            >
              {t("Dismiss these questions", "এই প্রশ্নগুলো বাদ দিন")}
            </button>
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed">
          {t("A retake adds a result. It does not erase the first one.", "আবার নিলে একটা ফল যোগ হয়। প্রথমটা মুছে যায় না।")}
        </p>
        {retakeLocked ? (
          <p className="mt-3 text-sm">
            {t("You can retake these questions on", "এই প্রশ্ন আবার নিতে পারবেন")} {whenLabel(retakeOn, lang)}.
          </p>
        ) : (
          <Link href="/settings/retake" className="mt-3 inline-block text-sm underline">
            {t("Retake the questions", "প্রশ্ন আবার নিন")}
          </Link>
        )}
        <Link href="/roadmap" className="mt-3 block text-sm underline">
          {t("Upcoming practices", "সামনের চর্চা")}
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Therapist", "থেরাপিস্ট")}</h2>
        {state.connection === "confirmed" ? (
          <p className="mt-2 text-sm">
            {THERAPIST_NAME} {t("is confirmed.", "নিশ্চিত।")}
          </p>
        ) : state.connection === "pending" ? (
          <p className="mt-2 text-sm">
            {t("Invite waiting. Confirm", "আমন্ত্রণ অপেক্ষায়। নিশ্চিত করুন")} {THERAPIST_NAME}{" "}
            {t("on Today before any check-in is shared.", "আজকের পাতায়, কোনো চেক-ইন শেয়ার হওয়ার আগে।")}
          </p>
        ) : (
          <p className="mt-2 text-sm">
            {t("No therapist is connected. One therapist at a time.", "কোনো থেরাপিস্ট যুক্ত নেই। এক সময়ে একজন।")}
          </p>
        )}
        {state.connection !== "none" ? (
          <button type="button" className="mt-3 min-h-11 border border-ink px-4 text-sm" onClick={() => dispatch({ type: "disconnect" })}>
            {t("Disconnect", "সংযোগ কাটুন")}
          </button>
        ) : null}
        <p className="mt-2 text-sm text-muted">
          {t(
            "Access ends immediately. No reason is sent. The message thread stays with you.",
            "প্রবেশ সঙ্গে সঙ্গে শেষ। কোনো কারণ পাঠানো হয় না। বার্তার সুতো আপনার কাছেই থাকে।",
          )}
        </p>
        <button
          type="button"
          className="mt-3 min-h-11 border border-ink/20 px-4 text-sm"
          onClick={() => dispatch({ type: "wrong-person" })}
        >
          {t("I connected the wrong person", "আমি ভুল মানুষকে যুক্ত করেছি")}
        </button>
        {state.wrongPerson ? <p className="mt-2 text-sm">{t("Noted on this record.", "এই রেকর্ডে টুকে রাখা হয়েছে।")}</p> : null}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">PIN</h2>
        <p className="mt-2 text-sm leading-relaxed">
          {t(
            "A 4-digit PIN on this browser for Today and the journals. Grounding, crisis help, and Exit never ask for it. My journal keeps its own lock.",
            "এই ব্রাউজারে আজ আর জার্নালের জন্য ৪ সংখ্যার পিন। গ্রাউন্ডিং, সংকটের সাহায্য, আর বেরোনোর পাতা কখনও এটা চায় না। আমার জার্নালের নিজস্ব তালা আছে।",
          )}
        </p>
        {state.pin ? <p className="mt-2 text-sm">{t("A PIN is set.", "একটা পিন আছে।")}</p> : null}
        <label className="mt-3 block text-sm" htmlFor="pin-new">
          {t("New PIN", "নতুন পিন")}
          <input
            id="pin-new"
            inputMode="numeric"
            autoComplete="off"
            value={pinDraft}
            maxLength={4}
            onChange={(event) => setPinDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-32 border-b border-ink/30 py-2 tracking-[0.3em]"
          />
        </label>
        <label className="mt-3 block text-sm" htmlFor="pin-again">
          {t("Repeat PIN", "পিন আবার")}
          <input
            id="pin-again"
            inputMode="numeric"
            autoComplete="off"
            value={pinAgain}
            maxLength={4}
            onChange={(event) => setPinAgain(event.target.value.replace(/\D/g, "").slice(0, 4))}
            className="mt-1 w-32 border-b border-ink/30 py-2 tracking-[0.3em]"
          />
        </label>
        {pinError ? <p className="mt-2 text-sm">{pinError}</p> : null}
        <button
          type="button"
          className="mt-3 min-h-11 border border-ink px-4 text-sm"
          onClick={() => {
            if (pinDraft.length !== 4 || pinDraft !== pinAgain) {
              setPinError(t("Enter the same 4 digits twice.", "একই ৪টি সংখ্যা দুবার লিখুন।"));
              return;
            }
            setPinError("");
            dispatch({ type: "pin", pin: pinDraft });
            setPinDraft("");
            setPinAgain("");
          }}
        >
          {t("Save PIN", "পিন রাখুন")}
        </button>
        {state.pin ? (
          <button type="button" className="mt-3 block text-sm underline" onClick={() => dispatch({ type: "pin", pin: null })}>
            {t("Remove PIN", "পিন সরিয়ে দিন")}
          </button>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">{t("Your data", "আপনার তথ্য")}</h2>
        <button type="button" onClick={download} className="mt-3 min-h-11 border border-ink px-4 text-sm">
          {t("Download my data", "আমার তথ্য নামান")}
        </button>
        <button
          type="button"
          className="mt-4 block text-sm underline"
          onClick={() => router.push("/")}
        >
          {t("Log out", "লগ আউট")}
        </button>
        <p className="mt-2 text-sm text-muted">
          {t("You'll leave the app. What's on this device stays until you delete it.", "আপনি অ্যাপ ছেড়ে যাবেন। এই ডিভাইসের যা আছে, মুছে না ফেলা পর্যন্ত থাকবে।")}
        </p>
        {!confirmDelete ? (
          <button type="button" className="mt-4 text-sm underline" onClick={() => setConfirmDelete(true)}>
            {t("Delete account", "অ্যাকাউন্ট মুছুন")}
          </button>
        ) : (
          <div className="mt-4 border border-ink/15 p-4">
            <p className="text-sm leading-relaxed">
              {t(
                "This removes your check-ins, journal, safety plan, messages, and settings from this browser. It cannot be undone.",
                "এতে এই ব্রাউজার থেকে আপনার চেক-ইন, জার্নাল, নিরাপত্তা পরিকল্পনা, বার্তা, আর সেটিংস চলে যায়। ফেরানো যায় না।",
              )}
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 bg-clay px-4 text-sm text-[#f4efe8]"
              onClick={() => {
                dispatch({ type: "reset" });
                router.push("/");
              }}
            >
              {t("Delete everything on this device", "এই ডিভাইসের সব মুছুন")}
            </button>
          </div>
        )}
      </section>

      <section className="mt-12 border-t border-dashed border-clay/50 pt-6">
        <p className="text-xs uppercase tracking-[0.16em] text-clay">{t("Demo", "ডেমো")}</p>
        <h2 className="mt-2 font-serif text-2xl">{t("Preview tools", "প্রিভিউ")}</h2>
        <p className="mt-2 text-sm">
          {t(
            "Jump the restriction clock. Level 1 is the first 14 days, level 2 runs through day 30, level 3 is after that.",
            "নিয়ন্ত্রণের ঘড়ি এগিয়ে নিন। লেভেল ১ প্রথম ১৪ দিন, লেভেল ২ ৩০ দিন পর্যন্ত, লেভেল ৩ তার পর।",
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              [0, t("Actual", "আসল")],
              [1, t("Level 1", "লেভেল ১")],
              [2, t("Level 2", "লেভেল ২")],
              [3, t("Level 3", "লেভেল ৩")],
            ] as const
          ).map(([level, label]) => (
            <button
              key={level}
              type="button"
              aria-pressed={state.restrictionPreview === level}
              onClick={() => dispatch({ type: "preview-level", level })}
              className={`min-h-11 border px-3 text-sm ${state.restrictionPreview === level ? "border-clay text-clay" : "border-ink/20"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 min-h-11 border border-ink/20 px-3 text-sm"
          aria-pressed={state.fridayPreview}
          onClick={() => dispatch({ type: "preview-friday", on: !state.fridayPreview })}
        >
          {state.fridayPreview ? t("Friday preview on", "শুক্রবারের প্রিভিউ চালু") : t("Preview Friday", "শুক্রবার দেখুন")}
        </button>
        <button
          type="button"
          className="mt-4 block text-sm underline"
          onClick={() => {
            dispatch({ type: "reset" });
            router.push("/");
          }}
        >
          {t("Reset all data", "সব তথ্য রিসেট")}
        </button>
      </section>
    </div>
  );
}
