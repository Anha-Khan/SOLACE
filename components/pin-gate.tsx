"use client";

import { useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const UNLOCK = "between.pin.ok";
const EVENT = "between-pin";

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

function read() {
  return sessionStorage.getItem(UNLOCK) === "1" ? "1" : "";
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const { t } = useI18n();
  const unlocked = useSyncExternalStore(subscribe, read, () => "");
  const [digits, setDigits] = useState("");
  const [wrong, setWrong] = useState(false);

  if (!state.pin || unlocked === "1") return children;

  return (
    <form
      className="max-w-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (digits === state.pin) {
          sessionStorage.setItem(UNLOCK, "1");
          window.dispatchEvent(new Event(EVENT));
          setWrong(false);
          return;
        }
        setWrong(true);
        setDigits("");
      }}
    >
      <h1 className="font-serif text-4xl leading-tight">PIN</h1>
      <p className="mt-3 text-sm leading-relaxed">
        {t("Enter the 4-digit PIN for this browser.", "এই ব্রাউজারের ৪ সংখ্যার পিন দিন।")}
      </p>
      <label className="mt-6 block text-sm" htmlFor="pin-entry">
        PIN
        <input
          id="pin-entry"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={digits}
          onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").slice(0, 4))}
          className="mt-1 w-32 border-b border-ink/30 py-2 tracking-[0.4em]"
        />
      </label>
      {wrong ? <p className="mt-3 text-sm">{t("That PIN doesn't match.", "পিন মিলছে না।")}</p> : null}
      <button type="submit" className="round-next mt-6" disabled={digits.length !== 4}>
        {t("Continue", "এগিয়ে যান")}
      </button>
    </form>
  );
}
