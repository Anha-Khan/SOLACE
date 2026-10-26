import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CompleteSurveyDto, RetakeSurveyDto, SubmitSurveyResponsesDto } from './dto/survey.dto';
import { SurveyService } from './survey.service';
import type { SubmittedResponses } from './survey.service';

/**
 * Static routes are declared before `:id`. Express matches in registration
 * order, so `/v1/surveys/results` must not be captured by `/v1/surveys/{id}`.
 */
@Controller('v1/surveys')
@Roles('patient')
export class SurveyController {
  constructor(private readonly surveys: SurveyService) {}

  @Get('results')
  listResults(@CurrentUser() user: AuthenticatedUser): ReturnType<SurveyService['listResults']> {
    return this.surveys.listResults(user);
  }

  @Post('retake')
  @HttpCode(HttpStatus.CREATED)
  retake(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RetakeSurveyDto,
  ): ReturnType<SurveyService['retake']> {
    return this.surveys.retake(user, dto.surveyKey);
  }

  @Get(':id')
  getSurvey(@Param('id', new ParseUUIDPipe()) id: string): ReturnType<SurveyService['getSurvey']> {
    return this.surveys.getSurvey(id);
  }

  @Post(':id/responses')
  async submitResponses(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitSurveyResponsesDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SubmittedResponses> {
    const result = await this.surveys.submitResponses(user, id, dto);
    // A retry with the same clientId returns the original row with HTTP 200.
    response.status(result.duplicate ? HttpStatus.OK : HttpStatus.CREATED);
    return result;
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteSurveyDto,
  ): ReturnType<SurveyService['complete']> {
    return this.surveys.complete(user, id, dto.responseId);
  }
}
