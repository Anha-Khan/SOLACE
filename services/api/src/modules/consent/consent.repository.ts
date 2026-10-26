import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ConsentRecord, CrisisMonitoringWithdrawal } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import type { ConsentItem, ConsentSource, JournalPrivacy } from '../../common/enums';

/**
 * Consent persistence. The table is append-only at the application role by
 * database grant, so this repository only ever inserts consent rows. The one
 * place a consent row is created alongside another write is the withdrawal
 * confirmation, which runs in a single transaction.
 */
@Injectable()
export class ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  listRecords(userId: string): Promise<ConsentRecord[]> {
    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });
  }

  append(input: {
    userId: string;
    item: ConsentItem;
    granted: boolean;
    source: ConsentSource;
    appVersion: string | null;
  }): Promise<ConsentRecord> {
    return this.prisma.consentRecord.create({ data: input });
  }

  findWithdrawalByClientId(
    userId: string,
    clientId: string,
  ): Promise<CrisisMonitoringWithdrawal | null> {
    return this.prisma.crisisMonitoringWithdrawal.findUnique({
      where: { userId_clientId: { userId, clientId } },
    });
  }

  async createWithdrawal(input: {
    userId: string;
    clientId: string;
    expiresAt: Date;
  }): Promise<CrisisMonitoringWithdrawal> {
    try {
      // Retrying step 1 with the same clientId returns the original request.
      return await this.prisma.crisisMonitoringWithdrawal.upsert({
        where: { userId_clientId: { userId: input.userId, clientId: input.clientId } },
        create: {
          userId: input.userId,
          clientId: input.clientId,
          status: 'pending',
          expiresAt: input.expiresAt,
        },
        update: {},
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.findWithdrawalByClientId(input.userId, input.clientId);
        if (existing) return existing;
      }
      throw error;
    }
  }

  findWithdrawal(id: string, userId: string): Promise<CrisisMonitoringWithdrawal | null> {
    return this.prisma.crisisMonitoringWithdrawal.findFirst({ where: { id, userId } });
  }

  async markExpired(id: string, userId: string): Promise<void> {
    await this.prisma.crisisMonitoringWithdrawal.updateMany({
      where: { id, userId, status: 'pending' },
      data: { status: 'expired' },
    });
  }

  /**
   * Step 2 (R-CONSENT-3). One transaction:
   * - flip the pending request to confirmed, refusing an expired or replayed one;
   * - grant therapist journal access (R-CONSENT-1);
   * - append the refusal to the append-only consent table.
   * The conditional updateMany makes concurrent confirmations safe: exactly one
   * can win, so the refusal is appended once.
   */
  async confirmWithdrawal(input: {
    id: string;
    userId: string;
    now: Date;
    journalPrivacy: JournalPrivacy;
  }): Promise<CrisisMonitoringWithdrawal | null> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crisisMonitoringWithdrawal.updateMany({
        where: {
          id: input.id,
          userId: input.userId,
          status: 'pending',
          expiresAt: { gt: input.now },
        },
        data: { status: 'confirmed', confirmedAt: input.now },
      });
      if (updated.count !== 1) return null;

      await tx.user.update({
        where: { id: input.userId },
        data: { journalPrivacy: input.journalPrivacy },
      });
      await tx.consentRecord.create({
        data: {
          userId: input.userId,
          item: 'crisis_detection',
          granted: false,
          source: 'withdrawal_confirmed',
        },
      });
      return tx.crisisMonitoringWithdrawal.findUnique({ where: { id: input.id } });
    });
  }
}
