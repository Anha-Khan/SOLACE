import { Module } from '@nestjs/common';
import { DeviceRepository } from './device.repository';
import { DeviceService } from './device.service';
import { NotificationPreferenceRepository } from './notification-preference.repository';
import { NotificationPreferenceService } from './notification-preference.service';
import { DeviceController, NotificationPreferenceController } from './notifications.controller';

@Module({
  controllers: [DeviceController, NotificationPreferenceController],
  providers: [
    DeviceRepository,
    DeviceService,
    NotificationPreferenceRepository,
    NotificationPreferenceService,
  ],
  exports: [DeviceService, NotificationPreferenceService],
})
export class NotificationsModule {}
