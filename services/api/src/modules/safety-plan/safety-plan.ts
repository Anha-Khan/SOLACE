/**
 * Safety-plan domain. Pure: no Prisma, no HTTP, no crypto. Field 4 is the
 * patient's private reminder of reasons to live, so it is never part of the
 * shared projection — the type system enforces that, not a runtime `if`.
 */
export const SAFETY_PLAN_FIELD_NUMBERS = [1, 2, 3, 4, 5] as const;
export type SafetyPlanFieldNumber = (typeof SAFETY_PLAN_FIELD_NUMBERS)[number];

/** R-PLAN-02. Field 4 is absent on purpose and must never be added. */
export const SHARED_SAFETY_PLAN_FIELD_NUMBERS = [1, 2, 3, 5] as const;
export type SharedSafetyPlanFieldNumber = (typeof SHARED_SAFETY_PLAN_FIELD_NUMBERS)[number];

export interface SafetyPlanView {
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field4: string | null;
  field5: string | null;
  sharedWithTherapist: boolean;
  updatedAt: Date;
}

export interface SharedSafetyPlanView {
  field1: string | null;
  field2: string | null;
  field3: string | null;
  field5: string | null;
  sharedWithTherapist: true;
  updatedAt: Date;
}

export function isSafetyPlanFieldNumber(value: number): value is SafetyPlanFieldNumber {
  return (SAFETY_PLAN_FIELD_NUMBERS as readonly number[]).includes(value);
}

/**
 * An empty string is how a client clears a field; it is stored as NULL so an
 * empty value never becomes ciphertext that decrypts to "".
 */
export function normalizeFieldText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.length === 0 ? null : value;
}

/**
 * The therapist-facing projection (CP3 uses it). Returns null when the patient
 * has not shared the plan. Field 4 can never appear in the result.
 */
export function sharedSafetyPlanFields(plan: SafetyPlanView): SharedSafetyPlanView | null {
  if (!plan.sharedWithTherapist) return null;
  return {
    field1: plan.field1,
    field2: plan.field2,
    field3: plan.field3,
    field5: plan.field5,
    sharedWithTherapist: true,
    updatedAt: plan.updatedAt,
  };
}
