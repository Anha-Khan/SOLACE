"use client";

import Link from "next/link";
import { useState } from "react";
import { BreathCircle } from "@/components/breath";
import { Companion } from "@/components/companion";
import { CrisisLines } from "@/components/crisis-lines";
import { OFFLINE_LINE, SafetyEcho, useOffline } from "@/components/offline";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function GroundPage() {
  const { state } = useStore();
  const { t } = useI18n();
  const offline = useOffline();
  const [mode, setMode] = useState<"choose" | "breath" | "senses">("choose");
  const [sense, setSense] = useState(0);
  const ready = state.profile.onboardingComplete;
  const senses = [
    {
      title: t("Five things you see", "যা দেখছেন, পাঁচটি"),
      body: t("Name five ordinary things in this room.", "এই ঘরের পাঁচটি সাধারণ জিনিসের নাম বলুন।"),
    },
    {
      title: t("Four things you feel", "যা ছুঁয়ে আছে, চারটি"),
      body: t("Notice four points of contact. Skip anything sharp.", "চারটি ছোঁয়া খেয়াল করুন। যা তীক্ষ্ণ, সেটা বাদ দিন।"),
    },
    {
      title: t("Three things you hear", "যা শুনছেন, তিনটি"),
      body: t("Name three sounds. Silence can be one of them.", "তিনটি শব্দের নাম বলুন। নীরবতাও একটি হতে পারে।"),
    },
    {
      title: t("Two things you smell", "যা গন্ধ পাচ্ছেন, দুটি"),
      body: t("Name two scents, or notice that there is no scent.", "দুটি গন্ধের নাম বলুন, বা খেয়াল করুন যে গন্ধ নেই।"),
    },
    {
      title: t("One thing you taste", "যা স্বাদ পাচ্ছেন, একটি"),
      body: t("Notice one taste, or take a sip of water.", "একটি স্বাদ খেয়াল করুন, বা এক চুমুক পানি নিন।"),
    },
  ];

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-[440px] px-5 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-serif text-xl">
            Between
          </Link>
          <Link href="/exit" className="text-sm">
            {t("Exit", "বেরিয়ে যান")}
          </Link>
        </header>

        <Companion look="still" className="mt-8" />
        <p className="kicker mt-4">{t("Right now", "এই মুহূর্তে")}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">{t("A place to steady.", "স্থির হওয়ার একটা জায়গা।")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("No account needed. Stop whenever you want.", "অ্যাকাউন্ট লাগবে না। যখন খুশি থামুন।")}
        </p>

        {mode === "choose" ? (
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={() => setMode("breath")}
              className="soft-card px-5 py-5 text-left"
            >
              <span className="block font-serif text-2xl">{t("Box breathing", "বাক্স শ্বাস")}</span>
              <span className="mt-1 block text-sm text-muted">
                {t("In, hold, out, hold. Four counts each.", "নেওয়া, ধরা, ছাড়া, ধরা। প্রতিটায় চার গুন।")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSense(0);
                setMode("senses");
              }}
              className="soft-card px-5 py-5 text-left"
            >
              <span className="block font-serif text-2xl">5-4-3-2-1</span>
              <span className="mt-1 block text-sm text-muted">
                {t("Name what is already here.", "যা ইতিমধ্যে এখানে আছে, তার নাম বলুন।")}
              </span>
            </button>
          </div>
        ) : null}

        {mode === "breath" ? (
          <section className="mt-6">
            <button type="button" onClick={() => setMode("choose")} className="text-sm underline">
              {t("Both practices", "দুটো চর্চা")}
            </button>
            <BreathCircle key="box" pattern="box" />
          </section>
        ) : null}

        {mode === "senses" ? (
          <section className="mt-6">
            <button type="button" onClick={() => setMode("choose")} className="text-sm underline">
              {t("Both practices", "দুটো চর্চা")}
            </button>
            <h2 className="mt-6 font-serif text-3xl">{senses[sense]?.title}</h2>
            <p className="mt-3 leading-relaxed">{senses[sense]?.body}</p>
            <div className="mt-6 flex gap-3">
              {sense > 0 ? (
                <button type="button" onClick={() => setSense((value) => value - 1)} className="min-h-11 border border-ink/20 px-4 text-sm">
                  {t("Back", "পিছনে")}
                </button>
              ) : null}
              {sense < senses.length - 1 ? (
                <button type="button" onClick={() => setSense((value) => value + 1)} className="min-h-11 bg-clay px-4 text-sm text-[#f4efe8]">
                  {t("Next", "পরের")}
                </button>
              ) : (
                <button type="button" onClick={() => setMode("choose")} className="min-h-11 bg-clay px-4 text-sm text-[#f4efe8]">
                  {t("Done", "শেষ")}
                </button>
              )}
            </div>
          </section>
        ) : null}

        <p className="mt-12 text-sm leading-relaxed">
          {ready ? (
            <Link href="/home" className="underline">
              {t("Return home", "ঘরে ফিরুন")}
            </Link>
          ) : (
            <Link href="/onboarding" className="underline">
              {t(
                "When you feel a little steadier, you can set up Between",
                "একটু স্থির লাগলে Between সেট আপ করতে পারেন",
              )}
            </Link>
          )}
        </p>

        {offline ? (
          <p className="mt-12 text-sm leading-relaxed">
            {t(
              OFFLINE_LINE,
              "আপনি এখন অফলাইনে। আপনার নিরাপত্তা পরিকল্পনা আর সংকটের নম্বর নিচে এখনও আছে।",
            )}
          </p>
        ) : null}
        {offline ? <SafetyEcho plan={state.safety} /> : null}
        <div className="mt-12 border-t border-ink/10 pt-8">
          <CrisisLines />
        </div>
      </div>
    </main>
  );
}
