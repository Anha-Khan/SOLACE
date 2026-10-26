import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InviteService } from './invite.service';

class CreateInviteDto {
  @IsEmail() therapistEmail!: string;
  @IsString() @MaxLength(80) patientFirstName!: string;
}

@Controller('v1/patient')
@Roles('patient')
export class PatientInviteController {
  constructor(private readonly invites: InviteService) {}

  @Post('invites')
  createInvite(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInviteDto) {
    return this.invites.createInvite(user, dto.therapistEmail, dto.patientFirstName);
  }
}
