import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RestrictionService } from './restriction.service';

@Controller('v1')
export class RestrictionController {
  constructor(private readonly restriction: RestrictionService) {}

  @Get('status')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.restriction.status(user.id);
  }
}
