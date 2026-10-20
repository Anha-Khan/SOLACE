"use client";

import Link from "next/link";
import { CrisisLines } from "@/components/crisis-lines";
import { useI18n } from "@/lib/i18n";

export default function Under18Page() {
  const { t } = useI18n();
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-16">
        <p className="kicker">{t("Age", "বয়স")}</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight">
          {t("Between is only for adults.", "Between শুধু প্রাপ্তবয়স্কদের জন্য।")}
        </h1>
        <p className="mt-6 text-lg leading-relaxed">
          {t(
            "No account has been created. If you are under 18, talk with a trusted adult.",
            "কোনো অ্যাকাউন্ট তৈরি হয়নি। আপনার বয়স ১৮-এর কম হলে, বিশ্বাসযোগ্য কোনো বড় মানুষের সঙ্গে কথা বলুন।",
          )}
        </p>
        <div className="mt-10">
          <CrisisLines />
        </div>
        <Link href="/" className="mt-10 text-sm underline">
          {t("Back to the start", "শুরুতে ফিরুন")}
        </Link>
      </div>
    </main>
  );
}
