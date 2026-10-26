import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class StageService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let state = await this.prisma.stageState.findUnique({ where: { userId } });
    if (!state) {
      state = await this.prisma.stageState.create({ data: { userId, stage: 'stage1' } });
    }
    return state;
  }
}
