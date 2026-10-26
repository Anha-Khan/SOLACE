import {
  isSafetyPlanFieldNumber,
  normalizeFieldText,
  sharedSafetyPlanFields,
} from '../../src/modules/safety-plan/safety-plan';
import type { SafetyPlanView } from '../../src/modules/safety-plan/safety-plan';

const updatedAt = new Date('2026-04-01T10:00:00.000Z');

function plan(overrides: Partial<SafetyPlanView> = {}): SafetyPlanView {
  return {
    field1: 'warning signs',
    field2: 'coping strategies',
    field3: 'people and places',
    field4: 'reasons to live — never shared',
    field5: 'professional contacts',
    sharedWithTherapist: true,
    updatedAt,
    ...overrides,
  };
}

describe('REQ-PLAN-02: field 4 is never shared', () => {
  it('excludes field 4 from the therapist projection', () => {
    const shared = sharedSafetyPlanFields(plan());
    expect(shared).not.toBeNull();
    expect(shared).not.toHaveProperty('field4');
    expect(JSON.stringify(shared)).not.toContain('never shared');
    expect(shared).toMatchObject({
      field1: 'warning signs',
      field2: 'coping strategies',
      field3: 'people and places',
      field5: 'professional contacts',
      sharedWithTherapist: true,
    });
  });

  it('returns nothing at all when sharing is off', () => {
    expect(sharedSafetyPlanFields(plan({ sharedWithTherapist: false }))).toBeNull();
  });
});

describe('safety plan field helpers', () => {
  it('accepts exactly fields 1 to 5', () => {
    for (const field of [1, 2, 3, 4, 5]) {
      expect(isSafetyPlanFieldNumber(field)).toBe(true);
    }
    for (const field of [0, 6, -1, 1.5]) {
      expect(isSafetyPlanFieldNumber(field)).toBe(false);
    }
  });

  it('clears a field with an empty string but preserves whitespace and text', () => {
    expect(normalizeFieldText('')).toBeNull();
    expect(normalizeFieldText(null)).toBeNull();
    expect(normalizeFieldText(undefined)).toBeNull();
    expect(normalizeFieldText(' ')).toBe(' ');
    expect(normalizeFieldText('  call someone  ')).toBe('  call someone  ');
  });
});
