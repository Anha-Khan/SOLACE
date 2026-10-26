import { Inject, Injectable } from '@nestjs/common';
import type { AppConfig } from '../../config/config';
import { CONFIG } from '../../config/config';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { ApiError } from '../../common/errors';

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS).unref(),
    ),
  ]);
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): { status: 'ok'; version: string } {
    return { status: 'ok', version: '0.1.0' };
  }

  async readiness(): Promise<{
    status: 'ok';
    checks: { postgres: 'ok'; redis: 'ok' };
    resourcesVerifiedAt: string;
  }> {
    const failures: string[] = [];

    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, 'postgres');
    } catch {
      failures.push('postgres');
    }

    try {
      if (this.redis.client.status === 'wait' || this.redis.client.status === 'end') {
        await this.redis.client.connect();
      }
      await withTimeout(this.redis.client.ping(), 'redis');
    } catch {
      failures.push('redis');
    }

    if (failures.length > 0) {
      throw new ApiError(
        'DEPENDENCY_UNAVAILABLE',
        `Dependency unavailable: ${failures.join(', ')}`,
      );
    }

    return {
      status: 'ok',
      checks: { postgres: 'ok', redis: 'ok' },
      resourcesVerifiedAt: this.config.resourcesVerifiedAt,
    };
  }
}
