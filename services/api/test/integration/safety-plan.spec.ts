import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { bearer, cleanupUsers, openOwnerClient, signup, uniqueEmail } from '../helpers/cp1';
import type { AuthResult } from '../helpers/cp1';

interface SafetyPlan {
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field4: string | null;
  field5: string | null;
  sharedWithTherapist: boolean;
  updatedAt: string;
}

interface StoredPlan {
  field1_ciphertext: string | null;
  field2_ciphertext: string | null;
  field3_ciphertext: string | null;
  field4_ciphertext: string | null;
  field5_ciphertext: string | null;
  key_id: string;
  shared_with_therapist: boolean;
}

const FIELDS = {
  field1: 'warning signs: isolating for two days',
  field2: 'call my sister and walk to the park',
  field3: 'my sister, the park bench, the library',
  field4: 'reasons to live: my dog and my sister',
  field5: 'safety line 000 and my therapist',
};

describe('safety plan encryption and field isolation (integration)', () => {
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

  async function getPlan(auth: AuthResult): Promise<SafetyPlan> {
    const response = await request(app.getHttpServer())
      .get('/v1/safety-plan')
      .set('Authorization', bearer(auth.accessToken))
      .expect(200);
    return response.body.data as SafetyPlan;
  }

  async function storedPlan(auth: AuthResult): Promise<StoredPlan> {
    const result = await owner.query<StoredPlan>(
      `SELECT field1_ciphertext, field2_ciphertext, field3_ciphertext,
              field4_ciphertext, field5_ciphertext, key_id, shared_with_therapist
         FROM safety_plans WHERE user_id = $1`,
      [auth.user.id],
    );
    return result.rows[0];
  }

  it('creates an empty plan on first read without inventing values', async () => {
    const auth = await newUser('plan-empty');

    const plan = await getPlan(auth);
    expect(plan).toMatchObject({
      field1: null,
      field2: null,
      field3: null,
      field4: null,
      field5: null,
      sharedWithTherapist: false,
    });
    expect(Number.isNaN(Date.parse(plan.updatedAt))).toBe(false);

    const stored = await storedPlan(auth);
    expect(stored.field1_ciphertext).toBeNull();
    expect(stored.field4_ciphertext).toBeNull();
    expect(stored.key_id.length).toBeGreaterThan(0);
    expect(stored.shared_with_therapist).toBe(false);
  });

  it('stores ciphertext only and re-encrypts with a fresh IV', async () => {
    const auth = await newUser('plan-encrypt');

    const replaced = await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', bearer(auth.accessToken))
      .send(FIELDS)
      .expect(200);
    expect(replaced.body.data).toMatchObject(FIELDS);

    const serialised = JSON.stringify(replaced.body);
    expect(serialised).not.toContain('ciphertext');
    expect(serialised).not.toContain('keyId');

    const first = await storedPlan(auth);
    for (const column of [
      'field1_ciphertext',
      'field2_ciphertext',
      'field3_ciphertext',
      'field4_ciphertext',
      'field5_ciphertext',
    ] as const) {
      const ciphertext = first[column];
      expect(typeof ciphertext).toBe('string');
      expect(Buffer.from(ciphertext as string, 'base64').length).toBeGreaterThan(28);
      for (const plaintext of Object.values(FIELDS)) {
        expect(ciphertext).not.toContain(plaintext);
      }
    }

    // Same plaintext, same AAD, different IV: the stored value must change.
    await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', bearer(auth.accessToken))
      .send(FIELDS)
      .expect(200);
    const second = await storedPlan(auth);
    expect(second.field1_ciphertext).not.toBe(first.field1_ciphertext);

    const plan = await getPlan(auth);
    expect(plan).toMatchObject(FIELDS);
  });

  it('clears a field with an empty string and updates one field at a time', async () => {
    const auth = await newUser('plan-fields');

    await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', bearer(auth.accessToken))
      .send(FIELDS)
      .expect(200);

    const cleared = await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/3')
      .set('Authorization', bearer(auth.accessToken))
      .send({ text: '' })
      .expect(200);
    expect(cleared.body.data.field3).toBeNull();
    expect(cleared.body.data.field1).toBe(FIELDS.field1);

    const updated = await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/1')
      .set('Authorization', bearer(auth.accessToken))
      .send({ text: updatedText() })
      .expect(200);
    expect(updated.body.data.field1).toBe(updatedText());
    expect(updated.body.data.field2).toBe(FIELDS.field2);

    const stored = await storedPlan(auth);
    expect(stored.field3_ciphertext).toBeNull();
    expect(stored.field1_ciphertext).not.toBeNull();
  });

  it('rejects out-of-range fields, oversized text and malformed bodies', async () => {
    const auth = await newUser('plan-validation');

    for (const field of [0, 6]) {
      const response = await request(app.getHttpServer())
        .put(`/v1/safety-plan/fields/${field}`)
        .set('Authorization', bearer(auth.accessToken))
        .send({ text: 'value' })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    }

    const malformed = await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/not-a-number')
      .set('Authorization', bearer(auth.accessToken))
      .send({ text: 'value' })
      .expect(400);
    expect(malformed.body.error.code).toBe('VALIDATION_FAILED');

    const oversized = await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/1')
      .set('Authorization', bearer(auth.accessToken))
      .send({ text: 'x'.repeat(2001) })
      .expect(400);
    expect(oversized.body.error.code).toBe('VALIDATION_FAILED');

    const missing = await request(app.getHttpServer())
      .put('/v1/safety-plan/sharing')
      .set('Authorization', bearer(auth.accessToken))
      .send({})
      .expect(400);
    expect(missing.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('toggles sharing while keeping field 4 visible to its owner only', async () => {
    const auth = await newUser('plan-sharing');

    await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', bearer(auth.accessToken))
      .send(FIELDS)
      .expect(200);

    const shared = await request(app.getHttpServer())
      .put('/v1/safety-plan/sharing')
      .set('Authorization', bearer(auth.accessToken))
      .send({ sharedWithTherapist: true })
      .expect(200);
    expect(shared.body.data).toMatchObject({
      sharedWithTherapist: true,
      field4: FIELDS.field4,
    });

    const unshared = await request(app.getHttpServer())
      .put('/v1/safety-plan/sharing')
      .set('Authorization', bearer(auth.accessToken))
      .send({ sharedWithTherapist: false })
      .expect(200);
    expect(unshared.body.data.sharedWithTherapist).toBe(false);
  });

  it('keeps each patient’s plan separate', async () => {
    const patient = await newUser('plan-owner');
    const other = await newUser('plan-other');

    await request(app.getHttpServer())
      .put('/v1/safety-plan')
      .set('Authorization', bearer(patient.accessToken))
      .send(FIELDS)
      .expect(200);

    const otherPlan = await getPlan(other);
    expect(otherPlan).toMatchObject({
      field1: null,
      field2: null,
      field3: null,
      field4: null,
      field5: null,
    });

    await request(app.getHttpServer())
      .put('/v1/safety-plan/fields/2')
      .set('Authorization', bearer(other.accessToken))
      .send({ text: 'a different person’s plan' })
      .expect(200);

    const patientPlan = await getPlan(patient);
    expect(patientPlan.field1).toBe(FIELDS.field1);
    expect(patientPlan.field2).toBe(FIELDS.field2);
  });
});

function updatedText(): string {
  return 'updated warning signs';
}
