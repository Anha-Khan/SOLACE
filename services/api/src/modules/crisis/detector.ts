/**
 * Deterministic Tier 3 detector (ADR-4, OD-12). Runs synchronously, before and
 * independently of any AI call. Returns the matched rule version so the result
 * is reproducible and auditable.
 *
 * The phrase list is PROVISIONAL until clinical reviewer sign-off (Issue 24).
 * Each addition bumps RULE_VERSION and is stored on the CrisisEvent.
 */
export const RULE_VERSION = '2026-10-26.1';

const TIER3_PHRASES: readonly string[] = [
  'kill myself',
  'end my life',
  'suicide',
  'want to die',
  'better off dead',
  'no reason to live',
];

export interface DetectionResult {
  tier: 'tier3' | 'none';
  matchedPhrase: string | null;
  ruleVersion: string;
}

export function detectTier3(text: string): DetectionResult {
  const normalised = text.toLowerCase();
  for (const phrase of TIER3_PHRASES) {
    if (normalised.includes(phrase)) {
      return { tier: 'tier3', matchedPhrase: phrase, ruleVersion: RULE_VERSION };
    }
  }
  return { tier: 'none', matchedPhrase: null, ruleVersion: RULE_VERSION };
}

export function classifyTier(input: {
  explicitTier3: boolean;
  aiSignal: 'tier1' | 'tier2' | 'none';
}): 'tier3' | 'tier2' | 'tier1' | 'possible_concern' | 'none' {
  if (input.explicitTier3) return 'tier3';
  if (input.aiSignal === 'tier2') return 'tier2';
  if (input.aiSignal === 'tier1') return 'tier1';
  return 'none';
}
