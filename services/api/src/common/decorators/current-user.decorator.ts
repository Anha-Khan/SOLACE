import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';

/** The user and session resolved by JwtAuthGuard. Never trust a client-supplied id. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard');
    }
    return request.user;
  },
);
