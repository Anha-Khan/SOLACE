import {
  ConnectionEvent,
  InvalidConnectionTransition,
  canTransitionConnection,
  connectionTransition,
  isActive,
} from '../../src/modules/therapist/connections/state';

const ACCEPTED: ReadonlyArray<readonly [string, ConnectionEvent, string]> = [
  ['pending_therapist', 'therapist_accepts', 'awaiting_patient_confirmation'],
  ['pending_therapist', 'invite_expired', 'ended'],
  ['awaiting_patient_confirmation', 'patient_confirms', 'active'],
  ['awaiting_patient_confirmation', 'patient_declines', 'ended'],
  ['awaiting_patient_confirmation', 'patient_flags_wrong', 'flagged_wrong'],
  ['awaiting_patient_confirmation', 'invite_expired', 'ended'],
  ['active', 'patient_ends', 'ended'],
  ['active', 'patient_flags_wrong', 'flagged_wrong'],
  ['active', 'therapist_licence_revoked', 'ended'],
  ['flagged_wrong', 'patient_ends', 'ended'],
];

describe('connection state machine', () => {
  it.each(ACCEPTED)('%s + %s -> %s', (from, event, expected) => {
    expect(connectionTransition(from as never, event)).toBe(expected);
  });

  it('rejects active directly from pending_therapist (a therapist cannot self-activate)', () => {
    expect(() => connectionTransition('pending_therapist', 'patient_confirms')).toThrow(
      InvalidConnectionTransition,
    );
    expect(canTransitionConnection('pending_therapist', 'patient_confirms')).toBe(false);
  });

  it('requires the patient to confirm after the therapist accepts', () => {
    const afterAccept = connectionTransition('pending_therapist', 'therapist_accepts');
    expect(afterAccept).toBe('awaiting_patient_confirmation');
    expect(isActive(afterAccept)).toBe(false);
    expect(connectionTransition(afterAccept, 'patient_confirms')).toBe('active');
  });

  it('lets only the patient end an active connection', () => {
    expect(connectionTransition('active', 'patient_ends')).toBe('ended');
    expect(canTransitionConnection('active', 'therapist_accepts')).toBe(false);
  });

  it('is terminal once ended', () => {
    for (const event of Object.values(ConnectionEvent)) {
      expect(canTransitionConnection('ended', event)).toBe(false);
    }
  });

  it('suspends the connection when a licence is revoked', () => {
    expect(connectionTransition('active', 'therapist_licence_revoked')).toBe('ended');
  });
});
