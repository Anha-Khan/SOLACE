import { NON_DISABLEABLE_NOTIFICATION_TYPES, NOTIFICATION_TYPES } from '../../common/enums';
import type { NotificationType } from '../../common/enums';

export interface NotificationPreferenceView {
  type: NotificationType;
  enabled: boolean;
  disableable: boolean;
}

export interface PreferenceRow {
  type: NotificationType;
  enabled: boolean;
}

/** R-NOTIF-4: crisis resource nudges and connection status cannot be disabled. */
export function isDisableable(type: NotificationType): boolean {
  return !NON_DISABLEABLE_NOTIFICATION_TYPES.includes(type);
}

export function nonDisableableViolation(type: NotificationType, enabled: boolean): string | null {
  if (!enabled && !isDisableable(type)) {
    return `${type} cannot be disabled`;
  }
  return null;
}

/**
 * Every type always appears, even when the user has no stored row, so the client
 * never has to distinguish "absent" from "on". A stored `false` for a
 * non-disableable type is ignored: the rule wins over stale data.
 */
export function projectNotificationPreferences(
  rows: readonly PreferenceRow[],
): NotificationPreferenceView[] {
  const stored = new Map<NotificationType, boolean>();
  for (const row of rows) {
    stored.set(row.type, row.enabled);
  }

  return NOTIFICATION_TYPES.map((type) => {
    const disableable = isDisableable(type);
    return {
      type,
      enabled: disableable ? (stored.get(type) ?? true) : true,
      disableable,
    };
  });
}
