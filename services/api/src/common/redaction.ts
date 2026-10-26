/**
 * Fields that must never appear in a log line, at any level, in any nesting.
 * Global Rule 4. This list is exported so tests can assert it covers every
 * sensitive field the domain knows about.
 */
export const REDACTED_KEYS = [
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'tokenHash',
  'authorization',
  'cookie',
  'email',
  'phone',
  'phoneNumber',
  'journalText',
  'journal',
  'journalCiphertext',
  'ciphertext',
  'plaintext',
  'safetyPlan',
  'firstName',
  'lastName',
  'dob',
  'dateOfBirth',
  'licenceNumber',
  'licenseNumber',
  'fcmToken',
  'aiApiKey',
  'apiKey',
  'secret',
] as const;

export const REDACTED = '[REDACTED]';

const REDACTED_SET: ReadonlySet<string> = new Set(REDACTED_KEYS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Returns a deep copy with every sensitive key replaced by `[REDACTED]`.
 * Handles nested objects and arrays. Cycles are cut with `[Circular]`.
 */
export function redactObject(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, seen));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = REDACTED_SET.has(key) ? REDACTED : redactObject(child, seen);
  }
  seen.delete(value);
  return out;
}

export const REDACT_PATHS: string[] = REDACTED_KEYS.flatMap((key) => [
  key,
  `*.${key}`,
  `*.*.${key}`,
]);
