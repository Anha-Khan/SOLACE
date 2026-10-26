import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  PASSWORD,
  bearer,
  cleanupUsers,
  openOwnerClient,
  signup,
  uniqueEmail,
} from '../helpers/cp1';
import type { AuthResult, SignedUp } from '../helpers/cp1';

/**
 * Real AppModule, real PostgreSQL, real Redis. These tests exercise the parts
 * the unit tests cannot: the JWT guard, session revocation, rotation, the
 * database role resolution and the response envelope.
 */
describe('auth, sessions and tokens (integration)', () => {
  let app: INestApplication;
  let owner: Client;
  let sessionUser: SignedUp;
  const emails: string[] = [];

  beforeAll(async () => {
    owner = await openOwnerClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();

    // One account reused for the session-lifecycle tests. Each test creates a
    // fresh login session, so the signup throttle stays well below its limit.
    sessionUser = await signup(app, uniqueEmail('auth-session'));
    emails.push(sessionUser.email);
  });

  afterAll(async () => {
    await app.close();
    await cleanupUsers(owner, emails);
    await owner.end();
  });

  async function login(email: string, deviceLabel = 'integration-test'): Promise<AuthResult> {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: PASSWORD, deviceLabel })
      .expect(200);
    return response.body.data as AuthResult;
  }

  function tamper(token: string): string {
    const last = token.at(-1) === 'a' ? 'b' : 'a';
    return `${token.slice(0, -1)}${last}`;
  }

  it('signs up a patient, normalises the email and stores only an argon2id hash', async () => {
    const email = uniqueEmail('auth-signup');
    emails.push(email);

    const response = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({
        email: `  ${email.toUpperCase()}  `,
        password: PASSWORD,
        ageConfirmed: true,
        appVersion: '0.1.0-test',
      })
      .expect(201);

    const auth = response.body.data as AuthResult;
    expect(response.body).toMatchObject({ success: true, error: null });
    expect(auth.user).toMatchObject({ role: 'patient', status: 'active' });
    expect(Number.isInteger(auth.expiresIn)).toBe(true);
    expect(auth.expiresIn).toBeGreaterThan(0);
    expect(auth.accessToken.split('.')).toHaveLength(3);
    expect(auth.refreshToken.split('.')).toHaveLength(3);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain(PASSWORD);
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('$argon2');

    const stored = await owner.query<{
      email: string;
      role: string;
      password_hash: string;
    }>('SELECT email, role, password_hash FROM users WHERE id = $1', [auth.user.id]);
    expect(stored.rows[0].email).toBe(email);
    expect(stored.rows[0].role).toBe('patient');
    expect(stored.rows[0].password_hash.startsWith('$argon2id$')).toBe(true);
    expect(stored.rows[0].password_hash).not.toContain(PASSWORD);
  });

  it('rejects a second account on the same email with 409', async () => {
    const email = uniqueEmail('auth-duplicate');
    emails.push(email);
    await signup(app, email);

    const response = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: PASSWORD, ageConfirmed: true })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      data: null,
      error: { code: 'CONFLICT' },
    });
  });

  it('rejects an under-18 signup, a short password and a server-owned field', async () => {
    const email = uniqueEmail('auth-invalid');
    emails.push(email);

    const underage = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: PASSWORD, ageConfirmed: false })
      .expect(400);
    expect(underage.body.error.code).toBe('VALIDATION_FAILED');
    expect(underage.body.error.message).toContain('18');

    const short = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: 'too-short', ageConfirmed: true })
      .expect(400);
    expect(short.body.error.code).toBe('VALIDATION_FAILED');

    const smuggled = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: PASSWORD, ageConfirmed: true, role: 'therapist' })
      .expect(400);
    expect(smuggled.body.error.code).toBe('VALIDATION_FAILED');

    const created = await owner.query('SELECT id FROM users WHERE email = $1', [email]);
    expect(created.rowCount).toBe(0);
  });

  it('logs in with a normalised email and hides whether the email exists', async () => {
    const email = uniqueEmail('auth-login');
    emails.push(email);
    await signup(app, email);

    const wrong = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'definitely-the-wrong-password' })
      .expect(401);
    expect(wrong.body.error.code).toBe('UNAUTHENTICATED');

    const unknown = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: uniqueEmail('auth-unknown'), password: PASSWORD })
      .expect(401);
    expect(unknown.body.error).toEqual(wrong.body.error);

    const correct = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: ` ${email.toUpperCase()} `, password: PASSWORD, deviceLabel: 'phone' })
      .expect(200);
    expect(correct.body.data.user.role).toBe('patient');
  });

  it('requires a valid bearer token for /v1/me', async () => {
    const session = await login(sessionUser.email);

    await request(app.getHttpServer()).get('/v1/me').expect(401);

    const tampered = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(tamper(session.accessToken)))
      .expect(401);
    expect(tampered.body.error.code).toBe('UNAUTHENTICATED');

    const response = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(session.accessToken))
      .expect(200);
    expect(response.body.data).toMatchObject({
      id: session.user.id,
      role: 'patient',
      status: 'active',
    });
  });

  it('rotates refresh tokens and revokes the family when a rotated token is reused', async () => {
    const session = await login(sessionUser.email);

    const rotated = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    const next = rotated.body.data as AuthResult;
    expect(next.refreshToken).not.toBe(session.refreshToken);

    // Replaying the rotated token is treated as theft, not a retry.
    const replay = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    expect(replay.body.error.code).toBe('UNAUTHENTICATED');

    // The whole family is revoked, including the access token issued a moment ago.
    await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(next.accessToken))
      .expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: next.refreshToken })
      .expect(401);
  });

  it('logout revokes the session immediately, before the access token expires', async () => {
    const session = await login(sessionUser.email);

    const response = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', bearer(session.accessToken))
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(response.body).toMatchObject({ success: true, data: null, error: null });

    await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(session.accessToken))
      .expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('lists active sessions and revokes exactly one', async () => {
    const phone = await login(sessionUser.email, 'phone');
    const laptop = await login(sessionUser.email, 'laptop');

    const list = await request(app.getHttpServer())
      .get('/v1/auth/sessions')
      .set('Authorization', bearer(laptop.accessToken))
      .expect(200);

    const sessions = list.body.data as Array<{
      id: string;
      deviceLabel: string | null;
      current: boolean;
    }>;
    const phoneSession = sessions.find((session) => session.deviceLabel === 'phone');
    const laptopSession = sessions.find((session) => session.deviceLabel === 'laptop');
    expect(phoneSession).toBeDefined();
    expect(laptopSession).toBeDefined();
    expect(laptopSession?.current).toBe(true);
    expect(phoneSession?.current).toBe(false);
    expect(sessions.filter((session) => session.current)).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/v1/auth/sessions/${phoneSession?.id}`)
      .set('Authorization', bearer(laptop.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(phone.accessToken))
      .expect(401);
    await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', bearer(laptop.accessToken))
      .expect(200);

    const missing = await request(app.getHttpServer())
      .delete(`/v1/auth/sessions/${randomUUID()}`)
      .set('Authorization', bearer(laptop.accessToken))
      .expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('resolves the role from the database, not from the token claim', async () => {
    await owner.query("UPDATE users SET role = 'therapist' WHERE id = $1", [
      sessionUser.auth.user.id,
    ]);

    // The access token still claims "patient"; the guard must consult the row.
    const response = await request(app.getHttpServer())
      .get('/v1/consents')
      .set('Authorization', bearer(sessionUser.auth.accessToken))
      .expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
