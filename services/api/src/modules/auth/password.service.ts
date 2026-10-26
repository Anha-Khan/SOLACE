import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/**
 * OWASP-recommended argon2id baseline (19 MiB, 2 iterations, 1 lane).
 * Password length is bounded at the DTO; composition rules are not imposed
 * (length is the property that matters, and composition rules push users to
 * predictable substitutions).
 */
const HASH_OPTIONS = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * A valid hash used only to keep the failed-login timing similar when the email
 * does not exist. It is not a credential for any account.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$AIc5+hh1lxtaPHMOcmYPVA$krqF8Qwd7L0WOC9lGeaZinReJrXmSthKdozRjwN3WGc';

@Injectable()
export class PasswordService {
  hash(plaintext: string): Promise<string> {
    return hash(plaintext, HASH_OPTIONS);
  }

  async verify(storedHash: string, plaintext: string): Promise<boolean> {
    try {
      return await verify(storedHash, plaintext);
    } catch {
      return false;
    }
  }

  /** Always false. Keeps the no-such-user path from being obviously faster. */
  async verifyDummy(plaintext: string): Promise<false> {
    await this.verify(DUMMY_HASH, plaintext);
    return false;
  }
}
