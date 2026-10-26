import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

const TEXT_MAX = 2000;

/** Bulk replace. An omitted field is cleared (the contract calls this "replace"). */
export class SafetyPlanFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  field1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  field2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  field3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  field4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  field5?: string;
}

export class SetSafetyPlanFieldDto {
  @IsString()
  @MaxLength(TEXT_MAX)
  text!: string;
}

export class SafetyPlanSharingDto {
  @IsBoolean()
  sharedWithTherapist!: boolean;
}
