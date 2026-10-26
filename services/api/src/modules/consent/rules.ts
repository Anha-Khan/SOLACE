import type { ConsentItem, JournalPrivacy } from '../../common/enums';
import { monitoringStateFrom } from './state';
import type { MonitoringState } from './state';

/** R-CONSENT-3. A withdrawal request is only valid for this long (named, not config). */
export const WITHDRAWAL_TTL_MS = 15 * 60 * 1000;

/** R-CONSENT-1. The consent item that represents crisis monitoring being ON. */
export const CRISIS_MONITORING_ITEM: ConsentItem = 'crisis_detection';

export interface ConsentRuleViolation {
  readonly code: 'CONSENT_REQUIRED' | 'VALIDATION_FAILED';
  readonly message: string;
}

/**
 * R-CONSENT-3: monitoring may not be switched off through the ordinary consent
 * endpoint. The only path is the two-step withdrawal flow, which records
 * `withdrawal_confirmed` as the source.
 */
export function directConsentChangeViolation(
  item: ConsentItem,
  granted: boolean,
): ConsentRuleViolation | null {
  if (item === CRISIS_MONITORING_ITEM && !granted) {
    return {
      code: 'CONSENT_REQUIRED',
      message:
        'Turning off crisis monitoring requires the two-step withdrawal flow ' +
        '(POST /v1/consents/crisis-monitoring/withdrawals, then confirm).',
    };
  }
  return null;
}

/**
 * R-CONSENT-2: monitoring cannot be OFF while the journal is hidden from the
 * therapist. CP1 calls this from the withdrawal confirmation, which sets
 * `full_access` in the same transaction, so the rule can never be violated by
 * that path. CP4's `PUT /v1/journal/privacy` calls it before hiding the journal.
 *
 * ASSUMPTION: only `hidden_from_therapist` counts as hidden. `progress_only`
 * shares progress but not entries; the plan does not say whether it satisfies
 * R-CONSENT-1's "read access to the Recovery Journal". CP1 never produces
 * `progress_only` while monitoring is OFF.
 */
export function journalPrivacyViolation(input: {
  privacy: JournalPrivacy;
  monitoring: MonitoringState;
}): ConsentRuleViolation | null {
  if (input.privacy === 'hidden_from_therapist' && input.monitoring === 'off') {
    return {
      code: 'CONSENT_REQUIRED',
      message:
        'Crisis monitoring cannot be off while the journal is hidden from the therapist. ' +
        'Turn monitoring back on before hiding the journal.',
    };
  }
  return null;
}

/**
 * R-CONSENT-1: confirming the withdrawal automatically grants the therapist
 * read access to the Recovery Journal. The caller applies this in the same
 * database transaction that appends the refusal, so the two can never disagree.
 */
export function withdrawalConfirmationEffects(): { journalPrivacy: JournalPrivacy } {
  return { journalPrivacy: 'full_access' };
}

/** Convenience used by tests and services: monitoring state from a consent record. */
export { monitoringStateFrom };
