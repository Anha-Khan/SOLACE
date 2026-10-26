export interface NotificationDecision {
  allow: boolean;
  reason?: string;
}

export function shouldSendNotification(input: {
  type: string;
  isCrisisType: boolean;
  pausedUntil: Date | null;
  now: Date;
  sentToday: number;
  sentLast24h: number;
  checkInComplete: boolean;
  taskComplete: boolean;
  quietStart: number; // hour
  quietEnd: number; // hour
}): NotificationDecision {
  if (input.isCrisisType) return { allow: true };
  if (input.pausedUntil && input.now < input.pausedUntil) {
    return { allow: false, reason: 'paused' };
  }
  const hour = input.now.getHours();
  const inQuiet =
    input.quietStart > input.quietEnd
      ? hour >= input.quietStart || hour < input.quietEnd
      : hour >= input.quietStart && hour < input.quietEnd;
  if (inQuiet) return { allow: false, reason: 'quiet_hours' };
  if (input.sentToday >= 1) return { allow: false, reason: 'daily_cap' };
  if (input.sentLast24h >= 2) return { allow: false, reason: '24h_cap' };
  if (input.checkInComplete && input.taskComplete) return { allow: false, reason: 'day_complete' };
  return { allow: true };
}
