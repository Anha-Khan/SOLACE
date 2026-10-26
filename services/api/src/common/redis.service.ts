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
    // `quit()` would open a connection first if the client is still in `wait`
    // (lazyConnect and nothing ever used Redis). That socket then keeps the
    // process alive. A client that never connected needs `disconnect()`.
    if (this.client.status === 'wait' || this.client.status === 'end') {
      this.client.disconnect();
      return;
    }
    await this.client.quit().catch(() => undefined);
  }
}
