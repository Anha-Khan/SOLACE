import { Writable } from 'node:stream';
import { createLogger } from '../../src/common/logger';
import { REDACTED, REDACTED_KEYS, redactObject } from '../../src/common/redaction';

function capture(): { stream: Writable; output: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  return { stream, output: () => chunks.join('') };
}

describe('log redaction (Global Rule 4)', () => {
  it('replaces journalText with [REDACTED] in the emitted log line', () => {
    const { stream, output } = capture();
    const logger = createLogger({ level: 'info', pretty: false, destination: stream });

    logger.info(
      {
        journalText: 'I want to disappear tonight',
        userId: 'user-1',
        nested: { safetyPlan: 'call my brother', feeling: 'low' },
      },
      'journal saved',
    );

    const line = output();
    expect(line).toContain('[REDACTED]');
    expect(line).not.toContain('disappear');
    expect(line).not.toContain('call my brother');
    expect(line).toContain('user-1');
    expect(line).toContain('low');
  });

  it('redacts at arbitrary depth and inside arrays', () => {
    const result = redactObject({
      a: { b: { c: { password: 'hunter2' } } },
      list: [{ email: 'a@b.c' }, { ok: true }],
    }) as Record<string, unknown>;

    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(JSON.stringify(result)).not.toContain('a@b.c');
    expect(JSON.stringify(result)).toContain(REDACTED);
  });

  it('cuts cycles instead of throwing', () => {
    const node: Record<string, unknown> = { name: 'root' };
    node.self = node;
    expect(redactObject(node)).toEqual({ name: 'root', self: '[Circular]' });
  });

  it('covers every field the plan names explicitly', () => {
    for (const key of [
      'password',
      'token',
      'email',
      'phone',
      'journalText',
      'safetyPlan',
      'firstName',
      'lastName',
      'dob',
      'licenceNumber',
    ]) {
      expect(REDACTED_KEYS).toContain(key);
    }
  });

  it('never logs the request body shape by accident', () => {
    const { stream, output } = capture();
    const logger = createLogger({ level: 'info', pretty: false, destination: stream });
    logger.info({ body: { password: 'x', nested: { refreshToken: 'y' } } }, 'request');
    expect(output()).not.toContain('"password":"x"');
    expect(output()).not.toContain('"refreshToken":"y"');
  });
});
