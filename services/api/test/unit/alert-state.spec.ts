import { ALERT_STATES, type AlertState } from '../../src/common/enums';
import {
  AlertEventType,
  InvalidTransition,
  canTransition,
  isEscalationStopped,
  transition,
} from '../../src/modules/crisis/alert-state';

/**
 * Table from docs/plan-backend.md (B01 is not in the repo yet; see the
 * ASSUMPTION note in alert-state.ts). Every accepted pair is listed here and
 * every other pair must throw.
 */
const ACCEPTED: ReadonlyArray<readonly [AlertState, AlertEventType, AlertState]> = [
  ['detected', 'dispatch', 'dispatched'],
  ['detected', 'close', 'closed'],
  ['detected', 'auto_close', 'closed'],
  ['dispatched', 'deliver', 'delivered'],
  ['dispatched', 'close', 'closed'],
  ['dispatched', 'auto_close', 'closed'],
  ['delivered', 'acknowledge', 'acknowledged'],
  ['delivered', 'contact_patient', 'patient_contacted'],
  ['delivered', 'close', 'closed'],
  ['delivered', 'auto_close', 'closed'],
  ['acknowledged', 'undo_acknowledge', 'delivered'],
  ['acknowledged', 'contact_patient', 'patient_contacted'],
  ['acknowledged', 'resolve', 'resolved'],
  ['acknowledged', 'close', 'closed'],
  ['acknowledged', 'auto_close', 'closed'],
  ['patient_contacted', 'resolve', 'resolved'],
  ['patient_contacted', 'close', 'closed'],
  ['patient_contacted', 'auto_close', 'closed'],
  ['resolved', 'close', 'closed'],
];

describe('alert state machine', () => {
  it.each(ACCEPTED)('%s + %s -> %s', (from, event, expected) => {
    expect(transition(from, event)).toBe(expected);
    expect(canTransition(from, event)).toBe(true);
  });

  it('rejects every pair that is not in the table', () => {
    const accepted = new Set(ACCEPTED.map(([from, event]) => `${from}:${event}`));
    const allEvents = Object.values(AlertEventType);
    let rejected = 0;

    for (const from of ALERT_STATES) {
      for (const event of allEvents) {
        if (accepted.has(`${from}:${event}`)) continue;
        rejected += 1;
        expect(() => transition(from, event)).toThrow(InvalidTransition);
        expect(canTransition(from, event)).toBe(false);
      }
    }

    expect(rejected).toBeGreaterThan(0);
    // 7 states x 8 events minus 19 accepted transitions.
    expect(rejected).toBe(37);
  });

  it('never reopens a closed alert', () => {
    for (const event of Object.values(AlertEventType)) {
      expect(canTransition('closed', event)).toBe(false);
    }
  });

  it('treats undo as a real transition back to delivered', () => {
    expect(transition('acknowledged', 'undo_acknowledge')).toBe('delivered');
  });

  it('stops escalation only from acknowledged onward (R-ESC, Phase 5)', () => {
    expect(isEscalationStopped('detected')).toBe(false);
    expect(isEscalationStopped('dispatched')).toBe(false);
    expect(isEscalationStopped('delivered')).toBe(false);
    expect(isEscalationStopped('acknowledged')).toBe(true);
    expect(isEscalationStopped('patient_contacted')).toBe(true);
    expect(isEscalationStopped('resolved')).toBe(true);
    expect(isEscalationStopped('closed')).toBe(true);
  });

  it('has no path from detected to resolved, so an alert cannot be closed unreviewed through resolve', () => {
    expect(canTransition('detected', 'resolve')).toBe(false);
    expect(canTransition('dispatched', 'resolve')).toBe(false);
    expect(canTransition('delivered', 'resolve')).toBe(false);
  });
});
