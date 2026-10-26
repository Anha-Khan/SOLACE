import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Boots the real module (real PostgreSQL and Redis) and checks the envelope
 * contract on the only two routes Phase 1 allows. Global filter, interceptor,
 * pipe and middleware come from AppModule, exactly as in production.
 */
describe('health endpoints (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns the standard envelope with 200', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      error: null,
      data: { status: 'ok', version: '0.1.0' },
    });
    expect(typeof response.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('GET /ready checks both dependencies and returns 200', async () => {
    const response = await request(app.getHttpServer()).get('/ready').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.checks).toEqual({ postgres: 'ok', redis: 'ok' });
  });

  it('an unknown route returns the error envelope, never a stack trace', async () => {
    const response = await request(app.getHttpServer()).get('/nope').expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.data).toBeNull();
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(response.body)).not.toMatch(/at .*\(.*:\d+:\d+\)/);
  });

  it('sets an x-request-id header', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.headers['x-request-id']).toBeTruthy();
  });
});
