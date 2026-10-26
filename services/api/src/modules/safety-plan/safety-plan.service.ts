import { Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SafetyPlanRepository } from './safety-plan.repository';
import {
  SAFETY_PLAN_FIELD_NUMBERS,
  isSafetyPlanFieldNumber,
  normalizeFieldText,
} from './safety-plan';
import type { SafetyPlanFieldNumber, SafetyPlanView } from './safety-plan';
import type { SafetyPlanFieldsDto } from './dto/safety-plan.dto';

@Injectable()
export class SafetyPlanService {
  constructor(private readonly plans: SafetyPlanRepository) {}

  get(user: AuthenticatedUser): Promise<SafetyPlanView> {
    return this.plans.get(user.id);
  }

  replace(user: AuthenticatedUser, dto: SafetyPlanFieldsDto): Promise<SafetyPlanView> {
    const fields = {} as Record<SafetyPlanFieldNumber, string | null>;
    for (const field of SAFETY_PLAN_FIELD_NUMBERS) {
      fields[field] = normalizeFieldText(dto[`field${field}`]);
    }
    return this.plans.replace(user.id, fields);
  }

  setField(user: AuthenticatedUser, field: number, text: string): Promise<SafetyPlanView> {
    if (!isSafetyPlanFieldNumber(field)) {
      throw new ApiError(
        'VALIDATION_FAILED',
        `Safety plan field must be one of ${SAFETY_PLAN_FIELD_NUMBERS.join(', ')}`,
      );
    }
    return this.plans.setField(user.id, field, normalizeFieldText(text));
  }

  setSharing(user: AuthenticatedUser, sharedWithTherapist: boolean): Promise<SafetyPlanView> {
    return this.plans.setSharing(user.id, sharedWithTherapist);
  }
}
