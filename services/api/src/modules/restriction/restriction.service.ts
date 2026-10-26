import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApiError } from '../../common/errors';
import { levelForDay, pauseCapDays } from './state';

@Injectable()
export class RestrictionService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let state = await this.prisma.restrictionState.findUnique({ where: { userId } });
    if (!state) {
      state = await this.prisma.restrictionState.create({ data: { userId, level: 'none' } });
    }
    return state;
  }

  async status(userId: string) {
    const state = await this.getOrCreate(userId);
    const level = this.computeLevel(state);
    return {
      level,
      copyKey: `restriction.${level}`,
      timerStartedAt: state.timerStartedAt,
      pausedAt: state.pausedAt,
      pausedDaysTotal: state.pausedDaysTotal,
    };
  }

  private computeLevel(state: {
    level: string;
    timerStartedAt: Date | null;
    pausedAt: Date | null;
    pausedDaysTotal: number;
  }): string {
    if (!state.timerStartedAt) return 'none';
    const now = new Date();
    let elapsedMs = now.getTime() - state.timerStartedAt.getTime();
    if (state.pausedAt) {
      // paused: don't count time since pause
      elapsedMs = state.pausedAt.getTime() - state.timerStartedAt.getTime();
    }
    const pausedMs = state.pausedDaysTotal * 24 * 60 * 60 * 1000;
    const activeMs = elapsedMs - pausedMs;
    const day = Math.max(1, Math.floor(activeMs / (24 * 60 * 60 * 1000)) + 1);
    return levelForDay(day);
  }

  async startTimer(userId: string) {
    const state = await this.getOrCreate(userId);
    if (!state.timerStartedAt) {
      await this.prisma.restrictionState.update({
        where: { userId },
        data: { timerStartedAt: new Date(), level: 'level1' },
      });
    }
    return this.status(userId);
  }

  async pause(userId: string) {
    const state = await this.getOrCreate(userId);
    if (state.pausedAt) return this.status(userId);
    const projectedDays = state.pausedDaysTotal + 1;
    if (projectedDays > pauseCapDays()) {
      throw new ApiError('CONFLICT', 'Pause cap reached');
    }
    await this.prisma.restrictionState.update({
      where: { userId },
      data: { pausedAt: new Date(), invitePending: true },
    });
    return this.status(userId);
  }

  async resume(userId: string) {
    const state = await this.getOrCreate(userId);
    if (!state.pausedAt) return this.status(userId);
    const pausedMs = Date.now() - state.pausedAt.getTime();
    const pausedDays = Math.floor(pausedMs / (24 * 60 * 60 * 1000));
    await this.prisma.restrictionState.update({
      where: { userId },
      data: {
        pausedAt: null,
        invitePending: false,
        pausedDaysTotal: state.pausedDaysTotal + pausedDays,
      },
    });
    return this.status(userId);
  }
}
