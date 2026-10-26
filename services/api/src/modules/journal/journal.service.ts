import { Injectable } from '@nestjs/common';
import { FieldEncryptionService, aadFor } from '../../common/crypto/field-encryption.service';
import { KEY_PROVIDER, type KeyProvider } from '../../common/crypto/key-provider';
import { PrismaService } from '../../common/prisma.service';
import { Inject } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JournalPrivacy } from '../../common/enums';

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    @Inject(KEY_PROVIDER) private readonly keyProvider: KeyProvider,
  ) {}

  async createEntry(
    user: AuthenticatedUser,
    kind: 'recovery' | 'personal',
    input: { clientId: string; text: string; clientCreatedAt: string },
  ) {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { userId_clientId: { userId: user.id, clientId: input.clientId } },
    });
    if (existing) return { ...existing, duplicate: true };
    const key = this.keyProvider.current();
    const ciphertext = this.fieldEncryption.encrypt(
      input.text,
      aadFor('journal_entries', 'ciphertext', input.clientId),
    );
    const created = await this.prisma.journalEntry.create({
      data: {
        userId: user.id,
        kind,
        clientId: input.clientId,
        ciphertext,
        keyId: key.keyId,
        clientCreatedAt: new Date(input.clientCreatedAt),
        analysisStatus: 'pending',
      },
    });
    return { ...created, duplicate: false };
  }

  async listEntries(user: AuthenticatedUser, kind: 'recovery' | 'personal') {
    const rows = await this.prisma.journalEntry.findMany({
      where: { userId: user.id, kind },
      orderBy: { clientCreatedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        clientId: true,
        clientCreatedAt: true,
        serverReceivedAt: true,
        analysisStatus: true,
        historical: true,
      },
    });
    return rows;
  }

  async setPrivacy(user: AuthenticatedUser, privacy: JournalPrivacy) {
    await this.prisma.user.update({ where: { id: user.id }, data: { journalPrivacy: privacy } });
    return { journalPrivacy: privacy };
  }

  async getPrivacy(user: AuthenticatedUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id } });
    return { journalPrivacy: u?.journalPrivacy ?? 'hidden_from_therapist' };
  }
}
