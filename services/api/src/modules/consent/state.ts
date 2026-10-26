import type { WithdrawalStatus } from '../../common/enums';

/** Monitoring is a two-value state derived from the latest consent record (R-CONSENT-1). */
export const MonitoringState = {
  on: 'on',
  off: 'off',
} as const;
export type MonitoringState = (typeof MonitoringState)[keyof typeof MonitoringState];

export function monitoringStateFrom(granted: boolean): MonitoringState {
  return granted ? MonitoringState.on : MonitoringState.off;
}

/** The withdrawal request lifecycle. `pending` is the only non-terminal state. */
export const WithdrawalEvent = {
  confirm: 'confirm',
  cancel: 'cancel',
  expire: 'expire',
} as const;
export type WithdrawalEvent = (typeof WithdrawalEvent)[keyof typeof WithdrawalEvent];

export class InvalidWithdrawalTransition extends Error {
  constructor(
    public readonly from: WithdrawalStatus,
    public readonly event: WithdrawalEvent,
  ) {
    super(`Invalid withdrawal transition: ${from} does not accept "${event}"`);
    this.name = 'InvalidWithdrawalTransition';
  }
}

/**
 * Two-step crisis-monitoring withdrawal (R-CONSENT-3). Pure: no database, no
 * clock. Confirmation is the only path to `confirmed`; a terminal request can
 * never move again, so a replayed confirmation cannot append a second refusal.
 */
export function transitionWithdrawal(
  from: WithdrawalStatus,
  event: WithdrawalEvent,
): WithdrawalStatus {
  if (from === 'pending') {
    switch (event) {
      case 'confirm':
        return 'confirmed';
      case 'cancel':
        return 'cancelled';
      case 'expire':
        return 'expired';
    }
  }
  throw new InvalidWithdrawalTransition(from, event);
}
