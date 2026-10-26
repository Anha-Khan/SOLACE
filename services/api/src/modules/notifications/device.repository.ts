import { Injectable } from '@nestjs/common';
import type { DeviceToken } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * An FCM token identifies a device, not a user. If the device is handed to a
   * different account, the token is reassigned, so the previous user stops
   * receiving its notifications. The unique token means this cannot create a
   * duplicate row.
   */
  upsert(input: { userId: string; fcmToken: string; platform: string }): Promise<DeviceToken> {
    return this.prisma.deviceToken.upsert({
      where: { fcmToken: input.fcmToken },
      create: {
        userId: input.userId,
        fcmToken: input.fcmToken,
        platform: input.platform,
      },
      update: {
        userId: input.userId,
        platform: input.platform,
        lastSeenAt: new Date(),
      },
    });
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.deviceToken.deleteMany({ where: { id, userId } });
    return result.count === 1;
  }
}
