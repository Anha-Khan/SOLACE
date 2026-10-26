import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../src/config/config';
import { TokenService } from '../../src/modules/auth/token.service';

/**
 * Guards the token properties that the HTTP tests can only observe indirectly.
 * In particular, two rotations in the same second must not produce the same
 * refresh token, or rotation becomes a no-op and reuse detection never fires.
 */
const config = {
  jwtAccessSecret: 'unit-access-secret-0123456789abcdef0123',
  jwtRefreshSecret: 'unit-refresh-secret-0123456789abcdef0123',
  accessTokenTtlMin: 15,
  refreshTokenTtlDays: 30,
} as unknown as AppConfig;

describe('TokenService', () => {
  const tokens = new TokenService(config, new JwtService({}));
  const ids = {
    userId: '11111111-1111-4111-8111-111111111111',
    sessionId: '22222222-2222-4222-8222-222222222222',
    familyId: '33333333-3333-4333-8333-333333333333',
  };

  it('signs a different refresh token on every call, even in the same second', async () => {
    const first = await tokens.signRefreshToken(ids);
    const second = await tokens.signRefreshToken(ids);

    expect(second).not.toBe(first);
    expect(tokens.hashToken(second)).not.toBe(tokens.hashToken(first));
  });

  it('round-trips the session and family claims and rejects the other token type', async () => {
    const refresh = await tokens.signRefreshToken(ids);
    const access = await tokens.signAccessToken({ ...ids, role: 'patient' });

    const refreshPayload = await tokens.verifyRefreshToken(refresh);
    expect(refreshPayload).toMatchObject({
      sub: ids.userId,
      sid: ids.sessionId,
      fid: ids.familyId,
      type: 'refresh',
    });
    expect(typeof refreshPayload.jti).toBe('string');

    const accessPayload = await tokens.verifyAccessToken(access);
    expect(accessPayload).toMatchObject({
      sub: ids.userId,
      sid: ids.sessionId,
      role: 'patient',
      type: 'access',
    });

    await expect(tokens.verifyAccessToken(refresh)).rejects.toThrow();
    await expect(tokens.verifyRefreshToken(access)).rejects.toThrow();
  });

  it('compares a stored hash without leaking it', async () => {
    const token = await tokens.signRefreshToken(ids);
    const hash = tokens.hashToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(tokens.sameTokenHash(hash, token)).toBe(true);
    expect(tokens.sameTokenHash(hash, `${token}x`)).toBe(false);
    expect(tokens.sameTokenHash(hash, token.slice(0, -1))).toBe(false);
  });
});
