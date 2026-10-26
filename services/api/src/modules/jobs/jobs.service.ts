import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  async restrictionTick(): Promise<void> {
    // shortcut: restriction tick not scheduled, when to upgrade: add BullMQ repeatable job + batch user iteration.
  }

  async inactivityCheck(): Promise<void> {
    // shortcut: inactivity notifications not implemented, when to upgrade: add notification scheduling.
  }

  async licenceCheck(): Promise<void> {
    // shortcut: licence re-verification not implemented, when to upgrade: add TherapistProfile expiry checks.
  }

  async aiQueueRetry(): Promise<void> {
    // shortcut: queued journal scan retry not implemented, when to upgrade: add AiScan retry logic.
  }

  async retentionPurge(): Promise<void> {
    // shortcut: retention purge not scheduled, when to upgrade: add BullMQ repeatable job calling RetentionService.purge().
  }
}
