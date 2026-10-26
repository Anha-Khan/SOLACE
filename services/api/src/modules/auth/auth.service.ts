import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Session, User } from '@prisma/client';
import type { Logger } from 'pino';
import { ApiError } from '../../common/errors';
import { LOGGER } from '../../common/logger.module';
import type { AuthenticatedUser, TokenPair } from './auth.types';
import type { LoginDto, SignupDto } from './dto/auth.dto';
import { PasswordService } from './password.service';
import { DuplicateEmailError, UserRepository } from './user.repository';
import { SessionRepository } from './session.repository';
import { TokenService } from './token.service';

export interface AuthTokens extends TokenPair {
  user: {
    id: string;
    role: string;
    status: string;
    createdAt: Date;
  };
}

export interface SessionSummary {
  id: string;
  deviceLabel: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  current: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async signup(dto: SignupDto): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ApiError('CONFLICT', 'An account with this email already exists');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    let user: User;
    try {
      user = await this.users.createPatient({
        email: dto.email,
        passwordHash,
        appVersion: dto.appVersion ?? null,
      });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new ApiError('CONFLICT', error.message);
      }
      throw error;
    }

    return this.createSessionAndTokens(user, null);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      await this.passwords.verifyDummy(dto.password);
      throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
    }

    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new ApiError('UNAUTHENTICATED', 'Invalid email or password');
    }
    if (user.status !== 'active') {
      throw new ApiError('FORBIDDEN', 'This account is not active');
    }

    return this.createSessionAndTokens(user, dto.deviceLabel ?? null);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }

    const found = await this.sessions.findActiveWithUser(payload.sid);
    if (!found || found.session.userId !== payload.sub || found.session.familyId !== payload.fid) {
      if (found) await this.revokeFamilyForReuse(found.session);
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }

    const now = new Date();
    if (found.session.revokedAt || found.session.expiresAt.getTime() <= now.getTime()) {
      await this.revokeFamilyForReuse(found.session);
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }
    if (!this.tokens.sameTokenHash(found.session.refreshTokenHash, refreshToken)) {
      await this.revokeFamilyForReuse(found.session);
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }
    if (found.user.status !== 'active') {
      await this.revokeFamilyForReuse(found.session);
      throw new ApiError('FORBIDDEN', 'This account is not active');
    }

    const nextRefreshToken = await this.tokens.signRefreshToken({
      userId: found.user.id,
      sessionId: found.session.id,
      familyId: found.session.familyId,
    });
    const rotated = await this.sessions.rotate({
      sessionId: found.session.id,
      userId: found.user.id,
      oldHash: found.session.refreshTokenHash,
      newHash: this.tokens.hashToken(nextRefreshToken),
      expiresAt: this.tokens.refreshExpiry(now),
      now,
    });
    if (!rotated) {
      // A concurrent request won the rotation. Treat the loser as reuse: the
      // family is revoked rather than risking two live refresh tokens.
      await this.revokeFamilyForReuse(found.session);
      throw new ApiError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }

    const accessToken = await this.tokens.signAccessToken({
      userId: found.user.id,
      sessionId: found.session.id,
      role: found.user.role,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: this.tokens.accessTtlSeconds,
      user: this.toMe(found.user),
    };
  }

  async logout(user: AuthenticatedUser, refreshToken?: string): Promise<null> {
    const now = new Date();
    await this.sessions.revoke(user.sessionId, user.id, now);

    if (refreshToken) {
      try {
        const payload = await this.tokens.verifyRefreshToken(refreshToken);
        if (payload.sub === user.id) {
          await this.sessions.revoke(payload.sid, user.id, now);
        }
      } catch {
        // The access token already identifies the session to revoke. An invalid
        // body token must not turn logout into an error.
      }
    }
    return null;
  }

  async listSessions(user: AuthenticatedUser): Promise<SessionSummary[]> {
    const sessions = await this.sessions.listActive(user.id, new Date());
    return sessions.map((session) => ({
      id: session.id,
      deviceLabel: session.deviceLabel,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      current: session.id === user.sessionId,
    }));
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string): Promise<null> {
    const session = await this.sessions.findByIdForUser(sessionId, user.id);
    if (!session) {
      throw new ApiError('NOT_FOUND', 'Session not found');
    }
    if (!session.revokedAt) {
      await this.sessions.revoke(sessionId, user.id, new Date());
    }
    return null;
  }

  me(user: AuthenticatedUser): {
    id: string;
    role: string;
    status: string;
    createdAt: Date;
  } {
    return {
      id: user.id,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  private async createSessionAndTokens(
    user: User,
    deviceLabel: string | null,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const refreshToken = await this.tokens.signRefreshToken({
      userId: user.id,
      sessionId,
      familyId,
    });
    const now = new Date();

    await this.sessions.create({
      id: sessionId,
      userId: user.id,
      familyId,
      refreshTokenHash: this.tokens.hashToken(refreshToken),
      deviceLabel,
      expiresAt: this.tokens.refreshExpiry(now),
    });

    const accessToken = await this.tokens.signAccessToken({
      userId: user.id,
      sessionId,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTtlSeconds,
      user: this.toMe(user),
    };
  }

  private async revokeFamilyForReuse(session: Session): Promise<void> {
    await this.sessions.revokeFamily(session.familyId, new Date());
    this.logger.warn(
      {
        event: 'refresh_token_reuse',
        userId: session.userId,
        sessionId: session.id,
        familyId: session.familyId,
      },
      'refresh token reuse detected; session family revoked',
    );
  }

  private toMe(user: User): AuthTokens['user'] {
    return {
      id: user.id,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
