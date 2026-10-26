import { Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DeviceRepository } from './device.repository';
import type { RegisterDeviceDto } from './dto/notifications.dto';

export interface DeviceSummaryView {
  id: string;
  platform: string;
  lastSeenAt: Date;
}

@Injectable()
export class DeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  async register(user: AuthenticatedUser, dto: RegisterDeviceDto): Promise<DeviceSummaryView> {
    const device = await this.devices.upsert({
      userId: user.id,
      fcmToken: dto.fcmToken,
      platform: dto.platform,
    });
    return {
      id: device.id,
      platform: device.platform,
      lastSeenAt: device.lastSeenAt,
    };
  }

  async unregister(user: AuthenticatedUser, id: string): Promise<null> {
    const removed = await this.devices.remove(user.id, id);
    if (!removed) {
      // Same response whether the device never existed or belongs to someone
      // else: a caller cannot probe another account's device ids.
      throw new ApiError('NOT_FOUND', 'Device not found');
    }
    return null;
  }
}
