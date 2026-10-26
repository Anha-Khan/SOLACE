import { Module } from '@nestjs/common';
import { SurveyController } from './survey.controller';
import { SurveyRepository } from './survey.repository';
import { SurveyService } from './survey.service';

@Module({
  controllers: [SurveyController],
  providers: [SurveyRepository, SurveyService],
  exports: [SurveyService],
})
export class SurveysModule {}
