import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { bearer, cleanupUsers, openOwnerClient, signup, uniqueEmail } from '../helpers/cp1';
import type { AuthResult } from '../helpers/cp1';

interface NotificationPreference {
  type: string;
  enabled: boolean;
  disableable: boolean;
}

interface DeviceSummary {
  id: string;
  platform: string;
  lastSeenAt: string;
}

describe('devices and notification preferences (integration)', () => {
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

  async function preferences(auth: AuthResult): Promise<NotificationPreference[]> {
    const response = await request(app.getHttpServer())
      .get('/v1/notification-preferences')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    return response.body.data as NotificationPreference[];
  }

  it('projects all five types and marks crisis and connection as non-disableable', async () => {
    const auth = await newUser('devices-prefs');

    const projected = await preferences(auth);
    expect(projected.map((entry) => entry.type)).toEqual([
      'crisis_alert',
      'daily_checkin',
      'task_reminder',
      'inactivity',
      'connection_update',
    ]);
    expect(projected.every((entry) => entry.enabled)).toBe(true);
    expect(projected.filter((entry) => !entry.disableable).map((entry) => entry.type)).toEqual([
      'crisis_alert',
      'connection_update',
    ]);

    // The projection is derived, not seeded: no rows are written by a GET.
    const stored = await owner.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM notification_preferences WHERE user_id = $1',
      [auth.user.id],
    );
    expect(stored.rows[0].count).toBe('0');
  });

  it('stores a patient toggle but refuses to disable crisis notifications (R-NOTIF-4)', async () => {
    const auth = await newUser('devices-toggle');

    const disabled = await request(app.getHttpServer())
      .put('/v1/notification-preferences/daily_checkin')
      .set('Authorization', bearer(auth.accessToken))
      .send({ enabled: false })
      .expect(200);
    expect(disabled.body.data).toEqual({
      type: 'daily_checkin',
      enabled: false,
      disableable: true,
    });
    expect((await preferences(auth)).find((entry) => entry.type === 'daily_checkin')?.enabled).toBe(
      false,
    );

    const enabled = await request(app.getHttpServer())
      .put('/v1/notification-preferences/daily_checkin')
      .set('Authorization', bearer(auth.accessToken))
      .send({ enabled: true })
      .expect(200);
    expect(enabled.body.data.enabled).toBe(true);

    for (const type of ['crisis_alert', 'connection_update']) {
      const refused = await request(app.getHttpServer())
        .put(`/v1/notification-preferences/${type}`)
        .set('Authorization', bearer(auth.accessToken))
        .send({ enabled: false })
        .expect(403);
      expect(refused.body.error.code).toBe('FORBIDDEN');

      const alwaysOn = await request(app.getHttpServer())
        .put(`/v1/notification-preferences/${type}`)
        .set('Authorization', bearer(auth.accessToken))
        .send({ enabled: true })
        .expect(200);
      expect(alwaysOn.body.data).toMatchObject({ enabled: true, disableable: false });
    }

    const unknown = await request(app.getHttpServer())
      .put('/v1/notification-preferences/marketing')
      .set('Authorization', bearer(auth.accessToken))
      .send({ enabled: false })
      .expect(400);
    expect(unknown.body.error.code).toBe('VALIDATION_FAILED');

    const missing = await request(app.getHttpServer())
      .put('/v1/notification-preferences/daily_checkin')
      .set('Authorization', bearer(auth.accessToken))
      .send({})
      .expect(400);
    expect(missing.body.error.code).toBe('VALIDATION_FAILED');

    const crisisRows = await owner.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM notification_preferences WHERE user_id = $1 AND type = 'crisis_alert'",
      [auth.user.id],
    );
    expect(crisisRows.rows[0].count).toBe('0');
  });

  it('upserts a device by FCM token and unregisters it', async () => {
    const auth = await newUser('devices-register');
    const fcmToken = `fcm-${randomUUID()}`;

    const registered = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(auth.accessToken))
      .send({ fcmToken, platform: 'android' })
      .expect(201);
    const device = registered.body.data as DeviceSummary;
    expect(device).toMatchObject({ platform: 'android' });
    expect(Number.isNaN(Date.parse(device.lastSeenAt))).toBe(false);

    const reRegistered = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(auth.accessToken))
      .send({ fcmToken, platform: 'ios' })
      .expect(201);
    expect(reRegistered.body.data).toMatchObject({ id: device.id, platform: 'ios' });

    const stored = await owner.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM device_tokens WHERE fcm_token = $1',
      [fcmToken],
    );
    expect(stored.rows[0].count).toBe('1');

    const invalidPlatform = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(auth.accessToken))
      .send({ fcmToken: `fcm-${randomUUID()}`, platform: 'web' })
      .expect(400);
    expect(invalidPlatform.body.error.code).toBe('VALIDATION_FAILED');

    const missingToken = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(auth.accessToken))
      .send({ platform: 'android' })
      .expect(400);
    expect(missingToken.body.error.code).toBe('VALIDATION_FAILED');

    const missing = await request(app.getHttpServer())
      .delete(`/v1/devices/${randomUUID()}`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const removed = await request(app.getHttpServer())
      .delete(`/v1/devices/${device.id}`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(removed.body).toMatchObject({ success: true, data: null, error: null });

    await request(app.getHttpServer())
      .delete(`/v1/devices/${device.id}`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(404);

    const remaining = await owner.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM device_tokens WHERE fcm_token = $1',
      [fcmToken],
    );
    expect(remaining.rows[0].count).toBe('0');
  });

  it('moves a reused device token to the new account', async () => {
    const first = await newUser('devices-first');
    const second = await newUser('devices-second');
    const fcmToken = `fcm-${randomUUID()}`;

    const registered = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(first.accessToken))
      .send({ fcmToken, platform: 'android' })
      .expect(201);
    const device = registered.body.data as DeviceSummary;

    await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', bearer(second.accessToken))
      .send({ fcmToken, platform: 'android' })
      .expect(201);

    const ownerRow = await owner.query<{ user_id: string }>(
      'SELECT user_id FROM device_tokens WHERE id = $1',
      [device.id],
    );
    expect(ownerRow.rows[0].user_id).toBe(second.user.id);

    // The previous account must not be able to remove the new owner’s device.
    await request(app.getHttpServer())
      .delete(`/v1/devices/${device.id}`)
      .set('Authorization', bearer(first.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/v1/devices/${device.id}`)
      .set('Authorization', bearer(second.accessToken))
      .expect(200);
  });

  it('requires authentication on every device and preference route', async () => {
    await request(app.getHttpServer()).get('/v1/notification-preferences').expect(401);
    await request(app.getHttpServer())
      .post('/v1/devices')
      .send({ fcmToken: `fcm-${randomUUID()}`, platform: 'android' })
      .expect(401);
    await request(app.getHttpServer()).delete(`/v1/devices/${randomUUID()}`).expect(401);
  });
});
