import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AccessLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(patientId: string, viewerId: string, dataType: string): Promise<void> {
    await this.prisma.accessLogEntry.create({
      data: { patientId, viewerId, dataType },
    });
  }
}
