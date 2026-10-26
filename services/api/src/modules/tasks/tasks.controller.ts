import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TasksService } from './tasks.service';

class FeedbackDto {
  @IsOptional() @IsString() feedback?: string;
}

@Controller('v1')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('today')
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.tasks.today(user.id);
  }

  @Post('tasks/:id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tasks.complete(user.id, id);
  }

  @Post('today/swap')
  @HttpCode(HttpStatus.OK)
  swap(@CurrentUser() user: AuthenticatedUser) {
    return this.tasks.swap(user.id);
  }

  @Post('tasks/:id/feedback')
  @HttpCode(HttpStatus.OK)
  feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: FeedbackDto,
  ) {
    return this.tasks.feedback(user.id, id, dto.feedback ?? '');
  }

  @Get('tasks/:id/why')
  why(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tasks.why(id);
  }
}
