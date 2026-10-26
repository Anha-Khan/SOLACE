import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CONFIG } from '../config/config';
import type { AppConfig } from '../config/config';
import { Inject } from '@nestjs/common';

/**
 * The single Prisma client. Services must never import PrismaClient directly;
 * all queries live in *.repository.ts files (Phase 7).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(CONFIG) config: AppConfig) {
    super({ datasourceUrl: config.databaseUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
