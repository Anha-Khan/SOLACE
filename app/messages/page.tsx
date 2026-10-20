"use client";

import { useState } from "react";
import Link from "next/link";
import { RequireProfile } from "@/components/patient-shell";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { THERAPIST_NAME } from "@/lib/types";

export default function MessagesPage() {
  return (
    <RequireProfile>
      <Thread />
    </RequireProfile>
  );
}

function Thread() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const [text, setText] = useState("");

  if (!state.profile.therapistConnected && state.messages.length > 0) {
    return (
      <div>
        <h1 className="font-serif text-4xl">{t("Messages", "বার্তা")}</h1>
        <p className="mt-4 text-sm leading-relaxed">
          {t(
            "Access has ended. This thread stays here. No reason was sent.",
            "প্রবেশ শেষ। এই সুতো এখানেই থাকছে। কোনো কারণ পাঠানো হয়নি।",
          )}
        </p>
        <ul className="mt-8 space-y-4">
          {state.messages.map((message) => (
            <li key={message.id} className={message.from === "patient" ? "text-right" : "text-left"}>
              <p className="text-xs text-muted">{message.from === "patient" ? t("You", "আপনি") : THERAPIST_NAME}</p>
              <p className="mt-1 inline-block max-w-[85%] border border-ink/10 px-3 py-2 text-left text-sm leading-relaxed">
                {message.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!state.profile.therapistConnected) {
    return (
      <div>
        <h1 className="font-serif text-4xl">{t("Messages", "বার্তা")}</h1>
        <p className="mt-4 text-sm leading-relaxed">
          {t("Messages open when a therapist is connected.", "থেরাপিস্ট যুক্ত হলে বার্তা খোলে।")}
        </p>
        <p className="mt-3 text-sm">
          {t("For urgent support use the", "জরুরি সাপোর্টের জন্য")}{" "}
          <Link href="/crisis" className="underline">
            {t("crisis button", "সংকটের বোতাম")}
          </Link>
          {t(".", " ব্যবহার করুন।")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="kicker">{t("Messages", "বার্তা")}</p>
      <h1 className="mt-2 font-serif text-4xl">{THERAPIST_NAME}</h1>
      <p className="mt-4 text-sm leading-relaxed">
        {t(
          "Messages are reviewed between sessions — for urgent support use the crisis button.",
          "বার্তা সেশনের মাঝে দেখা হয় — জরুরি সাপোর্টের জন্য সংকটের বোতাম ব্যবহার করুন।",
        )}
      </p>
      <p className="mt-2 text-sm">
        {t("Your therapist typically replies within a day.", "আপনার থেরাপিস্ট সাধারণত এক দিনের মধ্যে উত্তর দেন।")}
      </p>
      <ul className="mt-8 space-y-4">
        {state.messages.length === 0 ? (
          <li className="text-sm text-muted">{t("No messages yet.", "এখনও কোনো বার্তা নেই।")}</li>
        ) : (
          state.messages.map((message) => (
            <li key={message.id} className={message.from === "patient" ? "text-right" : "text-left"}>
              <p className="text-xs text-muted">{message.from === "patient" ? t("You", "আপনি") : THERAPIST_NAME}</p>
              <p className="mt-1 inline-block max-w-[85%] border border-ink/10 px-3 py-2 text-left text-sm leading-relaxed">
                {message.text}
              </p>
            </li>
          ))
        )}
      </ul>
      {state.paused ? (
        <p className="mt-6 text-sm">{t("Processing is paused. You can still read.", "প্রসেসিং থামানো আছে। আপনি এখনও পড়তে পারেন।")}</p>
      ) : (
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            dispatch({ type: "message", from: "patient", text });
            setText("");
          }}
        >
          <label className="block text-sm" htmlFor="message">
            {t("Message", "বার্তা")}
            <textarea
              id="message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-2 min-h-24 w-full border border-ink/15 p-3"
            />
          </label>
          <button type="submit" className="mt-3 min-h-11 bg-ink px-4 text-sm text-paper">
            {t("Send", "পাঠান")}
          </button>
        </form>
      )}
    </div>
  );
}
