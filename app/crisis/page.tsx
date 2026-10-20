"use client";

import Link from "next/link";
import { AlertNotice } from "@/components/alert-notice";
import { CrisisLines } from "@/components/crisis-lines";
import { OFFLINE_LINE, SafetyEcho, useOffline } from "@/components/offline";
import { crisisLineShown, useI18n } from "@/lib/i18n";
import { safetyProgress } from "@/lib/select";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { THERAPIST_NAME } from "@/lib/types";

export default function CrisisPage() {
  const { ready, state, dispatch } = useStore();
  const { t, lang } = useI18n();
  const offline = useOffline();
  const progress = safetyProgress(state);
  const plan = state.safety;
  const connected = state.profile.therapistConnected;
  const answered = state.tier2Date === todayISO();

  if (!ready) return <div className="min-h-dvh bg-paper" aria-hidden="true" />;

  const bits = [
    plan.helps ? `${t("What helps a little", "যা অল্প হলেও সাহায্য করে")}: ${plan.helps}` : "",
    plan.person1 || plan.person2
      ? `${t("People", "মানুষ")}: ${[plan.person1, plan.person2].filter(Boolean).join(", ")}`
      : "",
    plan.crisisLineSaved ? crisisLineShown(plan.crisisLine, lang) : "",
    plan.reason ? `${t("A reason to stay safe", "নিরাপদ থাকার একটা কারণ")}: ${plan.reason}` : "",
    plan.saferPlace ? `${t("A safer place", "একটু নিরাপদ জায়গা")}: ${plan.saferPlace}` : "",
  ].filter(Boolean);

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 py-8">
        <div className="flex justify-end">
          <Link href="/exit" className="text-sm">
            {t("Exit", "বেরিয়ে যান")}
          </Link>
        </div>
        <p className="kicker mt-8">{t("Right now", "এই মুহূর্তে")}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">
          {t("Here is a number you can call right now.", "এই মুহূর্তে কল করার একটা নম্বর এখানে।")}
        </h1>
        <ol className="mt-8 space-y-4 text-lg">
          <li>
            {t("Breathe.", "শ্বাস নিন।")}{" "}
            <Link href="/ground" className="underline">
              {t("Open a short grounding practice", "একটা ছোট গ্রাউন্ডিং খুলুন")}
            </Link>
            .
          </li>
          <li>{t("Call the line below.", "নিচের লাইনে কল করুন।")}</li>
          <li>
            {t("Open the safety plan", "নিরাপত্তা পরিকল্পনা খুলুন")}
            {progress.done < 5 ? t(", even if it is unfinished", ", শেষ না হলেও") : ""}
            .{" "}
            <Link href="/safety-plan" className="underline">
              {t("Open it", "খুলুন")}
            </Link>
            .
          </li>
        </ol>
        {bits.length > 0 ? (
          <ul className="mt-6 space-y-2 text-sm leading-relaxed">
            {bits.map((bit) => (
              <li key={bit}>{bit}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm">
            {t("No plan notes yet. That does not block calling.", "এখনও কোনো নোট নেই। এতে কল আটকায় না।")}
          </p>
        )}

        {state.keywordHandoff && connected ? (
          <p className="mt-6 text-sm leading-relaxed">
            {t(
              "A demo alert was added on this device only. No one has been called or messaged.",
              "এই ডিভাইসে শুধু একটি ডেমো সতর্কতা যোগ হয়েছে। কাউকে ফোন করা হয়নি, কাউকে মেসেজও করা হয়নি।",
            )}
          </p>
        ) : null}

        {offline ? (
          <div className="mt-8">
            <p className="text-sm leading-relaxed">
              {t(
                OFFLINE_LINE,
                "আপনি এখন অফলাইনে। আপনার নিরাপত্তা পরিকল্পনা আর সংকটের নম্বর নিচে এখনও আছে।",
              )}
            </p>
            <SafetyEcho plan={state.safety} />
          </div>
        ) : null}

        <div className="mt-10">
          <CrisisLines />
        </div>
        <AlertNotice demo />

        {connected ? (
          <section className="mt-10 border-t border-ink/10 pt-6">
            {answered && state.tier2Choice === "yes" ? (
              <p className="text-sm leading-relaxed">
                {t(
                  "Added in this demo only. No one has been called or messaged.",
                  "শুধু এই ডেমোতে যোগ হয়েছে। কাউকে ফোন করা হয়নি, কাউকে মেসেজও করা হয়নি।",
                )}
              </p>
            ) : null}
            {answered && state.tier2Choice === "no" ? (
              <p className="text-sm leading-relaxed">
                {t("Okay. These numbers stay here.", "ঠিক আছে। এই নম্বরগুলো এখানেই থাকছে।")}
              </p>
            ) : null}
            {!answered ? (
              <>
                <h2 className="font-serif text-2xl">
                  {t(
                    "We'd like to let your therapist know. Is that okay?",
                    "আমরা আপনার থেরাপিস্টকে জানাতে চাই। এটা কি ঠিক আছে?",
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t(
                    `${THERAPIST_NAME} is connected in this demo.`,
                    `${THERAPIST_NAME} এই ডেমোতে যুক্ত আছেন।`,
                  )}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="min-h-12 border border-ink text-sm"
                    onClick={() => dispatch({ type: "tier2", yes: true })}
                  >
                    {t("Yes", "হ্যাঁ")}
                  </button>
                  <button
                    type="button"
                    className="min-h-12 border border-ink text-sm"
                    onClick={() => dispatch({ type: "tier2", yes: false })}
                  >
                    {t("No", "না")}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
