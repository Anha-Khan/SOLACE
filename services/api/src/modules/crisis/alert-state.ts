import { AlertState } from '../../common/enums';

/** Alert lifecycle events. `escalate_external` is not here: it is a flag, not a state. */
export const AlertEventType = {
  dispatch: 'dispatch',
  deliver: 'deliver',
  acknowledge: 'acknowledge',
  undo_acknowledge: 'undo_acknowledge',
  contact_patient: 'contact_patient',
  resolve: 'resolve',
  close: 'close',
  auto_close: 'auto_close',
} as const;
export type AlertEventType = (typeof AlertEventType)[keyof typeof AlertEventType];

export class InvalidTransition extends Error {
  constructor(
    public readonly from: AlertState,
    public readonly event: AlertEventType,
  ) {
    super(`Invalid alert transition: ${from} does not accept "${event}"`);
    this.name = 'InvalidTransition';
  }
}

/**
 * The alert state machine. Pure: no database, no HTTP, no clock (B01, ADR-3).
 * Time-based rules (the 60-second undo window, auto-close after 24 hours) are
 * enforced by the service that owns the clock, not here.
 *
 * ASSUMPTION: the spec's B01 transition table is not in this repository. The
 * transitions below are derived from docs/plan-backend.md (AlertState list,
 * R-ALERT-1, R-ESC-3) and must be reconciled with B01 when the spec lands.
 */
const TRANSITIONS: Readonly<Record<AlertState, Partial<Record<AlertEventType, AlertState>>>> = {
  detected: {
    dispatch: AlertState.dispatched,
    close: AlertState.closed,
    auto_close: AlertState.closed,
  },
  dispatched: {
    deliver: AlertState.delivered,
    close: AlertState.closed,
    auto_close: AlertState.closed,
  },
  delivered: {
    acknowledge: AlertState.acknowledged,
    contact_patient: AlertState.patient_contacted,
    close: AlertState.closed,
    auto_close: AlertState.closed,
  },
  acknowledged: {
    undo_acknowledge: AlertState.delivered,
    contact_patient: AlertState.patient_contacted,
    resolve: AlertState.resolved,
    close: AlertState.closed,
    auto_close: AlertState.closed,
  },
  patient_contacted: {
    resolve: AlertState.resolved,
    close: AlertState.closed,
    auto_close: AlertState.closed,
  },
  resolved: {
    close: AlertState.closed,
  },
  closed: {},
};

export function transition(current: AlertState, event: AlertEventType): AlertState {
  const next = TRANSITIONS[current][event];
  if (!next) throw new InvalidTransition(current, event);
  return next;
}

export function canTransition(current: AlertState, event: AlertEventType): boolean {
  return TRANSITIONS[current][event] !== undefined;
}

/** States from which an escalation timer must not send anything (R-ESC, Phase 5). */
export function isEscalationStopped(state: AlertState): boolean {
  return (
    state === AlertState.acknowledged ||
    state === AlertState.patient_contacted ||
    state === AlertState.resolved ||
    state === AlertState.closed
  );
}
