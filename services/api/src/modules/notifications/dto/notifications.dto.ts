import { IsBoolean, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const DEVICE_PLATFORMS = ['android', 'ios'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  fcmToken!: string;

  @IsIn(DEVICE_PLATFORMS)
  platform!: DevicePlatform;
}

export class SetNotificationPreferenceDto {
  @IsBoolean()
  enabled!: boolean;
}
