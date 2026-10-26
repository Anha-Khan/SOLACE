import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  liveness(): { status: 'ok'; version: string } {
    return this.health.liveness();
  }

  @Get('ready')
  readiness(): ReturnType<HealthService['readiness']> {
    return this.health.readiness();
  }
}
