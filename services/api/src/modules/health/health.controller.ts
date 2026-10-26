import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

/** Probes must answer without a token: the load balancer has none. */
@Public()
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
