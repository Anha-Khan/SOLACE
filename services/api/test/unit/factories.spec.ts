import {
  createAlertEvent,
  createCheckIn,
  createConsentRecord,
  createCrisisAlert,
  createCrisisEvent,
  createInvite,
  createJournalEntry,
  createSession,
  createTaskAssignment,
  createUser,
} from '../../src/common/factories';

describe('domain factories', () => {
  it('populates every required field and never leaves undefined', () => {
    const user = createUser({ role: 'patient' });
    const session = createSession({ userId: user.id, refreshTokenHash: 'hash' });
    const consent = createConsentRecord({
      userId: user.id,
      item: 'crisis_detection',
      granted: true,
      source: 'onboarding',
    });
    const invite = createInvite({
      patientId: user.id,
      therapistEmail: 't@example.com',
      patientFirstName: 'A',
      tokenHash: 'hash',
      expiresAt: new Date(),
    });
    const alert = createCrisisAlert({ userId: user.id, crisisEventId: 'e' });
    const alertEvent = createAlertEvent({
      alertId: alert.id,
      fromState: 'detected',
      toState: 'dispatched',
      actor: 'system',
    });

    for (const entity of [user, session, consent, invite, alert, alertEvent]) {
      expect(entity.id).toMatch(/^[0-9a-f-]{36}$/);
      for (const [key, value] of Object.entries(entity)) {
        expect(value).not.toBeUndefined();
        expect(key).not.toBe('');
      }
    }
  });

  it('gives mutable entities an updatedAt and append-only entities none', () => {
    const user = createUser({ role: 'patient' });
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.createdAt.getTime()).toBeLessThanOrEqual(user.updatedAt.getTime());

    const consent = createConsentRecord({
      userId: user.id,
      item: 'journal_storage',
      granted: false,
      source: 'settings',
    });
    expect('updatedAt' in consent).toBe(false);

    const event = createCrisisEvent({
      userId: user.id,
      tier: 'tier3',
      triggerType: 'tier3_explicit_language',
      ruleVersion: 'v1',
      clientCreatedAt: new Date(),
    });
    expect('updatedAt' in event).toBe(false);
  });

  it('rejects a mood outside 1..10', () => {
    expect(() =>
      createCheckIn({
        userId: 'u',
        clientId: 'c',
        mood: 0,
        feelingWords: [],
        clientCreatedAt: new Date(),
      }),
    ).toThrow(RangeError);
    expect(() =>
      createCheckIn({
        userId: 'u',
        clientId: 'c',
        mood: 11,
        feelingWords: [],
        clientCreatedAt: new Date(),
      }),
    ).toThrow(RangeError);
  });

  it('keeps optional fields null rather than undefined', () => {
    const journal = createJournalEntry({
      userId: 'u',
      kind: 'personal',
      clientId: 'c',
      ciphertext: 'x',
      keyId: 'k',
      clientCreatedAt: new Date(),
    });
    expect(journal.analysisStatus).toBe('pending');
    expect(journal.historical).toBe(false);

    const task = createTaskAssignment({
      userId: 'u',
      taskKey: 't',
      assignedFor: new Date('2026-10-24'),
    });
    expect(task.completedAt).toBeNull();
    expect(task.helpRating).toBeNull();
    expect(task.swapReason).toBeNull();
  });

  it('starts a crisis alert in detected with an empty checklist', () => {
    const alert = createCrisisAlert({ userId: 'u', crisisEventId: 'e' });
    expect(alert.state).toBe('detected');
    expect(alert.escalatedExternal).toBe(false);
    expect(alert.checklist).toEqual({});
    expect(alert.undoDeadline).toBeNull();
  });
});
