import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  bearer,
  cleanupUsers,
  createSurveyFixture,
  deleteSurveyFixtures,
  ensurePhq9Survey,
  openOwnerClient,
  phq9Answers,
  signup,
  uniqueEmail,
} from '../helpers/cp1';
import type { AuthResult, SurveyFixture } from '../helpers/cp1';

interface SurveyResponse {
  id: string;
  surveyId: string;
  status: string;
  clientId: string;
  clientCreatedAt: string;
  serverReceivedAt: string;
  duplicate: boolean;
}

interface SurveyResult {
  id: string;
  surveyId: string;
  totalScore: number;
  scores: Record<string, number>;
  possibleConcern: boolean;
  createdAt: string;
}

describe('surveys, scoring and retake cooldown (integration)', () => {
  let app: INestApplication;
  let owner: Client;
  let survey: SurveyFixture;
  let extraSurvey: SurveyFixture;
  const emails: string[] = [];

  beforeAll(async () => {
    owner = await openOwnerClient();
    survey = await ensurePhq9Survey(owner);
    extraSurvey = await createSurveyFixture(owner, `cp1-extra-${randomUUID()}`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await cleanupUsers(owner, emails);
    await deleteSurveyFixtures(owner, [extraSurvey.key]);
    await owner.end();
  });

  async function newUser(prefix: string): Promise<AuthResult> {
    const email = uniqueEmail(prefix);
    emails.push(email);
    const { auth } = await signup(app, email);
    return auth;
  }

  it('returns the nine PHQ-9 items and hides an unknown survey', async () => {
    const auth = await newUser('survey-get');

    const response = await request(app.getHttpServer())
      .get(`/v1/surveys/${survey.id}`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(response.body.data).toMatchObject({ id: survey.id, key: 'phq9', version: 1 });
    const items = response.body.data.items as Array<{
      key: string;
      prompt: string;
      min: number;
      max: number;
    }>;
    expect(items).toHaveLength(9);
    expect(items.map((item) => item.key)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
      'q5',
      'q6',
      'q7',
      'q8',
      'q9',
    ]);
    for (const item of items) {
      expect(item).toMatchObject({ min: 0, max: 3 });
      expect(item.prompt.length).toBeGreaterThan(0);
    }

    const missing = await request(app.getHttpServer())
      .get(`/v1/surveys/${randomUUID()}`)
      .set('Authorization', bearer(auth.accessToken))
      .expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const malformed = await request(app.getHttpServer())
      .get('/v1/surveys/not-a-uuid')
      .set('Authorization', bearer(auth.accessToken))
      .expect(400);
    expect(malformed.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('saves answers idempotently and scores them on the server', async () => {
    const auth = await newUser('survey-score');
    const clientId = randomUUID();
    const clientCreatedAt = '2026-10-20T10:00:00.000Z';

    const first = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', bearer(auth.accessToken))
      .send({
        clientId,
        clientCreatedAt,
        responses: phq9Answers({ q1: 3, q2: 2, q9: 1 }),
      })
      .expect(201);
    const response = first.body.data as SurveyResponse;
    expect(response).toMatchObject({
      surveyId: survey.id,
      status: 'in_progress',
      clientId,
      clientCreatedAt,
      duplicate: false,
    });

    // A replay returns the original row, not a second one, even with new answers.
    const replay = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', bearer(auth.accessToken))
      .send({
        clientId,
        clientCreatedAt,
        responses: phq9Answers({ q1: 3, q2: 3, q3: 3 }),
      })
      .expect(200);
    expect(replay.body.data).toMatchObject({ id: response.id, duplicate: true });

    const stored = await owner.query<{ count: string; q1: string; q2: string }>(
      `SELECT count(*)::text AS count,
              min(responses->>'q1') AS q1,
              min(responses->>'q2') AS q2
         FROM survey_responses WHERE user_id = $1 AND client_id = $2`,
      [auth.user.id, clientId],
    );
    expect(stored.rows[0]).toEqual({ count: '1', q1: '3', q2: '2' });

    const completed = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', bearer(auth.accessToken))
      .send({ responseId: response.id })
      .expect(200);
    const result = completed.body.data as SurveyResult;
    expect(result).toMatchObject({
      surveyId: survey.id,
      totalScore: 6,
      possibleConcern: true,
    });
    expect(result.scores).toEqual(phq9Answers({ q1: 3, q2: 2, q9: 1 }));

    const again = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', bearer(auth.accessToken))
      .send({ responseId: response.id })
      .expect(200);
    expect(again.body.data).toMatchObject({ id: result.id, totalScore: 6 });

    const resultCount = await owner.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM survey_results WHERE response_id = $1',
      [response.id],
    );
    expect(resultCount.rows[0].count).toBe('1');

    const results = await request(app.getHttpServer())
      .get('/v1/surveys/results')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    expect(results.body.data).toHaveLength(1);
    expect(results.body.data[0]).toMatchObject({ id: result.id, totalScore: 6 });
  });

  it('rejects incomplete, out-of-range and unknown answers before storing anything', async () => {
    const auth = await newUser('survey-validation');
    const base = { clientId: randomUUID(), clientCreatedAt: new Date().toISOString() };

    const attempts: Array<Record<string, number>> = [
      (() => {
        const answers = phq9Answers();
        delete answers.q4;
        return answers;
      })(),
      phq9Answers({ q9: 4 }),
      phq9Answers({ q2: -1 }),
      phq9Answers({ q1: 1.5 }),
      phq9Answers({ q10: 1 }),
      { ...phq9Answers(), q3: '2' } as unknown as Record<string, number>,
    ];

    for (const responses of attempts) {
      const response = await request(app.getHttpServer())
        .post(`/v1/surveys/${survey.id}/responses`)
        .set('Authorization', bearer(auth.accessToken))
        .send({ ...base, clientId: randomUUID(), responses })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    }

    const stored = await owner.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM survey_responses WHERE user_id = $1',
      [auth.user.id],
    );
    expect(stored.rows[0].count).toBe('0');
  });

  it('blocks a retake inside 14 days and allows it once the cooldown has passed', async () => {
    const auth = await newUser('survey-retake');

    const first = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', bearer(auth.accessToken))
      .send({ surveyKey: 'phq9' })
      .expect(201);
    expect(first.body).toMatchObject({ success: true, data: null, error: null });

    const unknownKey = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', bearer(auth.accessToken))
      .send({ surveyKey: 'gad7' })
      .expect(404);
    expect(unknownKey.body.error.code).toBe('NOT_FOUND');

    const clientId = randomUUID();
    const submitted = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', bearer(auth.accessToken))
      .send({
        clientId,
        clientCreatedAt: new Date().toISOString(),
        responses: phq9Answers(),
      })
      .expect(201);
    const response = submitted.body.data as SurveyResponse;

    const completed = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', bearer(auth.accessToken))
      .send({ responseId: response.id })
      .expect(200);
    const result = completed.body.data as SurveyResult;

    const blocked = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', bearer(auth.accessToken))
      .send({ surveyKey: 'phq9' })
      .expect(409);
    expect(blocked.body.error.code).toBe('CONFLICT');

    await owner.query(
      "UPDATE survey_results SET created_at = now() - interval '15 days' WHERE id = $1",
      [result.id],
    );

    const allowed = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', bearer(auth.accessToken))
      .send({ surveyKey: 'phq9' })
      .expect(201);
    expect(allowed.body.data).toBeNull();
  });

  it('does not let one clientId belong to two surveys', async () => {
    const auth = await newUser('survey-cross');
    const clientId = randomUUID();
    const body = {
      clientId,
      clientCreatedAt: new Date().toISOString(),
      responses: phq9Answers(),
    };

    await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', bearer(auth.accessToken))
      .send(body)
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post(`/v1/surveys/${extraSurvey.id}/responses`)
      .set('Authorization', bearer(auth.accessToken))
      .send(body)
      .expect(409);
    expect(conflict.body.error.code).toBe('CONFLICT');
  });

  it('does not let another patient complete a response', async () => {
    const patient = await newUser('survey-owner');
    const stranger = await newUser('survey-stranger');

    const submitted = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', bearer(patient.accessToken))
      .send({
        clientId: randomUUID(),
        clientCreatedAt: new Date().toISOString(),
        responses: phq9Answers(),
      })
      .expect(201);
    const response = submitted.body.data as SurveyResponse;

    const denied = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', bearer(stranger.accessToken))
      .send({ responseId: response.id })
      .expect(404);
    expect(denied.body.error.code).toBe('NOT_FOUND');

    await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', bearer(patient.accessToken))
      .send({ responseId: response.id })
      .expect(200);
  });
});
