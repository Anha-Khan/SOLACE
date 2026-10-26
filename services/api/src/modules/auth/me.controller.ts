import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';

@Controller('v1/me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  me(@CurrentUser() user: AuthenticatedUser): ReturnType<AuthService['me']> {
    return this.auth.me(user);
  }
}
