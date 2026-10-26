import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DeviceService } from './device.service';
import { SetNotificationPreferenceDto, RegisterDeviceDto } from './dto/notifications.dto';
import { NotificationPreferenceService } from './notification-preference.service';

@Controller('v1/devices')
export class DeviceController {
  constructor(private readonly devices: DeviceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ): ReturnType<DeviceService['register']> {
    return this.devices.register(user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  unregister(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): ReturnType<DeviceService['unregister']> {
    return this.devices.unregister(user, id);
  }
}

@Controller('v1/notification-preferences')
export class NotificationPreferenceController {
  constructor(private readonly preferences: NotificationPreferenceService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): ReturnType<NotificationPreferenceService['list']> {
    return this.preferences.list(user);
  }

  @Put(':type')
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Body() dto: SetNotificationPreferenceDto,
  ): ReturnType<NotificationPreferenceService['set']> {
    return this.preferences.set(user, type, dto.enabled);
  }
}
