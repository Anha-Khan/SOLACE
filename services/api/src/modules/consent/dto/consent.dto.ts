import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SetConsentDto {
  @IsBoolean()
  granted!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}

export class StartWithdrawalDto {
  /** Retrying with the same clientId returns the original request. */
  @IsUUID()
  clientId!: string;
}
