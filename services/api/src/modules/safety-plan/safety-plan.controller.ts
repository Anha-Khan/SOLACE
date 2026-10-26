import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  SafetyPlanFieldsDto,
  SafetyPlanSharingDto,
  SetSafetyPlanFieldDto,
} from './dto/safety-plan.dto';
import { SafetyPlanService } from './safety-plan.service';

@Controller('v1/safety-plan')
@Roles('patient')
export class SafetyPlanController {
  constructor(private readonly plans: SafetyPlanService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): ReturnType<SafetyPlanService['get']> {
    return this.plans.get(user);
  }

  @Put()
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SafetyPlanFieldsDto,
  ): ReturnType<SafetyPlanService['replace']> {
    return this.plans.replace(user, dto);
  }

  @Put('fields/:n')
  setField(
    @CurrentUser() user: AuthenticatedUser,
    @Param('n', new ParseIntPipe()) n: number,
    @Body() dto: SetSafetyPlanFieldDto,
  ): ReturnType<SafetyPlanService['setField']> {
    return this.plans.setField(user, n, dto.text);
  }

  @Put('sharing')
  setSharing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SafetyPlanSharingDto,
  ): ReturnType<SafetyPlanService['setSharing']> {
    return this.plans.setSharing(user, dto.sharedWithTherapist);
  }
}
