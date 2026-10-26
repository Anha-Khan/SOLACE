import { PHQ9_ITEM9_KEY, PHQ9_KEY } from './definitions';
import type { SurveyItemDefinition } from './definitions';

/** Phase 3: a retake inside 14 days is rejected. */
export const RETAKE_COOLDOWN_DAYS = 14;
export const RETAKE_COOLDOWN_MS = RETAKE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export class SurveyResponseError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(problems.join('; '));
    this.name = 'SurveyResponseError';
  }
}

/**
 * Boundary validation for an answer set. Every item is required, every value is
 * an integer inside the item's range, and an unknown key is rejected rather than
 * silently dropped. Pure: the HTTP layer maps the thrown error to 400.
 */
export function validateResponses(
  items: readonly SurveyItemDefinition[],
  responses: unknown,
): Record<string, number> {
  if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) {
    throw new SurveyResponseError(['responses must be an object keyed by item']);
  }

  const record = responses as Record<string, unknown>;
  const allowed = new Set(items.map((item) => item.key));
  const problems: string[] = [];

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      problems.push(`unknown answer "${key}"`);
    }
  }

  const scores: Record<string, number> = {};
  for (const item of items) {
    const value = record[item.key];
    if (value === undefined) {
      problems.push(`missing answer "${item.key}"`);
      continue;
    }
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      problems.push(`answer "${item.key}" must be an integer`);
      continue;
    }
    if (value < item.min || value > item.max) {
      problems.push(`answer "${item.key}" must be between ${item.min} and ${item.max}`);
      continue;
    }
    scores[item.key] = value;
  }

  if (problems.length > 0) {
    throw new SurveyResponseError(problems);
  }
  return scores;
}

export interface ScoringOutcome {
  scores: Record<string, number>;
  totalScore: number;
  /** OD-10: item 9 > 0 is a possible concern, never a Tier 2 or Tier 3 alert. */
  possibleConcern: boolean;
  phq9Item9: number | null;
}

/**
 * Server-side scoring. The client never sends a score. Severity bands are
 * intentionally absent: they are a clinical decision that still needs sign-off.
 *
 * ASSUMPTION (OD-10 is "needs clinical confirmation"): any non-zero answer to
 * PHQ-9 item 9 raises `possibleConcern`. The flag is informational and creates
 * no alert and no crisis event.
 */
export function scoreSurvey(
  surveyKey: string,
  items: readonly SurveyItemDefinition[],
  responses: unknown,
): ScoringOutcome {
  const scores = validateResponses(items, responses);
  const totalScore = items.reduce((sum, item) => sum + (scores[item.key] ?? 0), 0);
  const phq9Item9 =
    surveyKey === PHQ9_KEY && Object.prototype.hasOwnProperty.call(scores, PHQ9_ITEM9_KEY)
      ? (scores[PHQ9_ITEM9_KEY] as number)
      : null;

  return {
    scores,
    totalScore,
    possibleConcern: phq9Item9 !== null && phq9Item9 > 0,
    phq9Item9,
  };
}

export function retakeAvailableAt(lastCompletedAt: Date | null): Date | null {
  if (!lastCompletedAt) return null;
  return new Date(lastCompletedAt.getTime() + RETAKE_COOLDOWN_MS);
}

export function retakeAllowed(lastCompletedAt: Date | null, now: Date): boolean {
  const availableAt = retakeAvailableAt(lastCompletedAt);
  return availableAt === null || now.getTime() >= availableAt.getTime();
}
