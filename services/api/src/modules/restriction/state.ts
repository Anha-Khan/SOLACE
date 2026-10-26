export const RestrictionEvent = {
  day_advanced: 'day_advanced',
  invite_pending: 'invite_pending',
  invite_resolved: 'invite_resolved',
  pause: 'pause',
  resume: 'resume',
} as const;
export type RestrictionEvent = (typeof RestrictionEvent)[keyof typeof RestrictionEvent];

export class InvalidRestrictionTransition extends Error {
  constructor(
    public readonly from: string,
    public readonly event: RestrictionEvent,
  ) {
    super(`Invalid restriction transition: ${from} does not accept "${event}"`);
    this.name = 'InvalidRestrictionTransition';
  }
}

export type RestrictionLevel = 'none' | 'level1' | 'level2' | 'level3';

export function levelForDay(day: number): RestrictionLevel {
  if (day <= 14) return 'level1';
  if (day <= 30) return 'level2';
  return 'level3';
}

export function pauseCapDays(): number {
  return 14;
}
