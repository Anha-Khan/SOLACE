import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { KEY_PROVIDER, type KeyProvider } from './key-provider';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Binds a ciphertext to its table, column and row (ADR-6). */
export function aadFor(table: string, column: string, rowId: string): string {
  return `${table}:${column}:${rowId}`;
}

export class FieldDecryptionError extends Error {
  constructor(reason: string) {
    // Never include the ciphertext or the plaintext in the message.
    super(`Field decryption failed: ${reason}`);
    this.name = 'FieldDecryptionError';
  }
}

/**
 * AES-256-GCM helpers. Ciphertext layout is
 * `base64(iv[12] || authTag[16] || ciphertext)`. AAD is mandatory so a value
 * copied to another row cannot be decrypted in its new context.
 */
@Injectable()
export class FieldEncryptionService {
  constructor(@Inject(KEY_PROVIDER) private readonly keyProvider: KeyProvider) {}

  currentKeyId(): string {
    return this.keyProvider.current().keyId;
  }

  encrypt(plaintext: string, aad: string): string {
    const { key } = this.keyProvider.current();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  decrypt(payload: string, aad: string): string {
    let envelope: Buffer;
    try {
      envelope = Buffer.from(payload, 'base64');
    } catch {
      throw new FieldDecryptionError('not base64');
    }
    if (envelope.length <= IV_BYTES + TAG_BYTES) {
      throw new FieldDecryptionError('payload is too short');
    }
    const iv = envelope.subarray(0, IV_BYTES);
    const tag = envelope.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = envelope.subarray(IV_BYTES + TAG_BYTES);
    try {
      const decipher = createDecipheriv(ALGORITHM, this.keyProvider.current().key, iv);
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      // Wrong key, wrong AAD, or a tampered value. Do not disclose which.
      throw new FieldDecryptionError('authentication failed');
    }
  }

  encryptOptional(value: string | null | undefined, aad: string): string | null {
    if (value === null || value === undefined) return null;
    return this.encrypt(value, aad);
  }

  decryptOptional(payload: string | null | undefined, aad: string): string | null {
    if (payload === null || payload === undefined) return null;
    return this.decrypt(payload, aad);
  }
}
