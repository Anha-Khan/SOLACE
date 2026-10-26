import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists');
    this.name = 'DuplicateEmailError';
  }
}

/**
 * All user persistence. Services never import Prisma. The onboarding consent
 * record is written in the same statement as the account, so an account cannot
 * exist without the safety-monitoring record.
 *
 * ASSUMPTION (spec file absent): signup records crisis_detection as granted
 * from onboarding. The contract carries no consent payload and monitoring is the
 * core safety function. Every other item starts refused until the client
 * explicitly grants it. A reviewer must confirm this default.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createPatient(input: {
    email: string;
    passwordHash: string;
    appVersion: string | null;
  }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          role: 'patient',
          status: 'active',
          email: input.email,
          passwordHash: input.passwordHash,
          ageConfirmedAt: new Date(),
          consentRecords: {
            create: [
              {
                item: 'crisis_detection',
                granted: true,
                source: 'onboarding',
                appVersion: input.appVersion,
              },
            ],
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }
}
