import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ApiError } from '../../../common/errors';
import type { AuthenticatedUser } from '../auth.types';
import { SessionRepository } from '../session.repository';
import { TokenService } from '../token.service';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/**
 * Global bearer guard. Public routes opt out with @Public(). A revoked session or
 * a non-active account is rejected immediately, even though the access token has
 * not expired yet, so logout and refresh-reuse revocation take effect at once.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header) {
      throw new ApiError('UNAUTHENTICATED', 'Missing or expired access token');
    }
    const [scheme, token] = header.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      throw new ApiError('UNAUTHENTICATED', 'Missing or expired access token');
    }

    let payload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new ApiError('UNAUTHENTICATED', 'Missing or expired access token');
    }

    const found = await this.sessions.findActiveWithUser(payload.sid);
    const now = Date.now();
    if (
      !found ||
      found.session.userId !== payload.sub ||
      found.session.revokedAt !== null ||
      found.session.expiresAt.getTime() <= now ||
      found.user.status !== 'active'
    ) {
      throw new ApiError('UNAUTHENTICATED', 'Missing or expired access token');
    }

    request.user = {
      id: found.user.id,
      role: found.user.role,
      status: found.user.status,
      sessionId: found.session.id,
      createdAt: found.user.createdAt,
    };
    return true;
  }
}
