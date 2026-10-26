import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { RedisService } from '../../common/redis.service';
import { LOGGER } from '../../common/logger.module';
import type { Logger } from 'pino';
import { CrisisRepository } from './crisis.repository';
import { isEscalationStopped } from './alert-state';
import { AlertState } from '../../common/enums';
import { ESCALATION_QUEUE, type EscalationJobData } from './escalation.queue';

@Injectable()
export class EscalationProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<EscalationJobData> | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly repo: CrisisRepository,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<EscalationJobData>(
      ESCALATION_QUEUE,
      async (job) => {
        const alert = await this.repo.findAlert(job.data.alertId);
        if (!alert) return;
        if (isEscalationStopped(alert.state as AlertState)) return;
        if (job.data.step === 't6h') {
          await this.repo.markEscalatedExternal(alert.id);
          await this.repo
            .transitionAlert(alert.id, 'close', 'system', 'auto_escalated_external')
            .catch(() => undefined);
        }
        this.logger.info({ alertId: alert.id, step: job.data.step }, 'escalation step fired');
      },
      { connection: this.redisService.client },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error({ jobId: job?.id, err: err.message }, 'escalation job failed');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
