import { Module } from '@nestjs/common';
import { CrisisController } from './crisis.controller';
import { CrisisRepository } from './crisis.repository';
import { CrisisService } from './crisis.service';
import { EscalationProcessor } from './escalation.processor';
import { EscalationQueue } from './escalation.queue';

@Module({
  controllers: [CrisisController],
  providers: [CrisisRepository, CrisisService, EscalationQueue, EscalationProcessor],
  exports: [CrisisService, EscalationQueue, CrisisRepository],
})
export class CrisisModule {}
