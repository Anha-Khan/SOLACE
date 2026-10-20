"use client";

import { useSyncExternalStore } from "react";

const EVENT = "between-notes";

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

function read() {
  return sessionStorage.getItem("notes-pad") ?? "";
}

export function NotesPad() {
  const text = useSyncExternalStore(subscribe, read, () => "");

  return (
    <main
      className="min-h-dvh bg-white text-neutral-900"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-normal">Notes</h1>
        <textarea
          aria-label="Notes"
          value={text}
          onChange={(event) => {
            sessionStorage.setItem("notes-pad", event.target.value);
            window.dispatchEvent(new Event(EVENT));
          }}
          className="mt-8 h-[65vh] w-full resize-none border-0 bg-transparent text-base outline-none"
        />
      </div>
    </main>
  );
}
