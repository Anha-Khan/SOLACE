import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Survey, SurveyResponse, SurveyResult } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

export class DuplicateSurveyClientId extends Error {
  constructor() {
    super('A response with this clientId already exists');
    this.name = 'DuplicateSurveyClientId';
  }
}

export interface CompletionOutcome {
  result: SurveyResult;
  duplicate: boolean;
}

/**
 * Survey persistence. Scoring lives in `scoring.ts`; this repository only stores
 * validated answers and the computed result in one transaction.
 */
@Injectable()
export class SurveyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Survey | null> {
    return this.prisma.survey.findUnique({ where: { id } });
  }

  findByKey(key: string): Promise<Survey | null> {
    return this.prisma.survey.findUnique({ where: { key } });
  }

  findResponseByClientId(userId: string, clientId: string): Promise<SurveyResponse | null> {
    return this.prisma.surveyResponse.findUnique({
      where: { userId_clientId: { userId, clientId } },
    });
  }

  async createResponse(input: {
    userId: string;
    surveyId: string;
    clientId: string;
    responses: Record<string, number>;
    clientCreatedAt: Date;
  }): Promise<SurveyResponse> {
    try {
      return await this.prisma.surveyResponse.create({
        data: {
          userId: input.userId,
          surveyId: input.surveyId,
          clientId: input.clientId,
          responses: input.responses,
          clientCreatedAt: input.clientCreatedAt,
          status: 'in_progress',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateSurveyClientId();
      }
      throw error;
    }
  }

  findResponseForUser(
    id: string,
    userId: string,
    surveyId: string,
  ): Promise<SurveyResponse | null> {
    return this.prisma.surveyResponse.findFirst({ where: { id, userId, surveyId } });
  }

  findResultByResponseId(responseId: string): Promise<SurveyResult | null> {
    return this.prisma.surveyResult.findUnique({ where: { responseId } });
  }

  listResults(userId: string): Promise<SurveyResult[]> {
    return this.prisma.surveyResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findLatestResult(userId: string, surveyId: string): Promise<SurveyResult | null> {
    return this.prisma.surveyResult.findFirst({
      where: { userId, surveyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marks the response completed and stores its result exactly once. The
   * conditional update on `status = in_progress` is the concurrency guard: a
   * second completion (or a retry) sees count 0 and returns the existing result
   * with `duplicate: true` instead of violating the unique constraint.
   */
  async complete(input: {
    responseId: string;
    userId: string;
    surveyId: string;
    scores: Record<string, number>;
    totalScore: number;
    phq9Item9: number | null;
    now: Date;
  }): Promise<CompletionOutcome | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.surveyResult.findUnique({
        where: { responseId: input.responseId },
      });
      if (existing && existing.userId === input.userId) {
        return { result: existing, duplicate: true };
      }

      const updated = await tx.surveyResponse.updateMany({
        where: {
          id: input.responseId,
          userId: input.userId,
          surveyId: input.surveyId,
          status: 'in_progress',
        },
        data: { status: 'completed', completedAt: input.now },
      });
      if (updated.count !== 1) {
        const raced = await tx.surveyResult.findUnique({
          where: { responseId: input.responseId },
        });
        return raced && raced.userId === input.userId ? { result: raced, duplicate: true } : null;
      }

      const result = await tx.surveyResult.create({
        data: {
          userId: input.userId,
          surveyId: input.surveyId,
          responseId: input.responseId,
          scores: input.scores,
          totalScore: input.totalScore,
          phq9Item9: input.phq9Item9,
        },
      });
      return { result, duplicate: false };
    });
  }
}
