import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CrisisService } from './crisis.service';

class CrisisCheckDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  clientCreatedAt?: string;
}

class SelfInitiatedDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsString()
  clientCreatedAt?: string;
}

class PatientConsentDto {
  @IsBoolean()
  consent!: boolean;
}

@Controller('v1/crisis')
export class CrisisController {
  constructor(private readonly crisis: CrisisService) {}

  @Post('checks')
  @HttpCode(HttpStatus.OK)
  check(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CrisisCheckDto,
  ): ReturnType<CrisisService['check']> {
    const created = dto.clientCreatedAt ? new Date(dto.clientCreatedAt) : undefined;
    return this.crisis.check(user, dto.text, created);
  }

  @Post('self-initiated')
  selfInitiated(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelfInitiatedDto,
  ): ReturnType<CrisisService['selfInitiated']> {
    const created = dto.clientCreatedAt ? new Date(dto.clientCreatedAt) : undefined;
    return this.crisis.selfInitiated(user, created);
  }

  @Post('alerts/:id/patient-consent')
  @HttpCode(HttpStatus.OK)
  patientConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PatientConsentDto,
  ): ReturnType<CrisisService['patientConsent']> {
    return this.crisis.patientConsent(user, id, dto.consent);
  }

  @Public()
  @Get('resources')
  resources(): ReturnType<CrisisService['resources']> {
    return this.crisis.resources();
  }
}
