import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis.service';
import { CONFIG } from '../../config/config';
import type { AppConfig } from '../../config/config';

export const ESCALATION_QUEUE = 'escalation';

export interface EscalationJobData {
  alertId: string;
  userId: string;
  step: 't0' | 't30' | 't2h' | 't6h';
}

@Injectable()
export class EscalationQueue implements OnModuleInit {
  readonly queue: Queue<EscalationJobData>;

  constructor(
    private readonly redisService: RedisService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {
    this.queue = new Queue<EscalationJobData>(ESCALATION_QUEUE, {
      connection: this.redisService.client,
    });
  }

  async onModuleInit(): Promise<void> {
    // Reconcile: re-schedule missing jobs for open alerts. Done in CrisisService on boot.
  }

  async schedule(alertId: string, userId: string, historical: boolean): Promise<void> {
    if (historical) return;
    const scale = this.config.timerScale ?? 1;
    const steps: Array<[EscalationJobData['step'], number]> = [
      ['t0', 0],
      ['t30', 30 * 60 * 1000],
      ['t2h', 2 * 60 * 60 * 1000],
      ['t6h', 6 * 60 * 60 * 1000],
    ];
    for (const [step, delay] of steps) {
      await this.queue.add(
        step,
        { alertId, userId, step },
        { delay: Math.round(delay * scale), jobId: `${alertId}-${step}` },
      );
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
