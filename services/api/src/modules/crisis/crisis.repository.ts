import { Injectable } from '@nestjs/common';
import type { CrisisAlert, CrisisEvent } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ApiError } from '../../common/errors';
import { AlertState, CrisisTier, CrisisTrigger } from '../../common/enums';
import { transition, InvalidTransition } from './alert-state';

export interface CreateCrisisEventInput {
  userId: string;
  tier: CrisisTier;
  triggerType: CrisisTrigger;
  ruleVersion: string;
  sourceRef?: string | null;
  entryId?: string | null;
  clientCreatedAt: Date;
  historical: boolean;
}

@Injectable()
export class CrisisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(input: CreateCrisisEventInput): Promise<CrisisEvent> {
    return this.prisma.crisisEvent.create({
      data: {
        userId: input.userId,
        tier: input.tier,
        triggerType: input.triggerType,
        ruleVersion: input.ruleVersion,
        sourceRef: input.sourceRef ?? null,
        entryId: input.entryId ?? null,
        clientCreatedAt: input.clientCreatedAt,
        historical: input.historical,
      },
    });
  }

  async createAlert(userId: string, crisisEventId: string): Promise<CrisisAlert> {
    return this.prisma.crisisAlert.create({
      data: {
        userId,
        crisisEventId,
        state: AlertState.detected,
        checklist: { contacted: false, reviewed: false, notified: false },
      },
    });
  }

  findAlert(id: string): Promise<CrisisAlert | null> {
    return this.prisma.crisisAlert.findUnique({ where: { id } });
  }

  findAlertByEvent(crisisEventId: string): Promise<CrisisAlert | null> {
    return this.prisma.crisisAlert.findUnique({ where: { crisisEventId } });
  }

  async transitionAlert(
    alertId: string,
    event: Parameters<typeof transition>[1],
    actor: string,
    reason?: string,
  ): Promise<CrisisAlert> {
    const alert = await this.prisma.crisisAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new ApiError('NOT_FOUND', 'Alert not found');
    let next: AlertState;
    try {
      next = transition(alert.state as AlertState, event);
    } catch (error) {
      if (error instanceof InvalidTransition) {
        throw new ApiError('ALERT_STATE_INVALID', error.message);
      }
      throw error;
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crisisAlert.update({
        where: { id: alertId },
        data: { state: next, updatedAt: new Date() },
      });
      await tx.alertEvent.create({
        data: { alertId, fromState: alert.state, toState: next, actor, reason: reason ?? null },
      });
      return updated;
    });
  }

  async markEscalatedExternal(alertId: string): Promise<void> {
    await this.prisma.crisisAlert.update({
      where: { id: alertId },
      data: { escalatedExternal: true },
    });
  }

  async resolveAlert(alertId: string, checklist: Record<string, boolean>): Promise<CrisisAlert> {
    return this.prisma.crisisAlert.update({
      where: { id: alertId },
      data: {
        state: AlertState.resolved,
        resolvedAt: new Date(),
        checklist,
        updatedAt: new Date(),
      },
    });
  }

  listOpenAlerts(): Promise<CrisisAlert[]> {
    return this.prisma.crisisAlert.findMany({
      where: { state: { notIn: [AlertState.resolved, AlertState.closed] } },
    });
  }

  listOpenAlertsForUsers(userIds: string[]): Promise<CrisisAlert[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return this.prisma.crisisAlert.findMany({
      where: {
        userId: { in: userIds },
        state: { notIn: [AlertState.resolved, AlertState.closed] },
      },
    });
  }
}
