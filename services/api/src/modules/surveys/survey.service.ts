import { Injectable } from '@nestjs/common';
import type { Survey, SurveyResponse, SurveyResult } from '@prisma/client';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';
import { parseSurveyItems } from './definitions';
import type { SurveyItemDefinition } from './definitions';
import { DuplicateSurveyClientId, SurveyRepository } from './survey.repository';
import {
  RETAKE_COOLDOWN_DAYS,
  SurveyResponseError,
  retakeAvailableAt,
  retakeAllowed,
  scoreSurvey,
  validateResponses,
} from './scoring';
import type { ScoringOutcome } from './scoring';
import type { SubmitSurveyResponsesDto } from './dto/survey.dto';

export interface SurveyView {
  id: string;
  key: string;
  title: string;
  version: number;
  items: SurveyItemDefinition[];
}

export interface SurveyResponseView {
  id: string;
  surveyId: string;
  status: string;
  clientId: string;
  clientCreatedAt: Date;
  serverReceivedAt: Date;
  duplicate: boolean;
}

export interface SurveyResultView {
  id: string;
  surveyId: string;
  totalScore: number;
  scores: Record<string, number>;
  possibleConcern: boolean;
  createdAt: Date;
}

export interface SubmittedResponses extends SurveyResponseView {
  duplicate: boolean;
}

@Injectable()
export class SurveyService {
  constructor(private readonly surveys: SurveyRepository) {}

  async getSurvey(id: string): Promise<SurveyView> {
    const survey = await this.surveys.findById(id);
    if (!survey) {
      throw new ApiError('NOT_FOUND', 'Survey not found');
    }
    return this.toSurveyView(survey);
  }

  async submitResponses(
    user: AuthenticatedUser,
    surveyId: string,
    dto: SubmitSurveyResponsesDto,
  ): Promise<SubmittedResponses> {
    const survey = await this.requireSurvey(surveyId);
    const items = parseSurveyItems(survey.items);

    try {
      validateResponses(items, dto.responses);
    } catch (error) {
      if (error instanceof SurveyResponseError) {
        throw new ApiError('VALIDATION_FAILED', error.message);
      }
      throw error;
    }

    const existing = await this.surveys.findResponseByClientId(user.id, dto.clientId);
    if (existing) {
      this.assertSameSurvey(existing, surveyId);
      return this.toResponseView(existing, true);
    }

    try {
      const created = await this.surveys.createResponse({
        userId: user.id,
        surveyId,
        clientId: dto.clientId,
        responses: dto.responses,
        clientCreatedAt: new Date(dto.clientCreatedAt),
      });
      return this.toResponseView(created, false);
    } catch (error) {
      if (error instanceof DuplicateSurveyClientId) {
        // A concurrent request with the same clientId won. Return its row.
        const raced = await this.surveys.findResponseByClientId(user.id, dto.clientId);
        if (raced) {
          this.assertSameSurvey(raced, surveyId);
          return this.toResponseView(raced, true);
        }
      }
      throw error;
    }
  }

  async complete(
    user: AuthenticatedUser,
    surveyId: string,
    responseId: string,
  ): Promise<SurveyResultView> {
    const survey = await this.requireSurvey(surveyId);
    const response = await this.surveys.findResponseForUser(responseId, user.id, surveyId);
    if (!response) {
      throw new ApiError('NOT_FOUND', 'Survey response not found');
    }

    if (response.status === 'completed') {
      const existing = await this.surveys.findResultByResponseId(responseId);
      if (existing) return this.toResultView(existing);
    }

    const items = parseSurveyItems(survey.items);
    let outcome: ScoringOutcome;
    try {
      outcome = scoreSurvey(survey.key, items, response.responses);
    } catch (error) {
      if (error instanceof SurveyResponseError) {
        // Stored answers were validated on the way in, so this is corrupt data,
        // not a client mistake. Do not blame the client with a 400.
        throw new ApiError('INTERNAL_ERROR', 'Stored survey responses cannot be scored');
      }
      throw error;
    }

    const completion = await this.surveys.complete({
      responseId,
      userId: user.id,
      surveyId,
      scores: outcome.scores,
      totalScore: outcome.totalScore,
      phq9Item9: outcome.phq9Item9,
      now: new Date(),
    });
    if (!completion) {
      throw new ApiError('NOT_FOUND', 'Survey response not found');
    }
    return this.toResultView(completion.result);
  }

  async listResults(user: AuthenticatedUser): Promise<SurveyResultView[]> {
    const results = await this.surveys.listResults(user.id);
    return results.map((result) => this.toResultView(result));
  }

  /** Phase 3: a retake inside the 14-day cooldown is rejected with 409. */
  async retake(user: AuthenticatedUser, surveyKey: string): Promise<null> {
    const survey = await this.surveys.findByKey(surveyKey);
    if (!survey) {
      throw new ApiError('NOT_FOUND', 'Survey not found');
    }

    const latest = await this.surveys.findLatestResult(user.id, survey.id);
    if (!latest) return null;

    const now = new Date();
    if (!retakeAllowed(latest.createdAt, now)) {
      const availableAt = retakeAvailableAt(latest.createdAt);
      throw new ApiError(
        'CONFLICT',
        `A retake is available after ${availableAt?.toISOString() ?? ''} ` +
          `(${RETAKE_COOLDOWN_DAYS}-day cooldown)`,
      );
    }
    return null;
  }

  private async requireSurvey(id: string): Promise<Survey> {
    const survey = await this.surveys.findById(id);
    if (!survey) {
      throw new ApiError('NOT_FOUND', 'Survey not found');
    }
    return survey;
  }

  private assertSameSurvey(response: SurveyResponse, surveyId: string): void {
    if (response.surveyId !== surveyId) {
      throw new ApiError('CONFLICT', 'This clientId already belongs to another survey');
    }
  }

  private toSurveyView(survey: Survey): SurveyView {
    return {
      id: survey.id,
      key: survey.key,
      title: survey.title,
      version: survey.version,
      items: parseSurveyItems(survey.items),
    };
  }

  private toResponseView(response: SurveyResponse, duplicate: boolean): SurveyResponseView {
    return {
      id: response.id,
      surveyId: response.surveyId,
      status: response.status,
      clientId: response.clientId,
      clientCreatedAt: response.clientCreatedAt,
      serverReceivedAt: response.serverReceivedAt,
      duplicate,
    };
  }

  private toResultView(result: SurveyResult): SurveyResultView {
    return {
      id: result.id,
      surveyId: result.surveyId,
      totalScore: result.totalScore,
      scores: result.scores as Record<string, number>,
      possibleConcern: result.phq9Item9 !== null && result.phq9Item9 > 0,
      createdAt: result.createdAt,
    };
  }
}
