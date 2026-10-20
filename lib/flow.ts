import type { OnboardingDraft } from "./types";
import { GAD_ITEMS, PCL_ITEMS } from "./surveys";

export function onboardingSteps(draft: OnboardingDraft) {
  const steps = ["intro", "account", "consent", "restriction", "pc-event"];
  if (draft.pcEvent === true) steps.push("pc-0", "pc-1", "pc-2", "pc-3", "pc-4");
  steps.push("phq-0", "phq-1", "phq-8", "fork");
  if (draft.longerChoice === "more") {
    steps.push("phq-more");
    if (!draft.stopPhq) steps.push("phq-2", "phq-3", "phq-4", "phq-5", "phq-6", "phq-7");
    steps.push("pcl-more");
    if (!draft.stopPcl) steps.push(...PCL_ITEMS.map((_, index) => `pcl-${index}`));
    steps.push("gad-opt");
    if (draft.gadOpt === true && !draft.stopGad) steps.push(...GAD_ITEMS.map((_, index) => `gad-${index}`));
  }
  steps.push("result", "categories", "therapist");
  return steps;
}

export function stepIndex(step: string, prefix: string) {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(step);
  return match ? Number(match[1]) : null;
}

export function normalizeDraft(draft: OnboardingDraft, complete: boolean): OnboardingDraft {
  const next: OnboardingDraft = {
    ...draft,
    pcEvent: draft.pcEvent ?? null,
    pcptsd: draft.pcptsd?.length === 5 ? draft.pcptsd : [null, null, null, null, null],
    longerChoice: draft.longerChoice ?? null,
    stopPhq: draft.stopPhq ?? false,
    stopPcl: draft.stopPcl ?? false,
    stopGad: draft.stopGad ?? false,
  };
  if (complete || next.step === "confirm") return next;
  const early = ["intro", "account", "consent", "restriction", "pc-event"];
  if (!onboardingSteps(next).includes(next.step)) next.step = next.pcEvent === null && next.longerChoice === null ? "pc-event" : "fork";
  if (!early.includes(next.step) && next.pcEvent === null && next.longerChoice === null) next.step = "pc-event";
  return next;
}
