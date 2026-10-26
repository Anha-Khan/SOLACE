import { CONSENT_ITEMS } from '../../src/common/enums';
import type { ConsentItem, ConsentSource } from '../../src/common/enums';
import {
  findConsentState,
  projectConsentStates,
  toConsentState,
} from '../../src/modules/consent/projection';
import type { ConsentRecordLike } from '../../src/modules/consent/projection';
import {
  directConsentChangeViolation,
  journalPrivacyViolation,
  withdrawalConfirmationEffects,
} from '../../src/modules/consent/rules';
import { InvalidWithdrawalTransition, transitionWithdrawal } from '../../src/modules/consent/state';

const ACCOUNT_CREATED = new Date('2026-01-01T00:00:00.000Z');

function record(
  item: ConsentItem,
  granted: boolean,
  recordedAt: string,
  source: ConsentSource = 'settings',
): ConsentRecordLike {
  return { item, granted, source, appVersion: null, recordedAt: new Date(recordedAt) };
}

describe('consent state machine (R-CONSENT-3)', () => {
  it('accepts the one transition that turns monitoring off', () => {
    expect(transitionWithdrawal('pending', 'confirm')).toBe('confirmed');
  });

  it('accepts cancellation and expiry from pending', () => {
    expect(transitionWithdrawal('pending', 'cancel')).toBe('cancelled');
    expect(transitionWithdrawal('pending', 'expire')).toBe('expired');
  });

  it.each(['confirmed', 'cancelled', 'expired'] as const)('is terminal from %s', (from) => {
    for (const event of ['confirm', 'cancel', 'expire'] as const) {
      expect(() => transitionWithdrawal(from, event)).toThrow(InvalidWithdrawalTransition);
    }
  });
});

describe('consent projection', () => {
  it('projects every consent item in a stable order', () => {
    const states = projectConsentStates([], ACCOUNT_CREATED);
    expect(states.map((state) => state.item)).toEqual([...CONSENT_ITEMS]);
  });

  it('treats an item with no record as refused at account creation', () => {
    const states = projectConsentStates([], ACCOUNT_CREATED);
    for (const state of states) {
      expect(state.granted).toBe(false);
      expect(state.source).toBe('onboarding');
      expect(state.recordedAt).toEqual(ACCOUNT_CREATED);
    }
  });

  it('uses the newest record per item', () => {
    const states = projectConsentStates(
      [
        record('journal_storage', false, '2026-02-03T00:00:00.000Z'),
        record('journal_storage', true, '2026-02-01T00:00:00.000Z', 'onboarding'),
      ],
      ACCOUNT_CREATED,
    );
    const journal = findConsentState(states, 'journal_storage');
    expect(journal.granted).toBe(false);
    expect(journal.source).toBe('settings');
  });

  it('keeps unrelated items at their own latest state', () => {
    const states = projectConsentStates(
      [record('crisis_detection', true, '2026-02-01T00:00:00.000Z', 'onboarding')],
      ACCOUNT_CREATED,
    );
    expect(findConsentState(states, 'crisis_detection').granted).toBe(true);
    expect(findConsentState(states, 'mood_task_data').granted).toBe(false);
  });

  it('maps a record to the wire shape without leaking the row id', () => {
    const view = toConsentState(record('mood_task_data', true, '2026-02-01T00:00:00.000Z'));
    expect(view).toEqual({
      item: 'mood_task_data',
      granted: true,
      source: 'settings',
      appVersion: null,
      recordedAt: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(view).not.toHaveProperty('id');
    expect(view).not.toHaveProperty('userId');
  });
});

describe('R-CONSENT-3: monitoring cannot be turned off directly', () => {
  it('rejects a direct refusal of crisis_detection', () => {
    expect(directConsentChangeViolation('crisis_detection', false)).toMatchObject({
      code: 'CONSENT_REQUIRED',
    });
  });

  it('allows granting crisis_detection and refusing any other item', () => {
    expect(directConsentChangeViolation('crisis_detection', true)).toBeNull();
    expect(directConsentChangeViolation('journal_storage', false)).toBeNull();
    expect(directConsentChangeViolation('tier3_therapist_alert', false)).toBeNull();
  });
});

describe('R-CONSENT-2: monitoring and journal privacy', () => {
  it('rejects monitoring OFF while the journal is hidden', () => {
    expect(
      journalPrivacyViolation({ privacy: 'hidden_from_therapist', monitoring: 'off' }),
    ).toMatchObject({ code: 'CONSENT_REQUIRED' });
  });

  it('allows monitoring OFF when the therapist can read the journal', () => {
    expect(journalPrivacyViolation({ privacy: 'full_access', monitoring: 'off' })).toBeNull();
  });

  it('allows a hidden journal while monitoring is ON', () => {
    expect(
      journalPrivacyViolation({ privacy: 'hidden_from_therapist', monitoring: 'on' }),
    ).toBeNull();
  });
});

describe('R-CONSENT-1: withdrawal grants journal access', () => {
  it('sets the journal to full access in the same operation', () => {
    expect(withdrawalConfirmationEffects()).toEqual({ journalPrivacy: 'full_access' });
  });
});
