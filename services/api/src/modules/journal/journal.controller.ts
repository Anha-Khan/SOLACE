import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { IsIn, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JournalService } from './journal.service';

class CreateEntryDto {
  @IsUUID() clientId!: string;
  @IsString() text!: string;
  @IsString() clientCreatedAt!: string;
}

class PrivacyDto {
  @IsIn(['hidden_from_therapist', 'progress_only', 'full_access']) journalPrivacy!: string;
}

@Controller('v1/journal')
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Post(':kind/entries')
  @HttpCode(HttpStatus.OK)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('kind') kind: string,
    @Body() dto: CreateEntryDto,
  ) {
    if (kind !== 'recovery' && kind !== 'personal') throw new Error('invalid kind');
    return this.journal.createEntry(user, kind as 'recovery' | 'personal', dto);
  }

  @Get(':kind/entries')
  list(@CurrentUser() user: AuthenticatedUser, @Param('kind') kind: string) {
    if (kind !== 'recovery' && kind !== 'personal') throw new Error('invalid kind');
    return this.journal.listEntries(user, kind as 'recovery' | 'personal');
  }

  @Put('privacy')
  @HttpCode(HttpStatus.OK)
  privacy(@CurrentUser() user: AuthenticatedUser, @Body() dto: PrivacyDto) {
    return this.journal.setPrivacy(user, dto.journalPrivacy as never);
  }
}
