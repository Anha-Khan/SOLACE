"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function OpenPage() {
  const { ready, state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(state.profile.onboardingComplete ? "/home" : "/onboarding");
  }, [ready, router, state.profile.onboardingComplete]);

  return <div className="min-h-dvh bg-paper" aria-hidden="true" />;
}
