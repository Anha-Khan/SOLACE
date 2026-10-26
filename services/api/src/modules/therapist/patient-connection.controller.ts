import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { InviteService } from './invite.service';

@Controller('v1/patient/connections')
@Roles('patient')
export class PatientConnectionController {
  constructor(private readonly invites: InviteService) {}

  @Get('pending')
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.invites.pendingConnections(user);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invites.patientConfirm(user, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invites.patientDecline(user, id);
  }

  @Post(':id/flag-wrong')
  @HttpCode(HttpStatus.OK)
  flagWrong(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invites.patientFlagWrong(user, id);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  end(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.invites.patientEnd(user, id);
  }
}
