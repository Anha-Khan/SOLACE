import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RetentionService {
  constructor(private readonly prisma: PrismaService) {}

  async purge(): Promise<{ crisisDeleted: number; accessLogDeleted: number }> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 24);
    const alertEvents = await this.prisma.alertEvent.deleteMany({
      where: { at: { lt: cutoff } },
    });
    const alerts = await this.prisma.crisisAlert.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    const crisis = await this.prisma.crisisEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    const access = await this.prisma.accessLogEntry.deleteMany({
      where: { at: { lt: cutoff } },
    });
    return {
      crisisDeleted: crisis.count + alerts.count + alertEvents.count,
      accessLogDeleted: access.count,
    };
  }
}
