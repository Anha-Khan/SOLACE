import { ConnectionState } from '../../../common/enums';

export const ConnectionEvent = {
  /** The invited therapist accepts the invite. */
  therapist_accepts: 'therapist_accepts',
  /** The patient confirms the connection. The only path to `active`. */
  patient_confirms: 'patient_confirms',
  patient_declines: 'patient_declines',
  patient_flags_wrong: 'patient_flags_wrong',
  patient_ends: 'patient_ends',
  therapist_licence_revoked: 'therapist_licence_revoked',
  invite_expired: 'invite_expired',
} as const;
export type ConnectionEvent = (typeof ConnectionEvent)[keyof typeof ConnectionEvent];

export class InvalidConnectionTransition extends Error {
  constructor(
    public readonly from: ConnectionState,
    public readonly event: ConnectionEvent,
  ) {
    super(`Invalid connection transition: ${from} does not accept "${event}"`);
    this.name = 'InvalidConnectionTransition';
  }
}

/**
 * Connection state machine (R-CONN-1..3, B06, N02, N03). Pure.
 * The critical rule: `active` is reachable only from
 * `awaiting_patient_confirmation` via `patient_confirms`. A therapist can never
 * activate a connection on their own.
 */
const TRANSITIONS: Readonly<
  Record<ConnectionState, Partial<Record<ConnectionEvent, ConnectionState>>>
> = {
  pending_therapist: {
    therapist_accepts: ConnectionState.awaiting_patient_confirmation,
    invite_expired: ConnectionState.ended,
  },
  awaiting_patient_confirmation: {
    patient_confirms: ConnectionState.active,
    patient_declines: ConnectionState.ended,
    patient_flags_wrong: ConnectionState.flagged_wrong,
    invite_expired: ConnectionState.ended,
  },
  active: {
    patient_ends: ConnectionState.ended,
    patient_flags_wrong: ConnectionState.flagged_wrong,
    therapist_licence_revoked: ConnectionState.ended,
  },
  flagged_wrong: {
    patient_ends: ConnectionState.ended,
  },
  ended: {},
};

export function connectionTransition(
  current: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  const next = TRANSITIONS[current][event];
  if (!next) throw new InvalidConnectionTransition(current, event);
  return next;
}

export function canTransitionConnection(current: ConnectionState, event: ConnectionEvent): boolean {
  return TRANSITIONS[current][event] !== undefined;
}

export function isActive(state: ConnectionState): boolean {
  return state === ConnectionState.active;
}
