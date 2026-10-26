import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SafetyPlan } from '@prisma/client';
import { FieldEncryptionService, aadFor } from '../../common/crypto/field-encryption.service';
import { PrismaService } from '../../common/prisma.service';
import { normalizeFieldText } from './safety-plan';
import type { SafetyPlanFieldNumber, SafetyPlanView } from './safety-plan';

const TABLE = 'safety_plans';

/**
 * Encryption stays in this repository (ADR-6): no service or controller ever
 * sees ciphertext, and no caller can accidentally store plaintext.
 *
 * The AAD binds each value to `safety_plans:fieldN:<rowId>`, so moving a
 * ciphertext to another field or another patient's plan makes decryption fail.
 * CP1 uses one local key. Key rotation (CP4–CP5) will resolve the stored keyId
 * before decrypting; until then a mismatched key fails closed.
 */
@Injectable()
export class SafetyPlanRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: FieldEncryptionService,
  ) {}

  async get(userId: string): Promise<SafetyPlanView> {
    const row = await this.ensureRow(userId);
    return this.decryptRow(row);
  }

  async replace(
    userId: string,
    fields: Record<SafetyPlanFieldNumber, string | null>,
  ): Promise<SafetyPlanView> {
    const row = await this.ensureRow(userId);
    const updated = await this.prisma.safetyPlan.update({
      where: { userId },
      data: {
        keyId: this.crypto.currentKeyId(),
        field1Ciphertext: this.encryptField(row.id, 1, fields[1]),
        field2Ciphertext: this.encryptField(row.id, 2, fields[2]),
        field3Ciphertext: this.encryptField(row.id, 3, fields[3]),
        field4Ciphertext: this.encryptField(row.id, 4, fields[4]),
        field5Ciphertext: this.encryptField(row.id, 5, fields[5]),
      },
    });
    return this.decryptRow(updated);
  }

  async setField(
    userId: string,
    field: SafetyPlanFieldNumber,
    text: string | null,
  ): Promise<SafetyPlanView> {
    const row = await this.ensureRow(userId);
    const ciphertext = this.encryptField(row.id, field, normalizeFieldText(text));

    const data: Prisma.SafetyPlanUpdateInput = { keyId: this.crypto.currentKeyId() };
    switch (field) {
      case 1:
        data.field1Ciphertext = ciphertext;
        break;
      case 2:
        data.field2Ciphertext = ciphertext;
        break;
      case 3:
        data.field3Ciphertext = ciphertext;
        break;
      case 4:
        data.field4Ciphertext = ciphertext;
        break;
      case 5:
        data.field5Ciphertext = ciphertext;
        break;
    }

    const updated = await this.prisma.safetyPlan.update({ where: { userId }, data });
    return this.decryptRow(updated);
  }

  async setSharing(userId: string, sharedWithTherapist: boolean): Promise<SafetyPlanView> {
    await this.ensureRow(userId);
    const updated = await this.prisma.safetyPlan.update({
      where: { userId },
      data: { sharedWithTherapist },
    });
    return this.decryptRow(updated);
  }

  /**
   * A GET lazily creates the row once so `updatedAt` is a real server timestamp
   * and the plan always exists for its owner. The create is race-safe: the
   * unique userId makes the loser read the winner's row.
   */
  private async ensureRow(userId: string): Promise<SafetyPlan> {
    const existing = await this.prisma.safetyPlan.findUnique({ where: { userId } });
    if (existing) return existing;

    try {
      return await this.prisma.safetyPlan.create({
        data: {
          id: randomUUID(),
          userId,
          keyId: this.crypto.currentKeyId(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.prisma.safetyPlan.findUnique({ where: { userId } });
        if (raced) return raced;
      }
      throw error;
    }
  }

  private encryptField(
    rowId: string,
    field: SafetyPlanFieldNumber,
    text: string | null,
  ): string | null {
    if (text === null) return null;
    return this.crypto.encrypt(text, aadFor(TABLE, `field${field}`, rowId));
  }

  private decryptRow(row: SafetyPlan): SafetyPlanView {
    const aad = (field: SafetyPlanFieldNumber): string => aadFor(TABLE, `field${field}`, row.id);
    return {
      field1: this.crypto.decryptOptional(row.field1Ciphertext, aad(1)),
      field2: this.crypto.decryptOptional(row.field2Ciphertext, aad(2)),
      field3: this.crypto.decryptOptional(row.field3Ciphertext, aad(3)),
      field4: this.crypto.decryptOptional(row.field4Ciphertext, aad(4)),
      field5: this.crypto.decryptOptional(row.field5Ciphertext, aad(5)),
      sharedWithTherapist: row.sharedWithTherapist,
      updatedAt: row.updatedAt,
    };
  }
}
