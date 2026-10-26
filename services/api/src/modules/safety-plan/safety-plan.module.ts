import { Module } from '@nestjs/common';
import { SafetyPlanController } from './safety-plan.controller';
import { SafetyPlanRepository } from './safety-plan.repository';
import { SafetyPlanService } from './safety-plan.service';

@Module({
  controllers: [SafetyPlanController],
  providers: [SafetyPlanRepository, SafetyPlanService],
  exports: [SafetyPlanService, SafetyPlanRepository],
})
export class SafetyPlanModule {}
