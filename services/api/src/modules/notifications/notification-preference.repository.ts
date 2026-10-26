import { Injectable } from '@nestjs/common';
import type { NotificationPreference } from '@prisma/client';
import type { NotificationType } from '../../common/enums';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  set(userId: string, type: NotificationType, enabled: boolean): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, enabled },
      update: { enabled },
    });
  }
}
