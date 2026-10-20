"use client";

import Link from "next/link";
import { useState } from "react";
import { TherapistFrame } from "@/components/therapist-frame";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { ResponseTime } from "@/lib/types";

export default function TherapistSetupPage() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const profile = state.therapist;

  return (
    <TherapistFrame requireEntry={false}>
      <main className="mx-auto max-w-2xl">
        <p className="kicker">{t("Therapist setup", "থেরাপিস্ট সেটআপ")}</p>
        <h1 className="mt-2 font-serif text-4xl">{t("Before opening the caseload", "রোগীর তালিকা খোলার আগে")}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          {t("This demo stores these details in this browser only. They do not verify professional credentials.", "এই ডেমো তথ্যগুলো শুধু এই ব্রাউজারে রাখে। এগুলো পেশাগত পরিচয় যাচাই করে না।")}
        </p>
        <form className="mt-8 grid gap-6" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "therapist-enter" }); setSaved(true); }}>
          <label className="block text-sm">{t("Display name", "নাম")}<input className="mt-2 w-full border-b border-ink/30 py-2" value={profile.name} onChange={(event) => dispatch({ type: "therapist-form", patch: { name: event.target.value } })} /></label>
          <label className="block text-sm">{t("Licence or registration", "লাইসেন্স বা নিবন্ধন")}<input className="mt-2 w-full border-b border-ink/30 py-2" value={profile.licence} onChange={(event) => dispatch({ type: "therapist-form", patch: { licence: event.target.value } })} /></label>
          <label className="block text-sm">{t("Region", "অঞ্চল")}<input className="mt-2 w-full border-b border-ink/30 py-2" value={profile.region} onChange={(event) => dispatch({ type: "therapist-form", patch: { region: event.target.value } })} /></label>
          <label className="block text-sm">{t("Typical response time", "সাধারণত উত্তর দেওয়ার সময়")}<select className="mt-2 w-full border-b border-ink/30 py-2" value={profile.responseTime} onChange={(event) => dispatch({ type: "therapist-form", patch: { responseTime: event.target.value as ResponseTime } })}><option value="">{t("Choose", "বেছে নিন")}</option><option value="a few hours">{t("A few hours", "কয়েক ঘণ্টা")}</option><option value="a day">{t("A day", "এক দিন")}</option><option value="2 days">{t("Two days", "দুই দিন")}</option></select></label>
          <fieldset className="grid gap-3"><legend className="font-serif text-2xl">{t("Confirm the boundaries", "সীমাগুলো নিশ্চিত করুন")}</legend>{([
            ["dataAck", t("I understand this is demo data, not a clinical record.", "আমি বুঝি এটি ডেমো তথ্য, ক্লিনিক্যাল রেকর্ড নয়।")],
            ["crisisAck", t("I understand this is not an emergency-response system.", "আমি বুঝি এটি জরুরি প্রতিক্রিয়া ব্যবস্থা নয়।")],
            ["planAck", t("I will use professional judgment before acting on a summary.", "সারাংশের ভিত্তিতে কাজ করার আগে আমি পেশাগত বিচার ব্যবহার করব।")],
          ] as const).map(([key, label]) => <label key={key} className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={profile[key]} onChange={(event) => dispatch({ type: "therapist-form", patch: { [key]: event.target.checked } })} /><span>{label}</span></label>)}</fieldset>
          <div className="flex flex-wrap items-center gap-4"><button className="round-next" type="submit" disabled={!profile.dataAck || !profile.crisisAck || !profile.planAck}>{t("Save and open caseload", "রেখে রোগীর তালিকা খুলুন")}</button>{saved ? <Link href="/therapist" className="text-sm underline">{t("Open caseload", "রোগীর তালিকা খুলুন")}</Link> : null}</div>
        </form>
      </main>
    </TherapistFrame>
  );
}
