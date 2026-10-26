import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CheckInService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    input: {
      clientId: string;
      mood: number;
      feelingWords?: string[];
      bodySignal?: string;
      taskReflection?: string;
      clientCreatedAt: string;
    },
  ) {
    const existing = await this.prisma.checkIn.findUnique({
      where: { userId_clientId: { userId, clientId: input.clientId } },
    });
    if (existing) return { ...existing, duplicate: true };
    const created = await this.prisma.checkIn.create({
      data: {
        userId,
        clientId: input.clientId,
        mood: input.mood,
        feelingWords: input.feelingWords ?? [],
        bodySignal: input.bodySignal ?? null,
        taskReflection: input.taskReflection ?? null,
        clientCreatedAt: new Date(input.clientCreatedAt),
      },
    });
    return { ...created, duplicate: false };
  }

  async list(userId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.checkIn.findMany({
      where: { userId, clientCreatedAt: { gte: since } },
      orderBy: { clientCreatedAt: 'desc' },
    });
  }
}
