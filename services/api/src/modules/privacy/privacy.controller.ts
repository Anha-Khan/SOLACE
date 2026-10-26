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
import { IsBoolean, IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrivacyService } from './privacy.service';

class ExportDto {
  @IsUUID() clientId!: string;
}

class PauseDto {
  @IsBoolean() paused!: boolean;
}

class DeletionDto {
  @IsUUID() clientId!: string;
}

@Controller('v1')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('privacy/access-log')
  accessLog(@CurrentUser() user: AuthenticatedUser) {
    return this.privacy.accessLog(user);
  }

  @Post('privacy/exports')
  @HttpCode(HttpStatus.CREATED)
  requestExport(@CurrentUser() user: AuthenticatedUser, @Body() _dto: ExportDto) {
    return this.privacy.requestExport(user);
  }

  @Get('privacy/exports/:id')
  getExport(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.privacy.getExport(user, id);
  }

  @Post('privacy/pause')
  @HttpCode(HttpStatus.OK)
  pause(@CurrentUser() user: AuthenticatedUser, @Body() dto: PauseDto) {
    return this.privacy.pause(user, dto.paused);
  }

  @Post('account/deletion-requests')
  @HttpCode(HttpStatus.CREATED)
  requestDeletion(@CurrentUser() user: AuthenticatedUser, @Body() _dto: DeletionDto) {
    return this.privacy.requestDeletion(user, 'client');
  }

  @Post('account/deletion-requests/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmDeletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.privacy.confirmDeletion(user, id);
  }
}
