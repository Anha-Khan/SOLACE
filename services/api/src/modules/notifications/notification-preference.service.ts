import { Injectable } from '@nestjs/common';
import { isNotificationType } from '../../common/enums';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationPreferenceRepository } from './notification-preference.repository';
import { isDisableable, nonDisableableViolation, projectNotificationPreferences } from './rules';
import type { NotificationPreferenceView } from './rules';

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly preferences: NotificationPreferenceRepository) {}

  async list(user: AuthenticatedUser): Promise<NotificationPreferenceView[]> {
    const rows = await this.preferences.list(user.id);
    return projectNotificationPreferences(rows);
  }

  async set(
    user: AuthenticatedUser,
    type: string,
    enabled: boolean,
  ): Promise<NotificationPreferenceView> {
    if (!isNotificationType(type)) {
      throw new ApiError('VALIDATION_FAILED', `Unknown notification type "${type}"`);
    }

    const violation = nonDisableableViolation(type, enabled);
    if (violation) {
      throw new ApiError('FORBIDDEN', violation);
    }

    if (!isDisableable(type)) {
      // Turning a non-disableable type on is a no-op; it is always on.
      return { type, enabled: true, disableable: false };
    }

    const row = await this.preferences.set(user.id, type, enabled);
    return { type: row.type, enabled: row.enabled, disableable: true };
  }
}
