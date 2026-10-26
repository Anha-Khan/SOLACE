import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async accessLog(user: AuthenticatedUser) {
    return this.prisma.accessLogEntry.findMany({
      where: { patientId: user.id },
      orderBy: { at: 'desc' },
      take: 100,
    });
  }

  async requestExport(user: AuthenticatedUser) {
    const recent = await this.prisma.exportRequest.count({
      where: { userId: user.id, requestedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recent >= 3) {
      await this.prisma.safetyTeamFlag
        .create({
          data: { userId: user.id, reason: 'bulk_export_anomaly' },
        })
        .catch(() => undefined);
    }
    const record = await this.prisma.exportRequest.create({
      data: { userId: user.id, status: 'pending', requestedAt: new Date() },
    });
    return record;
  }

  async getExport(user: AuthenticatedUser, id: string) {
    const record = await this.prisma.exportRequest.findFirst({ where: { id, userId: user.id } });
    if (!record) return null;
    return record;
  }

  async pause(user: AuthenticatedUser, paused: boolean) {
    // shortcut: pause flag stored on restriction_states.pausedAt; full read-only
    // enforcement of R-PRIVACY-1 lands with the pause column migration.
    const state = await this.prisma.restrictionState.findUnique({ where: { userId: user.id } });
    if (paused) {
      if (!state?.pausedAt) {
        await this.prisma.restrictionState.upsert({
          where: { userId: user.id },
          create: { userId: user.id, level: 'none', pausedAt: new Date() },
          update: { pausedAt: new Date() },
        });
      }
    } else if (state?.pausedAt) {
      await this.prisma.restrictionState.update({
        where: { userId: user.id },
        data: { pausedAt: null },
      });
    }
    return null;
  }

  async requestDeletion(user: AuthenticatedUser, _clientId: string) {
    const referenceNumber = `DEL-${randomBytes(4).toString('hex').toUpperCase()}`;
    const record = await this.prisma.deletionRequest.create({
      data: {
        userId: user.id,
        status: 'pending',
        referenceNumber,
        requestedAt: new Date(),
      },
    });
    return record;
  }

  async confirmDeletion(user: AuthenticatedUser, id: string) {
    const record = await this.prisma.deletionRequest.findFirst({ where: { id, userId: user.id } });
    if (!record) return null;
    const updated = await this.prisma.deletionRequest.update({
      where: { id },
      data: { status: 'confirmed', completedAt: new Date() },
    });
    return updated;
  }
}
