import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CheckInService } from './checkin.service';

class CreateCheckInDto {
  @IsUUID() clientId!: string;
  @IsInt() @Min(1) @Max(10) mood!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) feelingWords?: string[];
  @IsOptional() @IsString() bodySignal?: string;
  @IsOptional() @IsString() taskReflection?: string;
  @IsString() clientCreatedAt!: string;
}

@Controller('v1/check-ins')
export class CheckInController {
  constructor(private readonly checkins: CheckInService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckInDto) {
    return this.checkins.create(user.id, {
      clientId: dto.clientId,
      mood: dto.mood,
      feelingWords: dto.feelingWords,
      bodySignal: dto.bodySignal,
      taskReflection: dto.taskReflection,
      clientCreatedAt: dto.clientCreatedAt,
    });
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.checkins.list(user.id, Number.isNaN(d) ? 30 : d);
  }
}
