import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  IsArray,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CrisisService } from '../crisis/crisis.service';

class SyncItemDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  type!: string;

  @IsISO8601()
  clientCreatedAt!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class SyncBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  items!: SyncItemDto[];
}

@Controller('v1/sync')
export class SyncController {
  constructor(private readonly crisis: CrisisService) {}

  @Post('items')
  @HttpCode(HttpStatus.OK)
  sync(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncBatchDto,
  ): ReturnType<CrisisService['syncItems']> {
    return this.crisis.syncItems(user, dto.items);
  }
}
