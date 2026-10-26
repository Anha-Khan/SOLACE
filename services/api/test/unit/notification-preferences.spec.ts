import { NON_DISABLEABLE_NOTIFICATION_TYPES } from '../../src/common/enums';
import {
  isDisableable,
  nonDisableableViolation,
  projectNotificationPreferences,
} from '../../src/modules/notifications/rules';

describe('R-NOTIF-4: crisis and connection notifications cannot be disabled', () => {
  it('marks crisis_alert and connection_update as non-disableable', () => {
    expect([...NON_DISABLEABLE_NOTIFICATION_TYPES]).toEqual(['crisis_alert', 'connection_update']);
    expect(isDisableable('crisis_alert')).toBe(false);
    expect(isDisableable('connection_update')).toBe(false);
  });

  it('allows the remaining patient notification types to be toggled', () => {
    expect(isDisableable('daily_checkin')).toBe(true);
    expect(isDisableable('task_reminder')).toBe(true);
    expect(isDisableable('inactivity')).toBe(true);
  });

  it('rejects disabling a non-disableable type only', () => {
    expect(nonDisableableViolation('crisis_alert', false)).toContain('cannot be disabled');
    expect(nonDisableableViolation('connection_update', false)).toContain('cannot be disabled');
    expect(nonDisableableViolation('daily_checkin', false)).toBeNull();
    expect(nonDisableableViolation('crisis_alert', true)).toBeNull();
  });
});

describe('notification preference projection', () => {
  it('returns every type, enabled by default', () => {
    const preferences = projectNotificationPreferences([]);
    expect(preferences.map((entry) => entry.type)).toEqual([
      'crisis_alert',
      'daily_checkin',
      'task_reminder',
      'inactivity',
      'connection_update',
    ]);
    expect(preferences.every((entry) => entry.enabled)).toBe(true);
    expect(preferences.filter((entry) => !entry.disableable).map((entry) => entry.type)).toEqual([
      'crisis_alert',
      'connection_update',
    ]);
  });

  it('honours a stored false for a disableable type', () => {
    const preferences = projectNotificationPreferences([{ type: 'daily_checkin', enabled: false }]);
    expect(preferences.find((entry) => entry.type === 'daily_checkin')).toEqual({
      type: 'daily_checkin',
      enabled: false,
      disableable: true,
    });
  });

  it('ignores a stale stored false for a non-disableable type', () => {
    const preferences = projectNotificationPreferences([
      { type: 'crisis_alert', enabled: false },
      { type: 'connection_update', enabled: false },
    ]);
    expect(preferences.find((entry) => entry.type === 'crisis_alert')).toEqual({
      type: 'crisis_alert',
      enabled: true,
      disableable: false,
    });
    expect(preferences.find((entry) => entry.type === 'connection_update')?.enabled).toBe(true);
  });
});
