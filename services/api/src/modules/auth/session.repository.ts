import { Injectable } from '@nestjs/common';
import type { Session, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

export interface SessionWithUser {
  session: Session;
  user: User;
}

/**
 * Session rows are session families: a login creates one, every refresh rotates
 * the hash in place, and revoking the row ends every access token in the family.
 * The refresh token carries the session id and family id, so presenting a
 * rotated token can be recognised and the family revoked (ADR-7).
 */
@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    id: string;
    userId: string;
    familyId: string;
    refreshTokenHash: string;
    deviceLabel: string | null;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        familyId: input.familyId,
        refreshTokenHash: input.refreshTokenHash,
        deviceLabel: input.deviceLabel,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findActiveWithUser(sessionId: string): Promise<SessionWithUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session) return null;
    return { session, user: session.user };
  }

  listActive(userId: string, now: Date): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdForUser(sessionId: string, userId: string): Promise<Session | null> {
    return this.prisma.session.findFirst({ where: { id: sessionId, userId } });
  }

  /** Atomic: only one concurrent rotation can win the old hash. */
  async rotate(input: {
    sessionId: string;
    userId: string;
    oldHash: string;
    newHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: {
        id: input.sessionId,
        userId: input.userId,
        refreshTokenHash: input.oldHash,
        revokedAt: null,
        expiresAt: { gt: input.now },
      },
      data: {
        refreshTokenHash: input.newHash,
        expiresAt: input.expiresAt,
        lastSeenAt: input.now,
      },
    });
    return result.count === 1;
  }

  async revoke(sessionId: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count === 1;
  }

  async revokeFamily(familyId: string, now: Date): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count;
  }

  async touch(sessionId: string, now: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { lastSeenAt: now },
    });
  }
}
