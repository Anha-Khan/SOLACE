import { PasswordService } from '../../src/modules/auth/password.service';

describe('password hashing (REQ-AUTH-01, ADR-7)', () => {
  const passwords = new PasswordService();
  const plaintext = 'correct-horse-battery-staple';

  it('hashes with argon2id, never with the plaintext', async () => {
    const hashed = await passwords.hash(plaintext);
    expect(hashed.startsWith('$argon2id$')).toBe(true);
    expect(hashed).not.toContain(plaintext);
  });

  it('salts each hash independently', async () => {
    const first = await passwords.hash(plaintext);
    const second = await passwords.hash(plaintext);
    expect(first).not.toBe(second);
    await expect(passwords.verify(first, plaintext)).resolves.toBe(true);
    await expect(passwords.verify(second, plaintext)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hashed = await passwords.hash(plaintext);
    await expect(passwords.verify(hashed, 'wrong-password')).resolves.toBe(false);
  });

  it('fails closed on a malformed stored hash', async () => {
    await expect(passwords.verify('not-a-hash', plaintext)).resolves.toBe(false);
  });

  it('always fails the dummy comparison used for unknown emails', async () => {
    await expect(passwords.verifyDummy(plaintext)).resolves.toBe(false);
  });
});
