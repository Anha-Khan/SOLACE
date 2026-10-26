import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { CONFIG } from '../config/config';
import type { AppConfig } from '../config/config';

export const REDIS = Symbol('REDIS');

/**
 * Redis is used only for BullMQ queues and escalation timers. Losing Redis must
 * never lose an alert; PostgreSQL holds every alert state (ADR-3).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(CONFIG) config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.client.on('error', () => {
      // Connection state is reported by /ready. Do not log the URL.
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit().catch(() => undefined);
    }
  }
}
