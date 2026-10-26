import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { Role } from '../../../common/enums';
import { ApiError } from '../../../common/errors';
import type { AuthenticatedUser } from '../auth.types';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Role comes from the database-resolved user, never from the token claim alone. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<readonly Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new ApiError('UNAUTHENTICATED', 'Missing or expired access token');
    }
    if (!roles.includes(request.user.role)) {
      throw new ApiError('FORBIDDEN', 'Role does not allow this action');
    }
    return true;
  }
}
