import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CONSENT_ITEMS } from '../../src/common/enums';
import { bearer, cleanupUsers, openOwnerClient, signup, uniqueEmail } from '../helpers/cp1';
import type { AuthResult } from '../helpers/cp1';

interface ConsentState {
  item: string;
  granted: boolean;
  source: string;
  appVersion: string | null;
  recordedAt: string;
}

interface Withdrawal {
  id: string;
  status: string;
  expiresAt: string;
}

describe('consent, append-only history and two-step withdrawal (integration)', () => {
  let app: INestApplication;
  let owner: Client;
  const emails: string[] = [];

  beforeAll(async () => {
    owner = await openOwnerClient();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await cleanupUsers(owner, emails);
    await owner.end();
  });

  async function newUser(prefix: string): Promise<AuthResult> {
    const email = uniqueEmail(prefix);
    emails.push(email);
    const { auth } = await signup(app, email);
    return auth;
  }

  async function listConsents(auth: AuthResult): Promise<ConsentState[]> {
    const response = await request(app.getHttpServer())
      .get('/v1/consents')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    return response.body.data as ConsentState[];
  }

  it('projects all six items and grants only crisis monitoring at signup', async () => {
    const auth = await newUser('consent-list');
    const states = await listConsents(auth);

    expect(states.map((state) => state.item)).toEqual([...CONSENT_ITEMS]);

    const monitoring = states.find((state) => state.item === 'crisis_detection');
    expect(monitoring).toMatchObject({ granted: true, source: 'onboarding' });

    for (const state of states) {
      if (state.item === 'crisis_detection') continue;
      expect(state).toMatchObject({ granted: false, source: 'onboarding', appVersion: null });
      expect(Number.isNaN(Date.parse(state.recordedAt))).toBe(false);
    }
  });

  it('appends a settings decision, skips an identical repeat and records a refusal', async () => {
    const auth = await newUser('consent-append');

    const granted = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: true, appVersion: '1.2.3' })
      .expect(200);
    expect(granted.body.data).toMatchObject({
      item: 'mood_task_data',
      granted: true,
      source: 'settings',
      appVersion: '1.2.3',
    });

    const repeat = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: true, appVersion: '1.2.3' })
      .expect(200);
    expect(repeat.body.data.recordedAt).toBe(granted.body.data.recordedAt);

    const afterRepeat = await request(app.getHttpServer())
      .get('/v1/consents/history')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(afterRepeat.body.data).toHaveLength(2);

    const refused = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: false })
      .expect(200);
    expect(refused.body.data).toMatchObject({
      item: 'mood_task_data',
      granted: false,
      source: 'settings',
      appVersion: null,
    });

    const history = await request(app.getHttpServer())
      .get('/v1/consents/history')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    const records = history.body.data as ConsentState[];
    expect(records).toHaveLength(3);
    expect(records.filter((record) => record.item === 'mood_task_data')).toHaveLength(2);
    expect(records[0].recordedAt >= records[records.length - 1].recordedAt).toBe(true);
  });

  it('refuses a direct refusal of crisis monitoring (R-CONSENT-3)', async () => {
    const auth = await newUser('consent-direct');

    const response = await request(app.getHttpServer())
      .put('/v1/consents/crisis_detection')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: false })
      .expect(403);
    expect(response.body.error.code).toBe('CONSENT_REQUIRED');

    const states = await listConsents(auth);
    expect(states.find((state) => state.item === 'crisis_detection')?.granted).toBe(true);
  });

  it('rejects unknown items, malformed bodies and malformed ids', async () => {
    const auth = await newUser('consent-validation');

    const unknown = await request(app.getHttpServer())
      .put('/v1/consents/sleep_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: true })
      .expect(400);
    expect(unknown.body.error.code).toBe('VALIDATION_FAILED');

    const missing = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({})
      .expect(400);
    expect(missing.body.error.code).toBe('VALIDATION_FAILED');

    const smuggled = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', bearer(auth.accessToken))
      .send({ granted: true, source: 'withdrawal_confirmed' })
      .expect(400);
    expect(smuggled.body.error.code).toBe('VALIDATION_FAILED');

    const noClientId = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(auth.accessToken))
      .send({})
      .expect(400);
    expect(noClientId.body.error.code).toBe('VALIDATION_FAILED');

    const malformed = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals/not-a-uuid/confirm')
      .set('Authorization', bearer(auth.accessToken))
      .expect(400);
    expect(malformed.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('turns monitoring off only after confirmation and grants journal access (R-CONSENT-1)', async () => {
    const auth = await newUser('consent-withdraw');
    const clientId = randomUUID();
    const before = Date.now();

    const started = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(auth.accessToken))
      .send({ clientId })
      .expect(201);
    const withdrawal = started.body.data as Withdrawal;
    expect(withdrawal.status).toBe('pending');
    expect(Date.parse(withdrawal.expiresAt)).toBeGreaterThan(before);

    // Step 1 must not change the consent state.
    const afterStart = await listConsents(auth);
    expect(afterStart.find((state) => state.item === 'crisis_detection')?.granted).toBe(true);

    const confirmed = await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawal.id}/confirm`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(confirmed.body.data).toMatchObject({
      item: 'crisis_detection',
      granted: false,
      source: 'withdrawal_confirmed',
    });

    const afterConfirm = await listConsents(auth);
    expect(afterConfirm.find((state) => state.item === 'crisis_detection')?.granted).toBe(false);

    const stored = await owner.query<{ journal_privacy: string; records: string }>(
      `SELECT u.journal_privacy,
              (SELECT count(*)::text FROM consent_records c
                WHERE c.user_id = u.id AND c.item = 'crisis_detection') AS records
         FROM users u WHERE u.id = $1`,
      [auth.user.id],
    );
    expect(stored.rows[0]).toEqual({ journal_privacy: 'full_access', records: '2' });

    // Replaying the confirmation is idempotent and does not append twice.
    const replay = await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawal.id}/confirm`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(replay.body.data).toMatchObject({ granted: false, source: 'withdrawal_confirmed' });

    const recount = await owner.query<{ records: string }>(
      "SELECT count(*)::text AS records FROM consent_records WHERE user_id = $1 AND item = 'crisis_detection'",
      [auth.user.id],
    );
    expect(recount.rows[0].records).toBe('2');

    // Retrying step 1 with the same clientId returns the original request.
    const retried = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(auth.accessToken))
      .send({ clientId })
      .expect(201);
    expect(retried.body.data.id).toBe(withdrawal.id);
  });

  it('rejects an expired withdrawal and keeps monitoring on', async () => {
    const auth = await newUser('consent-expiry');

    const started = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(auth.accessToken))
      .send({ clientId: randomUUID() })
      .expect(201);
    const withdrawal = started.body.data as Withdrawal;

    await owner.query(
      "UPDATE crisis_monitoring_withdrawals SET expires_at = now() - interval '1 minute' WHERE id = $1",
      [withdrawal.id],
    );

    const expired = await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawal.id}/confirm`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(409);
    expect(expired.body.error.code).toBe('CONFLICT');

    const states = await listConsents(auth);
    expect(states.find((state) => state.item === 'crisis_detection')?.granted).toBe(true);

    const stored = await owner.query<{ status: string }>(
      'SELECT status FROM crisis_monitoring_withdrawals WHERE id = $1',
      [withdrawal.id],
    );
    expect(stored.rows[0].status).toBe('expired');

    // A fresh request still works after the expired one.
    await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(auth.accessToken))
      .send({ clientId: randomUUID() })
      .expect(201);
  });

  it('scopes a withdrawal to the patient who started it', async () => {
    const patient = await newUser('consent-scope-a');
    const stranger = await newUser('consent-scope-b');

    const started = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', bearer(patient.accessToken))
      .send({ clientId: randomUUID() })
      .expect(201);
    const withdrawal = started.body.data as Withdrawal;

    const denied = await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawal.id}/confirm`)
      .set('Authorization', bearer(stranger.accessToken))
      .expect(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');

    await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawal.id}/confirm`)
      .set('Authorization', bearer(patient.accessToken))
      .expect(200);
  });
});
