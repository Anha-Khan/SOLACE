import { IsISO8601, IsNotEmpty, IsObject, IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitSurveyResponsesDto {
  /** Retrying with the same clientId returns the original row (duplicate: true). */
  @IsUUID()
  clientId!: string;

  @IsISO8601()
  clientCreatedAt!: string;

  /** Item key -> integer answer. Range and completeness are checked server-side. */
  @IsObject()
  responses!: Record<string, number>;
}

export class CompleteSurveyDto {
  @IsUUID()
  responseId!: string;
}

export class RetakeSurveyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  surveyKey!: string;
}
