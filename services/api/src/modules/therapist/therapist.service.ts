import { Inject, Injectable } from '@nestjs/common';
import { FieldEncryptionService, aadFor } from '../../common/crypto/field-encryption.service';
import { KEY_PROVIDER, type KeyProvider } from '../../common/crypto/key-provider';
import { PrismaService } from '../../common/prisma.service';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class TherapistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldEncryption: FieldEncryptionService,
    @Inject(KEY_PROVIDER) private readonly keyProvider: KeyProvider,
  ) {}

  async onboarding(
    user: AuthenticatedUser,
    input: { licenceNumber: string; professionalBody: string; countryOfPractice: string },
  ): Promise<{ id: string; userId: string; verificationStatus: string }> {
    if (user.role !== 'therapist') {
      throw new ApiError('FORBIDDEN', 'Therapist role required');
    }
    const key = this.keyProvider.current();
    const ciphertext = this.fieldEncryption.encrypt(
      input.licenceNumber,
      aadFor('therapist_profiles', 'licence_ciphertext', user.id),
    );
    const profile = await this.prisma.therapistProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        licenceCiphertext: ciphertext,
        keyId: key.keyId,
        professionalBody: input.professionalBody,
        countryOfPractice: input.countryOfPractice,
      },
      update: {
        licenceCiphertext: ciphertext,
        keyId: key.keyId,
        professionalBody: input.professionalBody,
        countryOfPractice: input.countryOfPractice,
      },
    });
    return {
      id: profile.id,
      userId: profile.userId,
      verificationStatus: profile.verificationStatus,
    };
  }

  async acknowledge(_user: AuthenticatedUser): Promise<null> {
    return null;
  }
}
