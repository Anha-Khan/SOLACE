"use client";

import Link from "next/link";
import { EmotionCompanion } from "@/components/emotion-companion";
import { CrisisLines } from "@/components/crisis-lines";
import { LanguageSwitch, useI18n } from "@/lib/i18n";
import { TimeThemeToggle } from "@/components/time-theme-toggle";

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-paper focus:px-3 focus:py-2"
      >
        {t("Skip to content", "লেখায় যান")}
      </a>
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 sm:px-8">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Between
        </Link>
        <nav aria-label={t("Primary", "প্রধান")} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <TimeThemeToggle />
          <LanguageSwitch />
          <Link href="#crisis-lines">{t("Need help now", "এখনই সাহায্য দরকার")}</Link>
          <Link href="#therapists">{t("For therapists", "থেরাপিস্টদের জন্য")}</Link>
          <Link href="#download" className="round-next">
            {t("Download the app", "অ্যাপ ডাউনলোড")}
          </Link>
        </nav>
      </header>

      <main id="content" className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="kicker">{t("Trauma recovery companion", "ট্রমার পর সঙ্গী")}</p>
            <h1>
              {t(
                "Your therapist works with you once a week. We work with you every day.",
                "আপনার থেরাপিস্ট সপ্তাহে একবার আপনার সঙ্গে কাজ করেন। আমরা প্রতিদিন আপনার সঙ্গে কাজ করি।",
              )}
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/90">
              {t(
                "The hour in the room is real. The other days are where sleep, work, and memory actually happen. Between is a quiet place for that gap — with your therapist, not instead of them.",
                "ঘণ্টাটা রুমে সত্যি। বাকি দিনগুলোতেই ঘুম, কাজ, আর স্মৃতি আসলে ঘটে। Between সেই ফাঁকের জন্য একটা শান্ত জায়গা — আপনার থেরাপিস্টের সঙ্গে, তাঁর বদলে নয়।",
              )}
            </p>
            <div className="landing-actions">
              <Link
                href="#crisis-lines"
                className="landing-action landing-action-quiet"
              >
                {t("I need help right now", "এই মুহূর্তে আমার সাহায্য দরকার")}
              </Link>
              <Link
                href="#download"
                className="landing-action landing-action-primary"
              >
                {t("I'm okay, just exploring", "আমি ঠিক আছি, শুধু দেখছি")}
              </Link>
            </div>
          </div>
          <div className="landing-visual">
            <EmotionCompanion mood={7} />
            <p>{t("A quiet place for the days that happen between appointments.", "সেশনের মাঝের দিনগুলোর জন্য একটি শান্ত জায়গা।")}</p>
          </div>
        </section>

        <section className="grid gap-12 border-t border-ink/10 py-16 md:grid-cols-2">
          <div>
            <p className="kicker">{t("What this is", "এটা কী")}</p>
            <p className="mt-4 max-w-md text-lg leading-relaxed">
              {t(
                "A companion for the hours between sessions. A check-in, one task, and a journal you can keep to yourself.",
                "সেশনের মাঝের ঘণ্টাগুলোর জন্য একজন সঙ্গী। একটা চেক-ইন, একটা কাজ, আর একটা জার্নাল যা আপনি নিজের কাছে রাখতে পারেন।",
              )}
            </p>
          </div>
          <div>
            <p className="kicker">{t("What this is not", "এটা কী নয়")}</p>
            <ul className="mt-4 space-y-2 font-serif text-3xl leading-tight">
              <li>{t("Not a treatment", "চিকিৎসা নয়")}</li>
              <li>{t("Not a diagnosis", "রোগনির্ণয় নয়")}</li>
              <li>{t("Not a replacement for a therapist", "থেরাপিস্টের বদলি নয়")}</li>
              <li>{t("Not a crisis service", "সংকটকালীন সেবা নয়")}</li>
            </ul>
          </div>
        </section>

        <section className="border-t border-ink/10 py-16">
          <p className="kicker">{t("A day with Between", "Between-এর সঙ্গে একটা দিন")}</p>
          <ol className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed">
            <li>{t("Check in. It takes under a minute.", "চেক-ইন করুন। এক মিনিটও লাগে না।")}</li>
            <li>{t("Do one task. Then you can stop.", "একটা কাজ করুন। তারপর থামতে পারেন।")}</li>
            <li>{t("Write in a journal, if you want to.", "চাইলে জার্নালে লিখুন।")}</li>
          </ol>
          <p className="mt-6 max-w-xl text-lg">
            {t(
              "There is no streak to protect. A missed day changes nothing.",
              "কোনো ধারাবাহিকতা রক্ষা করতে হয় না। একটা দিন বাদ পড়লে কিছু বদলায় না।",
            )}
          </p>
        </section>

        <section className="border-t border-ink/10 py-16">
          <p className="kicker">{t("Safety", "নিরাপত্তা")}</p>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <p className="text-lg leading-relaxed">
              {t(
                "Grounding and the crisis numbers work with no account.",
                "গ্রাউন্ডিং আর সংকটের নম্বর অ্যাকাউন্ট ছাড়াই চলে।",
              )}
            </p>
            <p className="text-lg leading-relaxed">
              {t(
                "You decide what your therapist can see. One setting, changed whenever you want.",
                "থেরাপিস্ট কী দেখবেন, সেটা আপনি ঠিক করেন। একটা সেটিং, যখন খুশি বদলানো যায়।",
              )}
            </p>
            <p className="text-lg leading-relaxed">
              {t(
                "Processing tasks stay locked until your therapist is connected.",
                "থেরাপিস্ট যুক্ত না হওয়া পর্যন্ত প্রসেসিংয়ের কাজগুলো বন্ধ থাকে।",
              )}
            </p>
          </div>
        </section>

        <section id="download" className="border-t border-ink/10 py-16">
          <p className="kicker">{t("Download", "ডাউনলোড")}</p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">
            {t(
              "Between ships as a mobile app for iOS and Android. Download links are coming soon.",
              "Between আসছে iOS আর Android-এর জন্য। ডাউনলোড লিংক শীঘ্রই আসছে।",
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex min-h-11 items-center rounded-full border border-ink px-4 text-sm">
              {t("App Store (soon)", "অ্যাপ স্টোর (শীঘ্রই)")}
            </span>
            <span className="inline-flex min-h-11 items-center rounded-full border border-ink/30 px-4 text-sm">
              {t("Play Store (soon)", "প্লে স্টোর (শীঘ্রই)")}
            </span>
          </div>
        </section>

        <section id="therapists" className="border-t border-ink/10 py-16">
          <p className="kicker">{t("For therapists", "থেরাপিস্টদের জন্য")}</p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">
            {t(
              "Between is invite-only. It is not a directory, and it does not match you with patients. The dashboard is a tool for work you already hold. Your judgment comes first.",
              "Between শুধু আমন্ত্রণে। এটা কোনো তালিকা নয়, আর রোগীর সঙ্গে মিলিয়ে দেয় না। ড্যাশবোর্ড আপনি যে কাজ ইতিমধ্যে ধরে আছেন, তার জন্য একটা হাতিয়ার। আপনার বিচার আগে।",
            )}
          </p>
        </section>

        <section className="border-t border-ink/10 py-16">
          <p className="kicker">{t("Privacy", "গোপনীয়তা")}</p>
          <ul className="mt-6 max-w-xl space-y-3 text-lg leading-relaxed">
            <li>{t("One setting decides what your therapist can see.", "একটা সেটিং ঠিক করে থেরাপিস্ট কী দেখবেন।")}</li>
            <li>{t("An access log shows when a summary was viewed.", "সারাংশ কখন দেখা হয়েছে, সেটা একটা লগে থাকে।")}</li>
            <li>{t("No ads.", "কোনো বিজ্ঞাপন নেই।")}</li>
            <li>
              {t(
                "If journal text is analyzed, that work would be done by an external service that must not retain it. This demo sends nothing.",
                "জার্নালের লেখা বিশ্লেষণ হলে সেটা এমন বাইরের সেবায় হত, যারা লেখা রাখতে পারবে না। এই ডেমো কিছুই পাঠায় না।",
              )}
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <CrisisLines />
          <p className="mt-8 max-w-sm text-sm leading-relaxed text-muted">
            {t(
              "Between is not a clinical service, not a treatment, and not a crisis line.",
              "Between কোনো ক্লিনিকাল সেবা নয়, চিকিৎসা নয়, আর সংকটের লাইনও নয়।",
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
