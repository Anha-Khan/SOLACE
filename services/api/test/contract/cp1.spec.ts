import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidateFunction } from 'ajv';
import type { Client } from 'pg';
import request from 'supertest';
import { parse as parseYaml } from 'yaml';
import { AppModule } from '../../src/app.module';
import {
  PASSWORD,
  bearer,
  cleanupUsers,
  ensurePhq9Survey,
  openOwnerClient,
  phq9Answers,
  uniqueEmail,
} from '../helpers/cp1';
import type { AuthResult, SignedUp, SurveyFixture } from '../helpers/cp1';

type JsonObject = Record<string, unknown>;

interface ResponseDoc {
  $ref?: string;
  content?: Record<string, { schema?: JsonObject }>;
}

interface OperationDoc {
  responses: Record<string, ResponseDoc>;
}

interface OpenApiDoc {
  paths: Record<string, Record<string, OperationDoc>>;
  components: { schemas: Record<string, JsonObject> };
}

const DOC = parseYaml(readFileSync(resolve(__dirname, '../../openapi.yaml'), 'utf8')) as OpenApiDoc;

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validators = new Map<string, ValidateFunction>();

function resolvePointer(ref: string): unknown {
  let current: unknown = DOC;
  for (const part of ref.replace(/^#\//, '').split('/')) {
    if (current === null || typeof current !== 'object') {
      throw new Error(`Cannot resolve ${ref}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function responseSchema(method: string, path: string, status: number): JsonObject {
  const operation = DOC.paths[path]?.[method];
  if (!operation) throw new Error(`openapi.yaml has no ${method.toUpperCase()} ${path}`);
  let response = operation.responses[String(status)];
  if (!response) {
    throw new Error(`openapi.yaml has no documented ${status} response for ${path}`);
  }
  if (response.$ref) {
    response = resolvePointer(response.$ref) as ResponseDoc;
  }
  const schema = response.content?.['application/json']?.schema;
  if (!schema) {
    throw new Error(`openapi.yaml has no JSON schema for ${status} ${path}`);
  }
  return schema;
}

/**
 * Compiles the response schema with the document's `components` attached to the
 * root, so `$ref: '#/components/schemas/...'` resolves and OpenAPI `nullable`
 * keeps working. Ajv is the same validator class the API uses for request
 * validation; `ajv-formats` supplies uuid, email and date-time.
 */
function assertContract(
  method: string,
  path: string,
  status: number,
  body: unknown,
  schemaOverride?: JsonObject,
): void {
  const schema = schemaOverride ?? responseSchema(method, path, status);
  const key = JSON.stringify(schema);
  let validate = validators.get(key);
  if (!validate) {
    validate = ajv.compile({ components: DOC.components, ...schema });
    validators.set(key, validate);
  }
  if (!validate(body)) {
    throw new Error(
      `Response for ${method.toUpperCase()} ${path} (${status}) does not match ` +
        `openapi.yaml:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`,
    );
  }
}

describe('CP1 responses match openapi.yaml v0.1 (contract)', () => {
  let app: INestApplication;
  let owner: Client;
  let survey: SurveyFixture;
  let user: SignedUp;
  let withdrawalId: string;
  let surveyResponseId: string;
  let deviceId: string;
  const emails: string[] = [];

  beforeAll(async () => {
    owner = await openOwnerClient();
    survey = await ensurePhq9Survey(owner);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await cleanupUsers(owner, emails);
    await owner.end();
  });

  function auth(): string {
    return bearer(user.auth.accessToken);
  }

  it('signup, /v1/me and session list match their schemas', async () => {
    const email = uniqueEmail('contract-cp1');
    emails.push(email);

    const signedUp = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email, password: PASSWORD, ageConfirmed: true, appVersion: '0.1.0-contract' })
      .expect(201);
    assertContract('post', '/v1/auth/signup', 201, signedUp.body);
    user = { email, auth: signedUp.body.data as AuthResult };

    const me = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/me', 200, me.body);

    const sessions = await request(app.getHttpServer())
      .get('/v1/auth/sessions')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/auth/sessions', 200, sessions.body);
  });

  it('consent list, update and append-only history match their schemas', async () => {
    const list = await request(app.getHttpServer())
      .get('/v1/consents')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/consents', 200, list.body);

    const updated = await request(app.getHttpServer())
      .put('/v1/consents/mood_task_data')
      .set('Authorization', auth())
      .send({ granted: true, appVersion: '0.1.0-contract' })
      .expect(200);
    assertContract('put', '/v1/consents/{item}', 200, updated.body);

    const history = await request(app.getHttpServer())
      .get('/v1/consents/history')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/consents/history', 200, history.body);

    const refused = await request(app.getHttpServer())
      .put('/v1/consents/crisis_detection')
      .set('Authorization', auth())
      .send({ granted: false })
      .expect(403);
    assertContract('put', '/v1/consents/{item}', 403, refused.body);
  });

  it('the two-step withdrawal matches the request and consent schemas', async () => {
    const started = await request(app.getHttpServer())
      .post('/v1/consents/crisis-monitoring/withdrawals')
      .set('Authorization', auth())
      .send({ clientId: randomUUID() })
      .expect(201);
    assertContract('post', '/v1/consents/crisis-monitoring/withdrawals', 201, started.body);
    withdrawalId = started.body.data.id as string;

    const confirmed = await request(app.getHttpServer())
      .post(`/v1/consents/crisis-monitoring/withdrawals/${withdrawalId}/confirm`)
      .set('Authorization', auth())
      .expect(200);
    assertContract(
      'post',
      '/v1/consents/crisis-monitoring/withdrawals/{id}/confirm',
      200,
      confirmed.body,
    );
  });

  it('survey read, retake, save, complete and results match their schemas', async () => {
    const definition = await request(app.getHttpServer())
      .get(`/v1/surveys/${survey.id}`)
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/surveys/{id}', 200, definition.body);

    // No completed result yet, so the retake is the documented empty success.
    const retake = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', auth())
      .send({ surveyKey: survey.key })
      .expect(201);
    assertContract('post', '/v1/surveys/retake', 201, retake.body);

    const clientId = randomUUID();
    const clientCreatedAt = new Date().toISOString();
    const submitted = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', auth())
      .send({ clientId, clientCreatedAt, responses: phq9Answers({ q1: 2, q9: 1 }) })
      .expect(201);
    assertContract('post', '/v1/surveys/{id}/responses', 201, submitted.body);
    surveyResponseId = submitted.body.data.id as string;

    // CONTRACT GAP: openapi.yaml v0.1 documents only 201 for this route, while
    // the plan requires a replayed clientId to return 200 with duplicate: true
    // (plan line 537). The body shape is identical, so it is validated against
    // the documented 201 schema; the missing 200 entry is flagged in the CP1
    // report rather than silently editing the frozen contract.
    const replay = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/responses`)
      .set('Authorization', auth())
      .send({ clientId, clientCreatedAt, responses: phq9Answers({ q1: 2, q9: 1 }) })
      .expect(200);
    expect(replay.body.data.duplicate).toBe(true);
    assertContract(
      'post',
      '/v1/surveys/{id}/responses',
      201,
      replay.body,
      responseSchema('post', '/v1/surveys/{id}/responses', 201),
    );

    const completed = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', auth())
      .send({ responseId: surveyResponseId })
      .expect(200);
    assertContract('post', '/v1/surveys/{id}/complete', 200, completed.body);

    const replayComplete = await request(app.getHttpServer())
      .post(`/v1/surveys/${survey.id}/complete`)
      .set('Authorization', auth())
      .send({ responseId: surveyResponseId })
      .expect(200);
    assertContract('post', '/v1/surveys/{id}/complete', 200, replayComplete.body);

    const results = await request(app.getHttpServer())
      .get('/v1/surveys/results')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/surveys/results', 200, results.body);

    const blocked = await request(app.getHttpServer())
      .post('/v1/surveys/retake')
      .set('Authorization', auth())
      .send({ surveyKey: survey.key })
      .expect(409);
    assertContract('post', '/v1/surveys/retake', 409, blocked.body);

    const missing = await request(app.getHttpServer())
      .get(`/v1/surveys/${randomUUID()}`)
      .set('Authorization', auth())
      .expect(404);
    assertContract('get', '/v1/surveys/{id}', 404, missing.body);
  });

  it('safety plan read, replace, field and sharing match the schema', async () => {
    const empty = await request(app.getHttpServer())
      .get('/v1/safety-plan')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/safety-plan', 200, empty.body);

    const replaced = await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', auth())
      .send({
        field1: 'warning signs',
        field2: 'coping strategies',
        field3: 'people and places',
        field4: 'private reasons',
        field5: 'professional contacts',
      })
      .expect(200);
    assertContract('put', '/v1/safety-plan', 200, replaced.body);

    const oneField = await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/2')
      .set('Authorization', auth())
      .send({ text: 'updated coping strategies' })
      .expect(200);
    assertContract('put', '/v1/safety-plan/fields/{n}', 200, oneField.body);

    const shared = await request(app.getHttpServer())
      .put('/v1/safety-plan/sharing')
      .set('Authorization', auth())
      .send({ sharedWithTherapist: true })
      .expect(200);
    assertContract('put', '/v1/safety-plan/sharing', 200, shared.body);
  });

  it('device, preference and error envelopes match their schemas', async () => {
    const registered = await request(app.getHttpServer())
      .post('/v1/devices')
      .set('Authorization', auth())
      .send({ fcmToken: `fcm-${randomUUID()}`, platform: 'android' })
      .expect(201);
    assertContract('post', '/v1/devices', 201, registered.body);
    deviceId = registered.body.data.id as string;

    const preferences = await request(app.getHttpServer())
      .get('/v1/notification-preferences')
      .set('Authorization', auth())
      .expect(200);
    assertContract('get', '/v1/notification-preferences', 200, preferences.body);

    const toggled = await request(app.getHttpServer())
      .put('/v1/notification-preferences/daily_checkin')
      .set('Authorization', auth())
      .send({ enabled: false })
      .expect(200);
    assertContract('put', '/v1/notification-preferences/{type}', 200, toggled.body);

    const refused = await request(app.getHttpServer())
      .put('/v1/notification-preferences/crisis_alert')
      .set('Authorization', auth())
      .send({ enabled: false })
      .expect(403);
    assertContract('put', '/v1/notification-preferences/{type}', 403, refused.body);

    const removed = await request(app.getHttpServer())
      .delete(`/v1/devices/${deviceId}`)
      .set('Authorization', auth())
      .expect(200);
    assertContract('delete', '/v1/devices/{id}', 200, removed.body);
  });

  it('logout and the error envelopes match their schemas', async () => {
    const loggedOut = await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', auth())
      .expect(200);
    assertContract('post', '/v1/auth/logout', 200, loggedOut.body);

    const unauthenticated = await request(app.getHttpServer()).get('/v1/me').expect(401);
    assertContract('get', '/v1/me', 401, unauthenticated.body);

    const invalid = await request(app.getHttpServer())
      .post('/v1/auth/signup')
      .send({ email: 'not-an-email', password: 'short', ageConfirmed: false })
      .expect(400);
    assertContract('post', '/v1/auth/signup', 400, invalid.body);
  });
});
