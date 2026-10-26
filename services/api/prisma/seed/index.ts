/**
 * Development seed. Synthetic data only: no real names, emails or clinical
 * content. Never run against staging or production.
 *
 * Safety: the seed refuses to run when NODE_ENV is staging or production, and
 * it uses MIGRATION_DATABASE_URL (the owner role) because the runtime role may
 * not rewrite rows.
 */
import { PrismaClient } from '@prisma/client';

const OWNER_URL = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  process.stderr.write('Refusing to seed a non-development environment.\n');
  process.exit(1);
}

const prisma = new PrismaClient(OWNER_URL ? { datasourceUrl: OWNER_URL } : undefined);

const SYNTHETIC_EMAIL_DOMAIN = 'example.invalid';

async function main(): Promise<void> {
  const survey = await prisma.survey.upsert({
    where: { key: 'phq9' },
    update: {},
    create: {
      key: 'phq9',
      title: 'Synthetic PHQ-9 (development fixture)',
      version: 1,
    },
  });

  const therapist = await prisma.user.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      role: 'therapist',
      status: 'active',
      ageConfirmedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  await prisma.therapistProfile.upsert({
    where: { userId: therapist.id },
    update: {},
    create: {
      userId: therapist.id,
      licenceCiphertext: 'synthetic-ciphertext-not-a-real-licence',
      keyId: 'dev-key',
      professionalBody: 'Synthetic Body',
      countryOfPractice: 'XX',
      verificationStatus: 'verified',
      verifiedAt: new Date('2026-01-02T00:00:00.000Z'),
      mfaEnabled: false,
    },
  });

  const patient = await prisma.user.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      role: 'patient',
      status: 'active',
      ageConfirmedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const consentItems = [
    'mood_task_data',
    'journal_storage',
    'crisis_detection',
    'tier3_therapist_alert',
  ] as const;

  const existingConsent = await prisma.consentRecord.count({ where: { userId: patient.id } });
  if (existingConsent === 0) {
    await prisma.consentRecord.createMany({
      data: consentItems.map((item) => ({
        userId: patient.id,
        item,
        granted: true,
        source: 'onboarding' as const,
        appVersion: '0.0.0-seed',
      })),
    });
  }

  await prisma.connection.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      patientId: patient.id,
      therapistId: therapist.id,
      state: 'active',
      confirmedAt: new Date('2026-01-03T00:00:00.000Z'),
    },
  });

  await prisma.surveyResponse.upsert({
    where: {
      userId_clientId: {
        userId: patient.id,
        clientId: '00000000-0000-4000-8000-000000000004',
      },
    },
    update: {},
    create: {
      userId: patient.id,
      surveyId: survey.id,
      clientId: '00000000-0000-4000-8000-000000000004',
      responses: { q1: 2, q2: 1, q3: 2, q4: 1, q5: 1, q6: 0, q7: 1, q8: 0, q9: 1 },
      status: 'completed',
      clientCreatedAt: new Date('2026-01-04T09:00:00.000Z'),
      completedAt: new Date('2026-01-04T09:05:00.000Z'),
    },
  });

  await prisma.resource.deleteMany({
    where: { name: { startsWith: 'Synthetic ' } },
  });
  await prisma.resource.createMany({
    data: [
      {
        name: 'Synthetic Emergency Line',
        number: '000',
        hours: '24/7',
        ownerName: 'Synthetic Provider',
        lastVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        isEmergency: true,
      },
      {
        name: 'Synthetic Helpline',
        number: '000-0000',
        hours: '24/7',
        ownerName: 'Synthetic Provider',
        lastVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        isEmergency: false,
      },
    ],
  });

  process.stdout.write(
    `Seeded synthetic data: survey=${survey.id} therapist=${therapist.id} patient=${patient.id}\n` +
      `Emails use the reserved domain ${SYNTHETIC_EMAIL_DOMAIN}.\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
