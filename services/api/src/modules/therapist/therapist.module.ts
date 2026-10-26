import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { CrisisModule } from '../crisis/crisis.module';
import { TherapistController } from './therapist.controller';
import { PatientInviteController } from './patient-invite.controller';
import { PatientConnectionController } from './patient-connection.controller';
import { TherapistService } from './therapist.service';
import { InviteService } from './invite.service';
import { TherapistAlertService } from './therapist-alert.service';
import { AccessLogService } from './access-log.service';

@Module({
  imports: [AuthModule, CryptoModule, CrisisModule],
  controllers: [TherapistController, PatientInviteController, PatientConnectionController],
  providers: [TherapistService, InviteService, TherapistAlertService, AccessLogService],
  exports: [InviteService, TherapistAlertService, AccessLogService],
})
export class TherapistModule {}
