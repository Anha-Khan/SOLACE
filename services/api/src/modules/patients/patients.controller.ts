import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PatientsService } from './patients.service';

@Controller('v1/therapist/patients')
@Roles('therapist')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.patients.list(user.id);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return { id };
  }

  @Get(':id/summary')
  summary(@Param('id', new ParseUUIDPipe()) id: string) {
    return { id, disclaimer: 'Clinical judgment required' };
  }
}
