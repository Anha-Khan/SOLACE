import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { PHQ9_SURVEY } from '../../src/modules/surveys/definitions';

/**
 * Shared fixtures for the CP1 integration suites. Every suite owns an
 * application-role client through AppModule and a separate owner-role client
 * (`MIGRATION_DATABASE_URL`) for cleanup: consent rows are append-only for the
 * runtime role, so the owner must delete them before the account can go.
 */
export const PASSWORD = 'correct-horse-battery-staple';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    role: string;
    status: string;
    createdAt: string;
  };
}

export interface SignedUp {
  email: string;
  auth: AuthResult;
}

export interface SurveyFixture {
  id: string;
  key: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.invalid`;
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}

export async function openOwnerClient(): Promise<Client> {
  const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `PostgreSQL is required for this suite. Start the dev stack, then run ` +
        `\`npm run db:deploy\`. Underlying error: ${(error as Error).message}`,
    );
  }
  return client;
}

export async function signup(
  app: INestApplication,
  email: string = uniqueEmail('cp1'),
): Promise<SignedUp> {
  const response = await request(app.getHttpServer())
    .post('/v1/auth/signup')
    .send({ email, password: PASSWORD, ageConfirmed: true, appVersion: 'cp1-test' })
    .expect(201);

  return { email, auth: response.body.data as AuthResult };
}

/**
 * Removes the accounts a suite created. Consent rows use `ON DELETE RESTRICT`
 * on purpose, so they go first. Everything else (sessions, withdrawals, survey
 * responses and results, safety plan, devices, preferences) cascades.
 */
export async function cleanupUsers(owner: Client, emails: readonly string[]): Promise<void> {
  if (emails.length === 0) return;
  await owner.query(
    'DELETE FROM consent_records WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))',
    [emails],
  );
  await owner.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
}

/** Uses the standard PHQ-9 survey, creating or refreshing the dev fixture. */
export async function ensurePhq9Survey(owner: Client): Promise<SurveyFixture> {
  const result = await owner.query<{ id: string }>(
    `INSERT INTO surveys (id, key, title, version, items, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, now(), now())
     ON CONFLICT (key) DO UPDATE
       SET title = EXCLUDED.title,
           version = EXCLUDED.version,
           items = EXCLUDED.items,
           updated_at = now()
     RETURNING id`,
    [
      randomUUID(),
      PHQ9_SURVEY.key,
      PHQ9_SURVEY.title,
      PHQ9_SURVEY.version,
      JSON.stringify(PHQ9_SURVEY.items),
    ],
  );
  return { id: result.rows[0].id, key: PHQ9_SURVEY.key };
}

/** A second instrument, used to prove a `clientId` cannot cross surveys. */
export async function createSurveyFixture(owner: Client, key: string): Promise<SurveyFixture> {
  const id = randomUUID();
  await owner.query(
    `INSERT INTO surveys (id, key, title, version, items, created_at, updated_at)
     VALUES ($1, $2, $3, 1, $4::jsonb, now(), now())`,
    [id, key, `Synthetic ${key}`, JSON.stringify(PHQ9_SURVEY.items)],
  );
  return { id, key };
}

/** Run after `cleanupUsers`: survey rows are restricted while responses exist. */
export async function deleteSurveyFixtures(owner: Client, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  await owner.query('DELETE FROM surveys WHERE key = ANY($1::text[])', [keys]);
}

export function phq9Answers(overrides: Record<string, number> = {}): Record<string, number> {
  const answers: Record<string, number> = {};
  for (const item of PHQ9_SURVEY.items) {
    answers[item.key] = 0;
  }
  return { ...answers, ...overrides };
}
