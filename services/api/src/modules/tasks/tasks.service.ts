import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async today(_userId: string) {
    const items = await this.prisma.taskLibraryItem.findMany({
      where: { status: 'approved' },
      orderBy: { key: 'asc' },
    });
    return items;
  }

  async complete(_userId: string, taskId: string) {
    const item = await this.prisma.taskLibraryItem.findUnique({ where: { id: taskId } });
    if (!item) throw new Error('Task not found');
    const assignment = await this.prisma.taskAssignment.create({
      data: {
        userId: _userId,
        taskKey: item.key,
        assignedFor: new Date(),
        completedAt: new Date(),
      },
    });
    return assignment;
  }

  async swap(_userId: string) {
    // shortcut: swap not implemented (one-per-day rule pending), when to upgrade: implement R-SWAP-1 in CP4.
    return { swapped: true };
  }

  async feedback(_userId: string, _taskId: string, _feedback: string) {
    return { ok: true };
  }

  async why(taskId: string) {
    const item = await this.prisma.taskLibraryItem.findUnique({ where: { id: taskId } });
    return { taskId, eligibility: item?.eligibility ?? {}, reason: 'approved library item' };
  }
}
