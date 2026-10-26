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
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TherapistService } from './therapist.service';
import { InviteService } from './invite.service';
import { TherapistAlertService } from './therapist-alert.service';
import { AccessLogService } from './access-log.service';

class OnboardingDto {
  @IsString() licenceNumber!: string;
  @IsString() professionalBody!: string;
  @IsString() countryOfPractice!: string;
  @IsOptional() @IsString() password?: string;
}

class AckDto {
  @IsBoolean() dsa!: boolean;
  @IsBoolean() crisisResponsibilities!: boolean;
  @IsBoolean() emergencyStatement!: boolean;
}

class AcceptInviteDto {
  @IsString() token!: string;
}

@Controller('v1/therapist')
@Roles('therapist')
export class TherapistController {
  constructor(
    private readonly therapist: TherapistService,
    private readonly invites: InviteService,
    private readonly alerts: TherapistAlertService,
    private readonly accessLog: AccessLogService,
  ) {}

  @Post('onboarding')
  onboarding(@CurrentUser() user: AuthenticatedUser, @Body() dto: OnboardingDto) {
    return this.therapist.onboarding(user, dto);
  }

  @Post('acknowledgements')
  @HttpCode(HttpStatus.OK)
  acknowledge(@CurrentUser() user: AuthenticatedUser, @Body() _dto: AckDto) {
    return this.therapist.acknowledge(user);
  }

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvite(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInviteDto) {
    return this.invites.acceptInvite(dto.token, user);
  }

  @Get('alerts')
  listAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.alerts.listAlerts(user);
  }

  @Get('alerts/:id')
  async getAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const alert = await this.alerts.getAlert(user, id);
    await this.accessLog.log(alert.userId, user.id, 'crisis_alert');
    return alert;
  }

  @Post('alerts/:id/review')
  @HttpCode(HttpStatus.OK)
  review(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.alerts.review(user, id);
  }

  @Post('alerts/:id/review/undo')
  @HttpCode(HttpStatus.OK)
  undo(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.alerts.undoReview(user, id);
  }

  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: { checklist: Record<string, boolean> },
  ) {
    return this.alerts.resolve(user, id, dto.checklist);
  }

  @Get('patients')
  patients(@CurrentUser() user: AuthenticatedUser) {
    return this.invites.listPatients(user);
  }
}
